-- InuaBiz: auth bootstrap, onboarding RPCs, notifications, admin views, realtime

-- ---------------------------------------------------------------------------
-- Allow vendor profiles without tenant until onboarding completes
-- ---------------------------------------------------------------------------
alter table public.profiles
  drop constraint if exists profiles_super_admin_no_tenant;

alter table public.profiles
  add constraint profiles_super_admin_tenant_null check (
    role <> 'SUPER_ADMIN' or tenant_id is null
  );

alter table public.profiles
  add column if not exists onboarding_completed_at timestamptz;

-- ---------------------------------------------------------------------------
-- New auth user → profile + default notification prefs
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_phone text;
begin
  v_phone := nullif(trim(coalesce(new.phone, new.raw_user_meta_data->>'phone', '')), '');

  insert into public.profiles (id, role, phone, tenant_id, is_active)
  values (new.id, 'VENDOR_ADMIN', v_phone, null, true)
  on conflict (id) do nothing;

  insert into public.notification_preferences (profile_id)
  values (new.id)
  on conflict (profile_id) do nothing;

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.handle_new_user() to supabase_auth_admin;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Notify helpers
-- ---------------------------------------------------------------------------
create or replace function private.notify_user(
  p_recipient_id uuid,
  p_recipient_role public.recipient_role,
  p_tenant_id uuid,
  p_title text,
  p_message text,
  p_type public.notification_type,
  p_priority public.notification_priority default 'NORMAL',
  p_metadata jsonb default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.notifications (
    tenant_id, recipient_role, recipient_id, title, message, type, priority, metadata
  ) values (
    p_tenant_id, p_recipient_role, p_recipient_id, p_title, p_message, p_type, p_priority, p_metadata
  )
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function private.notify_super_admins(
  p_title text,
  p_message text,
  p_type public.notification_type,
  p_priority public.notification_priority default 'NORMAL',
  p_metadata jsonb default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  for r in
    select id from public.profiles
    where role = 'SUPER_ADMIN' and is_active = true
  loop
    perform private.notify_user(
      r.id, 'SUPER_ADMIN', null, p_title, p_message, p_type, p_priority, p_metadata
    );
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Complete onboarding (atomic tenant + destination + sample product)
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
  v_phone text;
  v_existing uuid;
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
    name, category, phone, status, trial_ends_at, access_until,
    location_lat, location_lng, address_text
  ) values (
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

  insert into public.tenant_payment_destinations (
    tenant_id, destination_type, account_number, account_name, is_primary
  ) values (
    v_tenant_id, p_destination_type, trim(p_account_number), p_account_name, true
  );

  insert into public.subscriptions (tenant_id, status, current_period_start, current_period_end)
  values (
    v_tenant_id,
    'TRIAL',
    now(),
    now() + interval '14 days'
  );

  -- Sample product for guided tour
  insert into public.products (
    tenant_id, name, sku, selling_price, cost_price, stock_qty, low_stock_threshold, is_sample
  ) values (
    v_tenant_id, 'Sample Item — Chai', 'SAMPLE-001', 50.00, 30.00, 100, 5, true
  );

  update public.profiles
  set
    tenant_id = v_tenant_id,
    phone = coalesce(phone, v_phone),
    full_name = coalesce(nullif(trim(p_full_name), ''), full_name),
    role = 'VENDOR_ADMIN',
    onboarding_completed_at = now(),
    updated_at = now()
  where id = v_uid;

  -- Mirror role + tenant into JWT app_metadata (Auth Admin API preferred from Edge;
  -- raw update kept for bootstrap when Auth Admin not available in SQL)
  update auth.users
  set raw_app_meta_data =
    coalesce(raw_app_meta_data, '{}'::jsonb)
      || jsonb_build_object(
        'role', 'VENDOR_ADMIN',
        'tenant_id', v_tenant_id
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
    'trial_ends_at', (now() + interval '14 days'),
    'access_until', (now() + interval '14 days')
  );
end;
$$;

revoke all on function public.complete_vendor_onboarding from public;
grant execute on function public.complete_vendor_onboarding to authenticated;

-- ---------------------------------------------------------------------------
-- Customer credit balance helper
-- ---------------------------------------------------------------------------
create or replace function public.customer_credit_balance(p_customer_id uuid)
returns numeric
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce(sum(
    case
      when entry_type = 'CHARGE' then amount
      when entry_type in ('REPAYMENT', 'ADJUSTMENT') then -amount
      else 0
    end
  ), 0)
  from public.credit_entries
  where customer_id = p_customer_id;
$$;

grant execute on function public.customer_credit_balance to authenticated;

-- ---------------------------------------------------------------------------
-- Low-stock notification when qty crosses threshold
-- ---------------------------------------------------------------------------
create or replace function private.notify_low_stock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  if new.stock_qty <= new.low_stock_threshold
     and (old.stock_qty is distinct from new.stock_qty)
     and (old.stock_qty > old.low_stock_threshold or old.stock_qty is null)
  then
    for r in
      select id from public.profiles
      where tenant_id = new.tenant_id
        and role in ('VENDOR_ADMIN', 'VENDOR_STAFF')
        and is_active
    loop
      perform private.notify_user(
        r.id,
        'VENDOR_ADMIN',
        new.tenant_id,
        'Low stock: ' || left(new.name, 80),
        new.name || ' is at ' || new.stock_qty::text || ' (threshold ' || new.low_stock_threshold::text || ').',
        'STOCK_LOW',
        'HIGH',
        jsonb_build_object('product_id', new.id, 'stock_qty', new.stock_qty)
      );
    end loop;
  end if;
  return new;
end;
$$;

drop trigger if exists products_low_stock_notify on public.products;
create trigger products_low_stock_notify
  after update of stock_qty on public.products
  for each row execute function private.notify_low_stock();

-- ---------------------------------------------------------------------------
-- Sale paid → notify vendor admins
-- ---------------------------------------------------------------------------
create or replace function private.notify_sale_paid()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  if new.status = 'PAID' and (old.status is distinct from 'PAID') then
    for r in
      select id from public.profiles
      where tenant_id = new.tenant_id
        and role in ('VENDOR_ADMIN', 'VENDOR_STAFF')
        and is_active
    loop
      perform private.notify_user(
        r.id,
        'VENDOR_ADMIN',
        new.tenant_id,
        'Sale completed',
        'Payment of KES ' || new.total::text || ' received.',
        'SALE',
        'HIGH',
        jsonb_build_object('sale_id', new.id, 'amount', new.total, 'channel', new.payment_channel)
      );
    end loop;
  end if;
  return new;
end;
$$;

drop trigger if exists sales_paid_notify on public.sales;
create trigger sales_paid_notify
  after update of status on public.sales
  for each row execute function private.notify_sale_paid();

-- ---------------------------------------------------------------------------
-- Access gate helper (Edge / client can call)
-- ---------------------------------------------------------------------------
create or replace function public.tenant_has_access(p_tenant_id uuid default null)
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
      and t.status in ('TRIAL', 'ACTIVE')
      and t.access_until > now()
  );
$$;

grant execute on function public.tenant_has_access to authenticated;

-- ---------------------------------------------------------------------------
-- Admin analytics views (security_invoker so RLS applies)
-- ---------------------------------------------------------------------------
create or replace view public.admin_tenant_map
with (security_invoker = true)
as
select
  t.id,
  t.name,
  t.category,
  t.phone,
  t.status,
  t.trial_ends_at,
  t.access_until,
  t.location_lat,
  t.location_lng,
  t.address_text,
  t.created_at,
  s.plan_code,
  s.amount as subscription_amount,
  s.current_period_end
from public.tenants t
left join public.subscriptions s on s.tenant_id = t.id;

create or replace view public.admin_mrr_snapshot
with (security_invoker = true)
as
select
  count(*) filter (where t.status = 'ACTIVE') as active_tenants,
  count(*) filter (where t.status = 'TRIAL') as trial_tenants,
  count(*) filter (where t.status = 'PAST_DUE') as past_due_tenants,
  count(*) filter (where t.status = 'SUSPENDED') as suspended_tenants,
  coalesce(sum(s.amount) filter (where t.status = 'ACTIVE'), 0) as mrr_kes,
  count(*) filter (
    where t.status = 'ACTIVE'
      and t.created_at >= date_trunc('month', now())
  ) as conversions_this_month
from public.tenants t
left join public.subscriptions s on s.tenant_id = t.id;

create or replace view public.customer_loyalty_stats
with (security_invoker = true)
as
select
  c.id as customer_id,
  c.tenant_id,
  c.phone,
  c.name,
  count(s.id) filter (where s.status = 'PAID') as paid_sale_count,
  coalesce(sum(s.total) filter (where s.status = 'PAID'), 0) as lifetime_spend,
  max(s.paid_at) as last_paid_at,
  public.customer_credit_balance(c.id) as credit_balance
from public.customers c
left join public.sales s on s.customer_id = c.id
group by c.id, c.tenant_id, c.phone, c.name;

grant select on public.admin_tenant_map to authenticated;
grant select on public.admin_mrr_snapshot to authenticated;
grant select on public.customer_loyalty_stats to authenticated;

-- ---------------------------------------------------------------------------
-- Realtime for in-app bell
-- ---------------------------------------------------------------------------
do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception
  when duplicate_object then null;
end;
$$;

-- ---------------------------------------------------------------------------
-- Extra policies: subscriptions update via service role only (Edge);
-- allow vendors to insert payment_transactions? No — Edge only.
-- Allow mark-read already exists.
-- Profiles: allow select of same-tenant staff for vendor admins
-- ---------------------------------------------------------------------------
create policy profiles_select_same_tenant on public.profiles
  for select to authenticated
  using (
    tenant_id is not null
    and tenant_id = private.current_tenant_id()
  );

comment on function public.complete_vendor_onboarding is
  'Creates tenant, payment destination, trial subscription, sample product, links profile';
