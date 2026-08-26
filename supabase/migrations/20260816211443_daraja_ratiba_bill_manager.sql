-- Daraja Advanced: M-Pesa Ratiba (standing orders) + Bill Manager (e-invoicing)
-- PRD Addendum v1.0

-- ---------------------------------------------------------------------------
-- Enum extensions
-- ---------------------------------------------------------------------------
alter type public.payment_channel add value if not exists 'RATIBA';
alter type public.payment_channel add value if not exists 'BILL_MANAGER';

alter type public.payment_purpose add value if not exists 'BILL_INVOICE';

create type public.bill_invoice_status as enum (
  'DRAFT',
  'SENT',
  'PAID',
  'CANCELLED',
  'FAILED'
);

-- ---------------------------------------------------------------------------
-- Subscriptions: Ratiba standing-order fields (addendum §3.3)
-- ---------------------------------------------------------------------------
alter table public.subscriptions
  add column if not exists ratiba_standing_order_id varchar(100),
  add column if not exists auto_debit_enabled boolean not null default false,
  add column if not exists next_billing_date timestamptz,
  add column if not exists ratiba_custom_sto_id uuid,
  add column if not exists ratiba_retry_count integer not null default 0,
  add column if not exists ratiba_last_attempt_at timestamptz,
  add column if not exists ratiba_opt_in_phone text,
  add column if not exists ratiba_raw_response jsonb;

create index if not exists subscriptions_ratiba_next_billing_idx
  on public.subscriptions (next_billing_date)
  where auto_debit_enabled = true;

create index if not exists subscriptions_ratiba_sto_id_idx
  on public.subscriptions (ratiba_standing_order_id)
  where ratiba_standing_order_id is not null;

-- ---------------------------------------------------------------------------
-- Bill Manager invoices (vendor → customer e-invoices)
-- ---------------------------------------------------------------------------
create table public.bill_invoices (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  customer_id uuid references public.customers (id) on delete set null,
  sale_id uuid references public.sales (id) on delete set null,
  external_reference varchar(100) not null,
  invoice_name text not null,
  billed_full_name text not null,
  billed_phone text not null,
  billed_period text not null,
  account_reference text not null,
  amount numeric(12, 2) not null check (amount > 0),
  currency text not null default 'KES',
  due_date timestamptz not null,
  status public.bill_invoice_status not null default 'DRAFT',
  invoice_items jsonb,
  daraja_response jsonb,
  payment_transaction_id uuid references public.payment_transactions (id),
  mpesa_receipt text,
  paid_amount numeric(12, 2),
  paid_at timestamptz,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, external_reference)
);

create index bill_invoices_tenant_id_idx on public.bill_invoices (tenant_id);
create index bill_invoices_status_idx on public.bill_invoices (tenant_id, status);
create index bill_invoices_phone_idx on public.bill_invoices (billed_phone);
create index bill_invoices_external_ref_idx on public.bill_invoices (external_reference);

create trigger bill_invoices_updated_at
  before update on public.bill_invoices
  for each row execute function private.touch_updated_at();

alter table public.bill_invoices enable row level security;

create policy bill_invoices_tenant on public.bill_invoices
  for all to authenticated
  using (tenant_id = private.current_tenant_id() or private.is_super_admin())
  with check (tenant_id = private.current_tenant_id() or private.is_super_admin());

-- ---------------------------------------------------------------------------
-- Ratiba debit attempt ledger (retries / audit)
-- ---------------------------------------------------------------------------
create table public.ratiba_debit_attempts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  subscription_id uuid not null references public.subscriptions (id) on delete cascade,
  standing_order_id varchar(100),
  amount numeric(12, 2) not null default 3000,
  status public.payment_status not null default 'PENDING',
  attempt_number integer not null default 1,
  raw_callback jsonb,
  payment_transaction_id uuid references public.payment_transactions (id),
  created_at timestamptz not null default now()
);

create index ratiba_debit_attempts_tenant_idx on public.ratiba_debit_attempts (tenant_id);
create index ratiba_debit_attempts_sub_idx on public.ratiba_debit_attempts (subscription_id);

alter table public.ratiba_debit_attempts enable row level security;

create policy ratiba_debit_attempts_select on public.ratiba_debit_attempts
  for select to authenticated
  using (tenant_id = private.current_tenant_id() or private.is_super_admin());

-- ---------------------------------------------------------------------------
-- Helpers: soft write-lock when Ratiba retries exhausted
-- ---------------------------------------------------------------------------
create or replace function public.tenant_is_write_locked(p_tenant_id uuid default null)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.tenants t
    where t.id = coalesce(p_tenant_id, private.current_tenant_id())
      and t.status in ('PAST_DUE', 'SUSPENDED', 'CANCELLED')
  );
$$;

revoke execute on function public.tenant_is_write_locked(uuid) from public, anon;
grant execute on function public.tenant_is_write_locked(uuid) to authenticated;

comment on column public.subscriptions.ratiba_standing_order_id is
  'Safaricom Ratiba standing order ID after successful opt-in';
comment on column public.subscriptions.auto_debit_enabled is
  'True when monthly KES 3000 Ratiba standing order is active';
comment on table public.bill_invoices is
  'M-Pesa Bill Manager e-invoices pushed to customer M-Pesa menu';
