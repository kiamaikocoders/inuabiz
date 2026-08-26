-- PayHero subscription ledger + vendor POS M-Pesa confirmation fields.

alter type public.payment_channel add value if not exists 'MPESA';
alter type public.payment_channel add value if not exists 'PAYHERO';

alter table public.sales
  add column if not exists mpesa_receipt_code varchar(32),
  add column if not exists payment_bill_ref varchar(32);

create index if not exists sales_pending_payment_tenant_idx
  on public.sales (tenant_id, total, created_at desc)
  where status = 'PENDING_PAYMENT';

create table if not exists public.subscription_payments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  payhero_reference varchar(128) not null unique,
  mpesa_receipt_code varchar(64),
  amount numeric(12, 2) not null check (amount >= 0),
  status varchar(32) not null check (status in ('QUEUED', 'PENDING', 'SUCCESS', 'FAILED')),
  payment_transaction_id uuid references public.payment_transactions (id) on delete set null,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists subscription_payments_tenant_id_idx
  on public.subscription_payments (tenant_id, created_at desc);

alter table public.subscription_payments enable row level security;

drop policy if exists subscription_payments_tenant on public.subscription_payments;
create policy subscription_payments_tenant on public.subscription_payments
  for select
  to authenticated
  using (
    tenant_id in (
      select p.tenant_id from public.profiles p where p.id = auth.uid()
    )
  );

grant select on public.subscription_payments to authenticated;
grant all on public.subscription_payments to service_role;

comment on table public.subscription_payments is
  'PayHero SaaS subscription payment ledger (vendor → InuaBiz).';
