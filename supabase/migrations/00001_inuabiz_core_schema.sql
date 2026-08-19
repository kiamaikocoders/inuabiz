-- InuaBiz core schema v1
-- Multi-tenant POS + billing + notifications (PRD / IntaSend / Notification specs)
-- Apply via: supabase migration new … then replace, or run in SQL editor for bootstrap.

create extension if not exists "pgcrypto";
-- Optional for GIS map: create extension if not exists postgis;

create schema if not exists private;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.user_role as enum (
  'SUPER_ADMIN',
  'VENDOR_ADMIN',
  'VENDOR_STAFF'
);

create type public.tenant_status as enum (
  'TRIAL',
  'ACTIVE',
  'PAST_DUE',
  'SUSPENDED',
  'CANCELLED'
);

create type public.business_category as enum (
  'DUKA',
  'BOUTIQUE',
  'CHEMIST',
  'HARDWARE',
  'EATERY',
  'OTHER'
);

create type public.payment_destination_type as enum (
  'PERSONAL_MPESA',
  'TILL',
  'PAYBILL',
  'POCHI'
);

create type public.sale_status as enum (
  'DRAFT',
  'PENDING_PAYMENT',
  'PAID',
  'CREDIT',
  'CANCELLED',
  'REFUNDED'
);

create type public.payment_channel as enum (
  'MPESA_STK',
  'CARD',
  'PAYBILL',
  'CASH',
  'CREDIT'
);

create type public.payment_status as enum (
  'PENDING',
  'COMPLETE',
  'FAILED',
  'CANCELLED'
);

create type public.payment_purpose as enum (
  'SAAS_SUBSCRIPTION',
  'VENDOR_SALE',
  'OTHER'
);

create type public.credit_entry_type as enum (
  'CHARGE',
  'REPAYMENT',
  'ADJUSTMENT'
);

create type public.notification_type as enum (
  'SALE',
  'STOCK_LOW',
  'SUBSCRIPTION',
  'SYSTEM',
  'CREDIT',
  'PAYMENT'
);

create type public.notification_priority as enum (
  'LOW',
  'NORMAL',
  'HIGH',
  'CRITICAL'
);

create type public.recipient_role as enum (
  'SUPER_ADMIN',
  'VENDOR_ADMIN',
  'CUSTOMER'
);

-- ---------------------------------------------------------------------------
-- Tenants & profiles
-- ---------------------------------------------------------------------------
create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category public.business_category not null default 'DUKA',
  phone text not null,
  status public.tenant_status not null default 'TRIAL',
  trial_ends_at timestamptz not null default (now() + interval '14 days'),
  access_until timestamptz not null default (now() + interval '14 days'),
  location_lat numeric(10, 7),
  location_lng numeric(10, 7),
  address_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tenants_phone_format check (phone ~ '^254[17][0-9]{8}$')
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  tenant_id uuid references public.tenants (id) on delete set null,
  role public.user_role not null default 'VENDOR_ADMIN',
  full_name text,
  phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_super_admin_no_tenant check (
    (role = 'SUPER_ADMIN' and tenant_id is null)
    or (role <> 'SUPER_ADMIN' and tenant_id is not null)
  )
);

create index profiles_tenant_id_idx on public.profiles (tenant_id);

create table public.tenant_payment_destinations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  destination_type public.payment_destination_type not null,
  account_number text not null,
  account_name text,
  is_primary boolean not null default true,
  created_at timestamptz not null default now(),
  unique (tenant_id, destination_type, account_number)
);

create index tenant_payment_destinations_tenant_id_idx
  on public.tenant_payment_destinations (tenant_id);

-- ---------------------------------------------------------------------------
-- Catalog, customers, credit
-- ---------------------------------------------------------------------------
create table public.products (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  name text not null,
  sku text,
  barcode text,
  cost_price numeric(12, 2) not null default 0 check (cost_price >= 0),
  selling_price numeric(12, 2) not null check (selling_price >= 0),
  stock_qty numeric(12, 3) not null default 0,
  low_stock_threshold numeric(12, 3) not null default 5,
  is_active boolean not null default true,
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index products_tenant_id_idx on public.products (tenant_id);
create index products_tenant_barcode_idx on public.products (tenant_id, barcode)
  where barcode is not null;
create index products_tenant_name_idx on public.products (tenant_id, name);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  phone text,
  name text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, phone)
);

create index customers_tenant_id_idx on public.customers (tenant_id);

