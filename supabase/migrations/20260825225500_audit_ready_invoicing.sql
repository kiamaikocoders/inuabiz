-- Phase 1 audit-ready invoicing (eTIMS stub columns only — no OSCU/VSCU).

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'tax_class') then
    create type public.tax_class as enum ('STANDARD_16', 'ZERO_RATED', 'EXEMPT');
  end if;
  if not exists (select 1 from pg_type where typname = 'etims_status') then
    create type public.etims_status as enum (
      'PENDING_UPGRADE',
      'SUBMITTED',
      'FAILED'
    );
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Merchant header + product tax + buyer PIN
-- ---------------------------------------------------------------------------
alter table public.tenants
  add column if not exists legal_name text,
  add column if not exists kra_pin varchar(11),
  add column if not exists email text,
  add column if not exists vat_registered boolean not null default false;

alter table public.tenants
  drop constraint if exists tenants_kra_pin_format;
alter table public.tenants
  add constraint tenants_kra_pin_format
  check (kra_pin is null or kra_pin ~ '^[A-Z][0-9]{9}[A-Z]$');

update public.tenants
set legal_name = coalesce(nullif(legal_name, ''), name)
where legal_name is null;

alter table public.products
  add column if not exists tax_class public.tax_class not null default 'STANDARD_16',
  add column if not exists classification_code text;

alter table public.customers
  add column if not exists kra_pin varchar(11);

alter table public.sale_items
  add column if not exists tax_class public.tax_class not null default 'STANDARD_16',
  add column if not exists classification_code text;

-- Chemist catalogs default to zero-rated unless the product already has a class.
update public.products p
set tax_class = 'ZERO_RATED'
from public.tenants t
where p.tenant_id = t.id
  and t.category = 'CHEMIST'
  and p.tax_class = 'STANDARD_16'
  and p.is_sample = false;

-- ---------------------------------------------------------------------------
-- Per-tenant yearly invoice counters
-- ---------------------------------------------------------------------------
create table if not exists public.invoice_sequences (
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  year integer not null,
  last_n integer not null default 0,
  primary key (tenant_id, year)
);

alter table public.invoice_sequences enable row level security;

drop policy if exists invoice_sequences_tenant on public.invoice_sequences;
create policy invoice_sequences_tenant on public.invoice_sequences
  for select to authenticated
  using (tenant_id = private.current_tenant_id() or private.is_super_admin());

grant select on public.invoice_sequences to authenticated;
grant all on public.invoice_sequences to service_role;

-- ---------------------------------------------------------------------------
-- Fiscal invoices (distinct from bill_invoices / Bill Manager)
-- ---------------------------------------------------------------------------
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  sale_id uuid not null references public.sales (id) on delete cascade,
  shop_id uuid,
  invoice_number varchar(64) not null,
  customer_name varchar(255) not null default 'Walk-in Customer',
  customer_kra_pin varchar(11),
  subtotal numeric(12, 2) not null,
  vat_16_amount numeric(12, 2) not null default 0,
  vat_0_amount numeric(12, 2) not null default 0,
  exempt_amount numeric(12, 2) not null default 0,
  total_amount numeric(12, 2) not null,
  payment_method varchar(32) not null,
  mpesa_receipt_code varchar(32),
  cashier_id uuid references public.profiles (id),
  etims_status public.etims_status not null default 'PENDING_UPGRADE',
  kra_control_number varchar(128),
  kra_qr_code_url text,
  created_at timestamptz not null default now(),
  unique (sale_id),
  unique (tenant_id, invoice_number)
);

create index if not exists invoices_tenant_created_idx
  on public.invoices (tenant_id, created_at desc);

create table if not exists public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  sale_item_id uuid references public.sale_items (id) on delete set null,
  item_description text not null,
  classification_code text,
  qty numeric(12, 3) not null,
  unit_price numeric(12, 2) not null,
  line_total numeric(12, 2) not null,
  tax_class public.tax_class not null,
  vat_amount numeric(12, 2) not null default 0
);

create index if not exists invoice_items_invoice_id_idx
  on public.invoice_items (invoice_id);

alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;

drop policy if exists invoices_tenant on public.invoices;
create policy invoices_tenant on public.invoices
  for all to authenticated
  using (tenant_id = private.current_tenant_id() or private.is_super_admin())
  with check (tenant_id = private.current_tenant_id() or private.is_super_admin());

drop policy if exists invoice_items_tenant on public.invoice_items;
create policy invoice_items_tenant on public.invoice_items
  for all to authenticated
  using (tenant_id = private.current_tenant_id() or private.is_super_admin())
  with check (tenant_id = private.current_tenant_id() or private.is_super_admin());

grant select, insert, update on public.invoices to authenticated;
grant select, insert on public.invoice_items to authenticated;
grant all on public.invoices to service_role;
grant all on public.invoice_items to service_role;

comment on table public.invoices is
  'Phase 1 audit-ready tax invoices. etims_* columns are stubs until KRA OSCU/VSCU.';
comment on column public.invoices.etims_status is
  'PENDING_UPGRADE until Phase 2 KRA transmission is enabled.';

