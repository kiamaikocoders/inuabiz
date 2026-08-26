-- Multi-shop under existing tenants (organization = tenant).
-- First shop is included in the KES 3,000 base; extra shops add platform_settings.billing.shop_addon_kes.

-- ---------------------------------------------------------------------------
-- Shops
-- ---------------------------------------------------------------------------
create table if not exists public.shops (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  name text not null,
  category public.business_category not null default 'DUKA',
  phone text,
  address_text text,
  location_lat numeric(10, 7),
  location_lng numeric(10, 7),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists shops_one_default_per_tenant
  on public.shops (tenant_id)
  where is_default;

create index if not exists shops_tenant_id_idx on public.shops (tenant_id);

create trigger shops_updated_at
  before update on public.shops
  for each row execute function private.touch_updated_at();

alter table public.shops enable row level security;

drop policy if exists shops_tenant on public.shops;
create policy shops_tenant on public.shops
  for all to authenticated
  using (tenant_id = private.current_tenant_id() or private.is_super_admin())
  with check (tenant_id = private.current_tenant_id() or private.is_super_admin());

grant select, insert, update, delete on public.shops to authenticated;
grant all on public.shops to service_role;

-- Backfill one default shop per tenant
insert into public.shops (
  tenant_id, name, category, phone, address_text, location_lat, location_lng, is_default
)
select
  t.id,
  t.name,
  t.category,
  t.phone,
  t.address_text,
  t.location_lat,
  t.location_lng,
  true
from public.tenants t
where not exists (select 1 from public.shops s where s.tenant_id = t.id);

alter table public.profiles
  add column if not exists active_shop_id uuid references public.shops (id) on delete set null;

update public.profiles p
set active_shop_id = s.id
from public.shops s
where p.tenant_id = s.tenant_id
  and s.is_default
  and p.active_shop_id is null
  and p.role <> 'SUPER_ADMIN';

-- ---------------------------------------------------------------------------
-- Stamp shop_id on operational tables
-- ---------------------------------------------------------------------------
alter table public.products add column if not exists shop_id uuid references public.shops (id);
alter table public.sales add column if not exists shop_id uuid references public.shops (id);
alter table public.invoices add column if not exists shop_id uuid references public.shops (id);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'invoices_shop_id_fkey') then
    alter table public.invoices
      add constraint invoices_shop_id_fkey
      foreign key (shop_id) references public.shops (id);
  end if;
end $$;

update public.products p
set shop_id = s.id
from public.shops s
where p.tenant_id = s.tenant_id and s.is_default and p.shop_id is null;

update public.sales sa
set shop_id = s.id
from public.shops s
where sa.tenant_id = s.tenant_id and s.is_default and sa.shop_id is null;

update public.invoices i
set shop_id = s.id
from public.shops s
where i.tenant_id = s.tenant_id and s.is_default and i.shop_id is null;

create index if not exists products_shop_id_idx on public.products (shop_id);
create index if not exists sales_shop_id_idx on public.sales (shop_id);
create index if not exists invoices_shop_id_idx on public.invoices (shop_id);

create or replace function private.current_shop_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.active_shop_id from public.profiles p where p.id = auth.uid();
$$;