create table public.credit_entries (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete cascade,
  sale_id uuid, -- FK added after sales
  entry_type public.credit_entry_type not null,
  amount numeric(12, 2) not null check (amount > 0),
  note text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create index credit_entries_tenant_id_idx on public.credit_entries (tenant_id);
create index credit_entries_customer_id_idx on public.credit_entries (customer_id);

-- ---------------------------------------------------------------------------
-- Sales
-- ---------------------------------------------------------------------------
create table public.sales (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  customer_id uuid references public.customers (id) on delete set null,
  status public.sale_status not null default 'DRAFT',
  subtotal numeric(12, 2) not null default 0,
  discount_amount numeric(12, 2) not null default 0 check (discount_amount >= 0),
  total numeric(12, 2) not null default 0,
  payment_channel public.payment_channel,
  customer_phone text,
  notes text,
  created_by uuid references public.profiles (id),
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index sales_tenant_id_idx on public.sales (tenant_id);
create index sales_tenant_created_at_idx on public.sales (tenant_id, created_at desc);
create index sales_customer_id_idx on public.sales (customer_id);

alter table public.credit_entries
  add constraint credit_entries_sale_id_fkey
  foreign key (sale_id) references public.sales (id) on delete set null;

create table public.sale_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  sale_id uuid not null references public.sales (id) on delete cascade,
  product_id uuid not null references public.products (id),
  product_name text not null,
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  cost_price numeric(12, 2) not null default 0,
  qty numeric(12, 3) not null check (qty > 0),
  line_total numeric(12, 2) not null check (line_total >= 0)
);

create index sale_items_sale_id_idx on public.sale_items (sale_id);
create index sale_items_tenant_id_idx on public.sale_items (tenant_id);
create index sale_items_product_id_idx on public.sale_items (product_id);

-- ---------------------------------------------------------------------------
-- IntaSend payments & subscriptions
-- ---------------------------------------------------------------------------
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  plan_code text not null default 'FLAT_3000',
  amount numeric(12, 2) not null default 3000.00,
  currency text not null default 'KES',
  status public.tenant_status not null default 'TRIAL',
  current_period_start timestamptz,
  current_period_end timestamptz,
  last_invoice_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id)
);

create index subscriptions_tenant_id_idx on public.subscriptions (tenant_id);

create table public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants (id) on delete set null,
  sale_id uuid references public.sales (id) on delete set null,
  purpose public.payment_purpose not null,
  invoice_id varchar(100) not null,
  tracking_id text,
  amount numeric(12, 2) not null check (amount >= 0),
  currency text not null default 'KES',
  payment_channel public.payment_channel not null default 'MPESA_STK',
  status public.payment_status not null default 'PENDING',
  account text,
  api_ref text,
  raw_webhook_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (invoice_id)
);

create index payment_transactions_tenant_id_idx
  on public.payment_transactions (tenant_id);
create index payment_transactions_sale_id_idx
  on public.payment_transactions (sale_id);
create index payment_transactions_status_idx
  on public.payment_transactions (status)
  where status = 'PENDING';
create index payment_transactions_api_ref_idx
  on public.payment_transactions (api_ref);

create table public.unclaimed_payments (
  id uuid primary key default gen_random_uuid(),
  payment_transaction_id uuid references public.payment_transactions (id),
  invoice_id varchar(100) not null,
  amount numeric(12, 2) not null,
  raw_webhook_payload jsonb not null,
  resolved_tenant_id uuid references public.tenants (id),
  resolved_by uuid references public.profiles (id),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create index unclaimed_payments_unresolved_idx
  on public.unclaimed_payments (created_at)
  where resolved_at is null;

-- ---------------------------------------------------------------------------
-- Notifications
-- ---------------------------------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants (id) on delete cascade,
  recipient_role public.recipient_role not null,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  title varchar(150) not null,
  message text not null,
  type public.notification_type not null,
  priority public.notification_priority not null default 'NORMAL',
  is_read boolean not null default false,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index notifications_recipient_unread_idx
  on public.notifications (recipient_id, created_at desc)
  where is_read = false;
create index notifications_tenant_id_idx on public.notifications (tenant_id);

create table public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  channel_in_app boolean not null default true,
  channel_email boolean not null default true,
  channel_sms boolean not null default true,
  channel_whatsapp boolean not null default true,
  channel_sound boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id)
);

create table public.platform_broadcasts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  is_active boolean not null default true,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create table public.ai_insights (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  insight_type text not null,
  period_start date not null,
  period_end date not null,
  payload jsonb not null,
  model text,
  created_at timestamptz not null default now(),
  unique (tenant_id, insight_type, period_start, period_end)
);

create index ai_insights_tenant_id_idx on public.ai_insights (tenant_id);

create table public.admin_impersonation_audit (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.profiles (id),
  target_tenant_id uuid not null references public.tenants (id),
  target_profile_id uuid references public.profiles (id),
  reason text,
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

create index admin_impersonation_audit_admin_id_idx
  on public.admin_impersonation_audit (admin_id);

-- ---------------------------------------------------------------------------
-- Auth helpers (after profiles exists)
-- ---------------------------------------------------------------------------
create or replace function private.current_tenant_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.tenant_id from public.profiles p where p.id = auth.uid();
$$;

create or replace function private.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'SUPER_ADMIN'
      and p.is_active
  );
$$;

create or replace function private.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger tenants_updated_at
  before update on public.tenants
  for each row execute function private.touch_updated_at();

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function private.touch_updated_at();