-- ---------------------------------------------------------------------------
-- Inclusive Kenyan VAT split + sequential INB-YYYY-NNNN per tenant
-- ---------------------------------------------------------------------------
create or replace function private.issue_sale_invoice(p_sale_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sale public.sales%rowtype;
  v_customer_name text := 'Walk-in Customer';
  v_customer_pin varchar(11);
  v_year integer := extract(year from timezone('Africa/Nairobi', now()))::integer;
  v_n integer;
  v_number varchar(64);
  v_invoice_id uuid;
  v_mpesa text;
  v_line record;
  v_ratio numeric;
  v_net numeric;
  v_vat numeric;
  v_subtotal numeric := 0;
  v_vat16 numeric := 0;
  v_vat0 numeric := 0;
  v_exempt numeric := 0;
begin
  select * into v_sale from public.sales where id = p_sale_id;
  if not found then
    raise exception 'Sale not found';
  end if;

  if v_sale.status not in ('PAID', 'CREDIT') then
    return null;
  end if;

  select id into v_invoice_id from public.invoices where sale_id = p_sale_id;
  if v_invoice_id is not null then
    return v_invoice_id;
  end if;

  if not exists (select 1 from public.sale_items where sale_id = p_sale_id) then
    raise exception 'Sale has no line items';
  end if;

  if v_sale.customer_id is not null then
    select coalesce(nullif(trim(name), ''), 'Walk-in Customer'), kra_pin
      into v_customer_name, v_customer_pin
    from public.customers
    where id = v_sale.customer_id;
  end if;

  select api_ref into v_mpesa
  from public.payment_transactions
  where sale_id = p_sale_id
    and status = 'COMPLETE'
  order by created_at desc
  limit 1;

  insert into public.invoice_sequences (tenant_id, year, last_n)
  values (v_sale.tenant_id, v_year, 1)
  on conflict (tenant_id, year)
  do update set last_n = public.invoice_sequences.last_n + 1
  returning last_n into v_n;

  v_number := 'INB-' || v_year::text || '-' || lpad(v_n::text, 4, '0');

  insert into public.invoices (
    tenant_id, sale_id, invoice_number, customer_name, customer_kra_pin,
    subtotal, vat_16_amount, vat_0_amount, exempt_amount, total_amount,
    payment_method, mpesa_receipt_code, cashier_id
  ) values (
    v_sale.tenant_id, p_sale_id, v_number, v_customer_name, v_customer_pin,
    0, 0, 0, 0, v_sale.total,
    coalesce(v_sale.payment_channel::text, 'CASH'),
    v_mpesa,
    v_sale.created_by
  )
  returning id into v_invoice_id;

  v_ratio := case
    when v_sale.subtotal > 0 then greatest(0, 1 - (v_sale.discount_amount / v_sale.subtotal))
    else 1
  end;

  for v_line in
    select
      si.id,
      si.product_name,
      si.classification_code,
      si.qty,
      si.unit_price,
      si.line_total,
      si.tax_class,
      si.tenant_id
    from public.sale_items si
    where si.sale_id = p_sale_id
    order by si.id
  loop
    v_net := round(v_line.line_total * v_ratio, 2);
    v_vat := 0;
    if v_line.tax_class = 'STANDARD_16' then
      v_vat := round(v_net * 16 / 116, 2);
      v_vat16 := v_vat16 + v_vat;
      v_subtotal := v_subtotal + (v_net - v_vat);
    elsif v_line.tax_class = 'ZERO_RATED' then
      v_vat0 := v_vat0 + v_net;
      v_subtotal := v_subtotal + v_net;
    else
      v_exempt := v_exempt + v_net;
      v_subtotal := v_subtotal + v_net;
    end if;

    insert into public.invoice_items (
      tenant_id, invoice_id, sale_item_id, item_description, classification_code,
      qty, unit_price, line_total, tax_class, vat_amount
    ) values (
      v_line.tenant_id, v_invoice_id, v_line.id, v_line.product_name,
      v_line.classification_code, v_line.qty, v_line.unit_price, v_net,
      v_line.tax_class, v_vat
    );
  end loop;

  update public.invoices
  set
    subtotal = v_subtotal,
    vat_16_amount = v_vat16,
    vat_0_amount = v_vat0,
    exempt_amount = v_exempt,
    total_amount = v_sale.total
  where id = v_invoice_id;

  return v_invoice_id;
end;
$$;

revoke all on function private.issue_sale_invoice(uuid) from public, anon, authenticated;
grant execute on function private.issue_sale_invoice(uuid) to service_role;

create or replace function public.issue_sale_invoice(p_sale_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant uuid;
begin
  select tenant_id into v_tenant from public.sales where id = p_sale_id;
  if v_tenant is null then
    raise exception 'Sale not found';
  end if;
  if auth.uid() is not null
     and not private.is_super_admin()
     and v_tenant is distinct from private.current_tenant_id() then
    raise exception 'Not allowed';
  end if;
  return private.issue_sale_invoice(p_sale_id);
end;
$$;

revoke all on function public.issue_sale_invoice(uuid) from public, anon;
grant execute on function public.issue_sale_invoice(uuid) to authenticated, service_role;

create or replace function private.issue_invoice_on_sale_paid()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status in ('PAID', 'CREDIT')
     and (old.status is distinct from new.status)
     and exists (select 1 from public.sale_items where sale_id = new.id)
  then
    perform private.issue_sale_invoice(new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists sales_issue_invoice_on_paid on public.sales;
create trigger sales_issue_invoice_on_paid
  after update of status on public.sales
  for each row execute function private.issue_invoice_on_sale_paid();