-- ---------------------------------------------------------------------------
-- Shop invites (staff join via phone OTP)
-- ---------------------------------------------------------------------------
create table if not exists public.shop_invites (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  shop_id uuid not null references public.shops (id) on delete cascade,
  phone text not null,
  full_name text,
  role public.user_role not null default 'VENDOR_STAFF',
  invited_by uuid references public.profiles (id),
  claimed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists shop_invites_phone_idx on public.shop_invites (phone)
  where claimed_at is null;

alter table public.shop_invites enable row level security;

drop policy if exists shop_invites_tenant on public.shop_invites;
create policy shop_invites_tenant on public.shop_invites
  for all to authenticated
  using (tenant_id = private.current_tenant_id() or private.is_super_admin())
  with check (tenant_id = private.current_tenant_id() or private.is_super_admin());

grant select, insert, update on public.shop_invites to authenticated;
grant all on public.shop_invites to service_role;

create or replace function public.invite_shop_staff(
  p_shop_id uuid,
  p_phone text,
  p_full_name text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_tenant uuid;
  v_shop_tenant uuid;
  v_phone text;
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  select tenant_id into v_tenant from public.profiles
  where id = v_uid and role = 'VENDOR_ADMIN' and is_active;
  if v_tenant is null then
    raise exception 'Only the shop owner can invite staff';
  end if;

  select tenant_id into v_shop_tenant from public.shops where id = p_shop_id;
  if v_shop_tenant is distinct from v_tenant then
    raise exception 'Shop not found';
  end if;

  v_phone := regexp_replace(trim(p_phone), '[^0-9]', '', 'g');
  if v_phone ~ '^0[17][0-9]{8}$' then
    v_phone := '254' || substr(v_phone, 2);
  end if;
  if v_phone !~ '^254[17][0-9]{8}$' then
    raise exception 'Invalid Kenyan phone number';
  end if;

  insert into public.shop_invites (tenant_id, shop_id, phone, full_name, invited_by)
  values (v_tenant, p_shop_id, v_phone, nullif(trim(p_full_name), ''), v_uid)
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.invite_shop_staff(uuid, text, text) from public, anon;
grant execute on function public.invite_shop_staff(uuid, text, text) to authenticated;

-- Claim invite when a new auth user is created (after profile insert).
create or replace function private.claim_shop_invite()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public.shop_invites%rowtype;
  v_phone text;
begin
  v_phone := regexp_replace(coalesce(new.phone, ''), '[^0-9]', '', 'g');
  if v_phone ~ '^0[17][0-9]{8}$' then
    v_phone := '254' || substr(v_phone, 2);
  end if;

  select * into v_invite
  from public.shop_invites
  where claimed_at is null
    and phone = v_phone
  order by created_at desc
  limit 1;

  if v_invite.id is null then
    return new;
  end if;

  update public.profiles
  set
    tenant_id = v_invite.tenant_id,
    role = 'VENDOR_STAFF',
    active_shop_id = v_invite.shop_id,
    full_name = coalesce(nullif(trim(v_invite.full_name), ''), full_name),
    onboarding_completed_at = now(),
    updated_at = now()
  where id = new.id;

  update public.shop_invites
  set claimed_at = now()
  where id = v_invite.id;

  return new;
end;
$$;

drop trigger if exists profiles_claim_shop_invite on public.profiles;
create trigger profiles_claim_shop_invite
  after insert on public.profiles
  for each row execute function private.claim_shop_invite();

-- ---------------------------------------------------------------------------
-- Billing: base 3000 + extra shops
-- ---------------------------------------------------------------------------
insert into public.platform_settings (key, value, description) values
  ('billing.shop_addon_kes', '1000'::jsonb, 'Monthly add-on per extra shop (first shop included in base 3000)')
on conflict (key) do nothing;

-- Vendors need to read the addon to show billing copy
drop policy if exists platform_settings_read_billing on public.platform_settings;
create policy platform_settings_read_billing on public.platform_settings
  for select to authenticated
  using (key like 'billing.%' or private.is_super_admin());

create or replace function public.subscription_amount_for_tenant(p_tenant_id uuid)
returns numeric
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_addon numeric := 1000;
  v_shops integer := 0;
begin
  select coalesce((value #>> '{}')::numeric, 1000) into v_addon
  from public.platform_settings
  where key = 'billing.shop_addon_kes';

  select count(*) into v_shops from public.shops where tenant_id = p_tenant_id;

  return 3000 + greatest(v_shops - 1, 0) * coalesce(v_addon, 1000);
end;
$$;

revoke all on function public.subscription_amount_for_tenant(uuid) from public, anon;
grant execute on function public.subscription_amount_for_tenant(uuid) to authenticated, service_role;

create or replace function public.sync_tenant_subscription_amount(p_tenant_id uuid)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_amount numeric;
begin
  v_amount := public.subscription_amount_for_tenant(p_tenant_id);
  update public.subscriptions
  set amount = v_amount, updated_at = now()
  where tenant_id = p_tenant_id;
  return v_amount;
end;
$$;

revoke all on function public.sync_tenant_subscription_amount(uuid) from public, anon;
grant execute on function public.sync_tenant_subscription_amount(uuid) to authenticated, service_role;

create or replace function private.sync_amount_on_shop_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.sync_tenant_subscription_amount(coalesce(new.tenant_id, old.tenant_id));
  return coalesce(new, old);
end;
$$;

drop trigger if exists shops_sync_subscription_amount on public.shops;
create trigger shops_sync_subscription_amount
  after insert or delete on public.shops
  for each row execute function private.sync_amount_on_shop_change();

update public.subscriptions s
set amount = public.subscription_amount_for_tenant(s.tenant_id);

-- ---------------------------------------------------------------------------
-- Onboarding creates the default shop
-- ---------------------------------------------------------------------------
create or replace function public.complete_vendor_onboarding(
  p_business_name text,
  p_category public.business_category,
  p_phone text,
  p_destination_type public.payment_destination_type,
  p_account_number text,
  p_account_name text default null,
  p_location_lat numeric default null,
  p_location_lng numeric default null,
  p_address_text text default null,
  p_full_name text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_tenant_id uuid;
  v_shop_id uuid;
  v_phone text;
  v_existing uuid;
  v_tax public.tax_class;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  select tenant_id into v_existing from public.profiles where id = v_uid;
  if v_existing is not null then
    raise exception 'Onboarding already completed';
  end if;

  v_phone := regexp_replace(trim(p_phone), '[^0-9]', '', 'g');
  if v_phone ~ '^0[17][0-9]{8}$' then
    v_phone := '254' || substr(v_phone, 2);
  end if;
  if v_phone !~ '^254[17][0-9]{8}$' then
    raise exception 'Invalid Kenyan phone number';
  end if;

  if length(trim(p_business_name)) < 2 then
    raise exception 'Business name required';
  end if;

  insert into public.tenants (
    name, legal_name, category, phone, status, trial_ends_at, access_until,
    location_lat, location_lng, address_text
  ) values (
    trim(p_business_name),
    trim(p_business_name),
    p_category,
    v_phone,
    'TRIAL',
    now() + interval '14 days',
    now() + interval '14 days',
    p_location_lat,
    p_location_lng,
    p_address_text
  )
  returning id into v_tenant_id;

  insert into public.shops (
    tenant_id, name, category, phone, address_text, location_lat, location_lng, is_default
  ) values (
    v_tenant_id, trim(p_business_name), p_category, v_phone,
    p_address_text, p_location_lat, p_location_lng, true
  )
  returning id into v_shop_id;

  insert into public.tenant_payment_destinations (
    tenant_id, destination_type, account_number, account_name, is_primary
  ) values (
    v_tenant_id, p_destination_type, trim(p_account_number), p_account_name, true
  );

  insert into public.subscriptions (tenant_id, status, current_period_start, current_period_end, amount)
  values (
    v_tenant_id,
    'TRIAL',
    now(),
    now() + interval '14 days',
    3000
  );

  v_tax := case when p_category = 'CHEMIST' then 'ZERO_RATED'::public.tax_class else 'STANDARD_16'::public.tax_class end;

  insert into public.products (
    tenant_id, shop_id, name, sku, selling_price, cost_price, stock_qty,
    low_stock_threshold, is_sample, tax_class
  ) values (
    v_tenant_id, v_shop_id, 'Sample Item — Chai', 'SAMPLE-001', 50.00, 30.00, 100, 5, true, v_tax
  );

  update public.profiles
  set
    tenant_id = v_tenant_id,
    active_shop_id = v_shop_id,
    phone = coalesce(phone, v_phone),
    full_name = coalesce(nullif(trim(p_full_name), ''), full_name),
    role = 'VENDOR_ADMIN',
    onboarding_completed_at = now(),
    updated_at = now()
  where id = v_uid;

  update auth.users
  set raw_app_meta_data =
    coalesce(raw_app_meta_data, '{}'::jsonb)
      || jsonb_build_object(
        'role', 'VENDOR_ADMIN',
        'tenant_id', v_tenant_id,
        'shop_id', v_shop_id
      )
  where id = v_uid;

  perform private.notify_super_admins(
    'New vendor registered',
    trim(p_business_name) || ' joined InuaBiz (' || v_phone || ').',
    'SYSTEM',
    'NORMAL',
    jsonb_build_object('tenant_id', v_tenant_id, 'phone', v_phone)
  );

  return jsonb_build_object(
    'tenant_id', v_tenant_id,
    'shop_id', v_shop_id,
    'trial_ends_at', (now() + interval '14 days'),
    'access_until', (now() + interval '14 days')
  );
end;
$$;

-- Switch active shop (owner: any shop; staff: assigned only)
create or replace function public.set_active_shop(p_shop_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_role public.user_role;
  v_tenant uuid;
  v_assigned uuid;
  v_shop_tenant uuid;
begin
  select role, tenant_id, active_shop_id into v_role, v_tenant, v_assigned
  from public.profiles where id = v_uid;
  if v_tenant is null then
    raise exception 'No tenant';
  end if;
  select tenant_id into v_shop_tenant from public.shops where id = p_shop_id;
  if v_shop_tenant is distinct from v_tenant then
    raise exception 'Shop not found';
  end if;
  if v_role = 'VENDOR_STAFF' and v_assigned is distinct from p_shop_id then
    raise exception 'Staff are limited to their assigned shop';
  end if;
  update public.profiles set active_shop_id = p_shop_id, updated_at = now() where id = v_uid;
end;
$$;

revoke all on function public.set_active_shop(uuid) from public, anon;
grant execute on function public.set_active_shop(uuid) to authenticated;

comment on table public.shops is
  'Locations under a tenant (master vendor). Dedicated DB / white-label is out of scope.';

drop policy if exists profiles_select_same_tenant on public.profiles;
create policy profiles_select_same_tenant on public.profiles
  for select to authenticated
  using (
    tenant_id is not null
    and tenant_id = private.current_tenant_id()
  );