create trigger products_updated_at
  before update on public.products
  for each row execute function private.touch_updated_at();

create trigger sales_updated_at
  before update on public.sales
  for each row execute function private.touch_updated_at();

create trigger payment_transactions_updated_at
  before update on public.payment_transactions
  for each row execute function private.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Stock decrement on paid sale (simplified; Edge Function may also own this)
-- ---------------------------------------------------------------------------
create or replace function private.decrement_stock_on_paid_sale()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'PAID' and (old.status is distinct from 'PAID') then
    update public.products p
    set stock_qty = p.stock_qty - si.qty,
        updated_at = now()
    from public.sale_items si
    where si.sale_id = new.id
      and si.product_id = p.id
      and p.tenant_id = new.tenant_id;
  end if;
  return new;
end;
$$;

create trigger sales_decrement_stock
  after update of status on public.sales
  for each row execute function private.decrement_stock_on_paid_sale();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.tenants enable row level security;
alter table public.profiles enable row level security;
alter table public.tenant_payment_destinations enable row level security;
alter table public.products enable row level security;
alter table public.customers enable row level security;
alter table public.credit_entries enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payment_transactions enable row level security;
alter table public.unclaimed_payments enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.platform_broadcasts enable row level security;
alter table public.ai_insights enable row level security;
alter table public.admin_impersonation_audit enable row level security;

-- Profiles: user reads/updates self; super admin reads all
create policy profiles_select_self_or_admin on public.profiles
  for select to authenticated
  using (id = auth.uid() or private.is_super_admin());

create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Tenants: members of tenant or super admin
create policy tenants_select on public.tenants
  for select to authenticated
  using (id = private.current_tenant_id() or private.is_super_admin());

create policy tenants_update_vendor on public.tenants
  for update to authenticated
  using (id = private.current_tenant_id())
  with check (id = private.current_tenant_id());

create policy tenants_select_admin_all on public.tenants
  for all to authenticated
  using (private.is_super_admin())
  with check (private.is_super_admin());

-- Generic tenant isolation for vendor tables
create policy payment_destinations_tenant on public.tenant_payment_destinations
  for all to authenticated
  using (tenant_id = private.current_tenant_id() or private.is_super_admin())
  with check (tenant_id = private.current_tenant_id() or private.is_super_admin());

create policy products_tenant on public.products
  for all to authenticated
  using (tenant_id = private.current_tenant_id() or private.is_super_admin())
  with check (tenant_id = private.current_tenant_id() or private.is_super_admin());

create policy customers_tenant on public.customers
  for all to authenticated
  using (tenant_id = private.current_tenant_id() or private.is_super_admin())
  with check (tenant_id = private.current_tenant_id() or private.is_super_admin());

create policy credit_entries_tenant on public.credit_entries
  for all to authenticated
  using (tenant_id = private.current_tenant_id() or private.is_super_admin())
  with check (tenant_id = private.current_tenant_id() or private.is_super_admin());

create policy sales_tenant on public.sales
  for all to authenticated
  using (tenant_id = private.current_tenant_id() or private.is_super_admin())
  with check (tenant_id = private.current_tenant_id() or private.is_super_admin());

create policy sale_items_tenant on public.sale_items
  for all to authenticated
  using (tenant_id = private.current_tenant_id() or private.is_super_admin())
  with check (tenant_id = private.current_tenant_id() or private.is_super_admin());

create policy subscriptions_tenant on public.subscriptions
  for select to authenticated
  using (tenant_id = private.current_tenant_id() or private.is_super_admin());

create policy payment_transactions_tenant on public.payment_transactions
  for select to authenticated
  using (tenant_id = private.current_tenant_id() or private.is_super_admin());

create policy unclaimed_payments_admin on public.unclaimed_payments
  for all to authenticated
  using (private.is_super_admin())
  with check (private.is_super_admin());

create policy notifications_recipient on public.notifications
  for select to authenticated
  using (
    recipient_id = auth.uid()
    or private.is_super_admin()
  );

create policy notifications_update_read on public.notifications
  for update to authenticated
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

create policy notification_prefs_self on public.notification_preferences
  for all to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

create policy platform_broadcasts_read on public.platform_broadcasts
  for select to authenticated
  using (is_active = true);

create policy platform_broadcasts_admin on public.platform_broadcasts
  for all to authenticated
  using (private.is_super_admin())
  with check (private.is_super_admin());

create policy ai_insights_tenant on public.ai_insights
  for select to authenticated
  using (tenant_id = private.current_tenant_id() or private.is_super_admin());

create policy impersonation_audit_admin on public.admin_impersonation_audit
  for all to authenticated
  using (private.is_super_admin())
  with check (private.is_super_admin());

-- Realtime: enable for notifications (configure in Dashboard / publication)
-- alter publication supabase_realtime add table public.notifications;

comment on table public.payment_transactions is
  'IntaSend webhook ledger; invoice_id unique for idempotency';
comment on table public.unclaimed_payments is
  'COMPLETE webhooks that failed tenant matching; admin assigns manually';
