-- Category-driven POS fields and restaurant / service tickets.

alter table public.products
  add column if not exists attrs jsonb not null default '{}'::jsonb;

alter table public.sale_items
  add column if not exists attrs jsonb not null default '{}'::jsonb;

comment on column public.products.attrs is
  'Category-specific product fields (serial, IMEI, batch, expiry, duration, unit, variants).';
comment on column public.sale_items.attrs is
  'Per-line capture at checkout (serial, IMEI, duration) for the shop category.';

create table if not exists public.shop_floor_tables (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  shop_id uuid not null references public.shops (id) on delete cascade,
  label text not null,
  seats integer not null default 4,
  status text not null default 'FREE'
    check (status in ('FREE', 'SEATED', 'BILLING')),
  created_at timestamptz not null default now(),
  unique (shop_id, label)
);

create index if not exists shop_floor_tables_shop_id_idx
  on public.shop_floor_tables (shop_id);

create table if not exists public.shop_tickets (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  shop_id uuid not null references public.shops (id) on delete cascade,
  sale_id uuid references public.sales (id) on delete set null,
  table_id uuid references public.shop_floor_tables (id) on delete set null,
  kind text not null default 'KITCHEN'
    check (kind in ('KITCHEN', 'SERVICE')),
  status text not null default 'NEW'
    check (status in ('NEW', 'PREP', 'READY', 'SERVED', 'DONE')),
  title text not null,
  items jsonb not null default '[]'::jsonb,
  duration_minutes integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists shop_tickets_shop_id_idx on public.shop_tickets (shop_id);
create index if not exists shop_tickets_shop_status_idx on public.shop_tickets (shop_id, status);

drop trigger if exists shop_tickets_updated_at on public.shop_tickets;
create trigger shop_tickets_updated_at
  before update on public.shop_tickets
  for each row execute function private.touch_updated_at();

alter table public.shop_floor_tables enable row level security;
alter table public.shop_tickets enable row level security;

drop policy if exists shop_floor_tables_tenant on public.shop_floor_tables;
create policy shop_floor_tables_tenant on public.shop_floor_tables
  for all to authenticated
  using (tenant_id = private.current_tenant_id() or private.is_super_admin())
  with check (tenant_id = private.current_tenant_id() or private.is_super_admin());

drop policy if exists shop_tickets_tenant on public.shop_tickets;
create policy shop_tickets_tenant on public.shop_tickets
  for all to authenticated
  using (tenant_id = private.current_tenant_id() or private.is_super_admin())
  with check (tenant_id = private.current_tenant_id() or private.is_super_admin());

grant select, insert, update, delete on public.shop_floor_tables to authenticated;
grant select, insert, update, delete on public.shop_tickets to authenticated;
grant all on public.shop_floor_tables to service_role;
grant all on public.shop_tickets to service_role;
