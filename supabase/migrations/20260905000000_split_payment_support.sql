-- Add split payment support
-- Allows recording multiple payment methods for a single sale

create table if not exists public.sale_payments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  sale_id uuid not null references public.sales (id) on delete cascade,
  payment_channel public.payment_channel not null,
  amount numeric(12, 2) not null check (amount > 0),
  status public.payment_status not null default 'PENDING',
  receipt_code text,
  payer_name text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (sale_id, payment_channel)
);

create index sale_payments_tenant_id_idx on public.sale_payments (tenant_id);
create index sale_payments_sale_id_idx on public.sale_payments (sale_id);
create index sale_payments_status_idx on public.sale_payments (status);

-- Add split payment flag to sales table
alter table public.sales add column if not exists has_split_payment boolean not null default false;

-- Enable RLS on sale_payments
alter table public.sale_payments enable row level security;

-- RLS policy: tenant isolation
create policy sale_payments_tenant on public.sale_payments
  for all to authenticated
  using (tenant_id = private.current_tenant_id() or private.is_super_admin())
  with check (tenant_id = private.current_tenant_id() or private.is_super_admin());

-- Create trigger to update updated_at on sale_payments
create trigger sale_payments_updated_at
  before update on public.sale_payments
  for each row execute function private.touch_updated_at();

comment on table public.sale_payments is
  'Tracks individual payment methods for sales; enables split payment reconciliation';
