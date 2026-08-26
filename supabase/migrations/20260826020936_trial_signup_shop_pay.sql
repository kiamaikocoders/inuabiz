-- 3-day trial, signup metadata, extra-shop payment draft on the transaction row.

alter table public.tenants
  alter column trial_ends_at set default (now() + interval '3 days'),
  alter column access_until set default (now() + interval '3 days');

alter table public.profiles
  add column if not exists pending_shop_name text;

alter table public.payment_transactions
  add column if not exists metadata jsonb;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_phone text;
  v_name text;
  v_shop text;
begin
  v_phone := nullif(trim(coalesce(new.phone, new.raw_user_meta_data->>'phone', '')), '');
  v_name := nullif(trim(coalesce(new.raw_user_meta_data->>'full_name', '')), '');
  v_shop := nullif(trim(coalesce(new.raw_user_meta_data->>'shop_name', '')), '');

  insert into public.profiles (id, role, phone, full_name, pending_shop_name, tenant_id, is_active)
  values (new.id, 'VENDOR_ADMIN', v_phone, v_name, v_shop, null, true)
  on conflict (id) do update
    set
      full_name = coalesce(public.profiles.full_name, excluded.full_name),
      pending_shop_name = coalesce(public.profiles.pending_shop_name, excluded.pending_shop_name),
      phone = coalesce(public.profiles.phone, excluded.phone);

  insert into public.notification_preferences (profile_id)
  values (new.id)
  on conflict (profile_id) do nothing;

  return new;
end;
$$;

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
  v_email text;
  v_shop_name text;
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

  select email into v_email from auth.users where id = v_uid;
  select coalesce(nullif(trim(p_business_name), ''), pending_shop_name, '')
    into v_shop_name
    from public.profiles where id = v_uid;

  if length(trim(v_shop_name)) < 2 then
    raise exception 'Business name required';
  end if;

  insert into public.tenants (
    name, legal_name, email, category, phone, status, trial_ends_at, access_until,
    location_lat, location_lng, address_text
  ) values (
    trim(v_shop_name),
    trim(v_shop_name),
    v_email,
    p_category,
    v_phone,
    'TRIAL',
    now() + interval '3 days',
    now() + interval '3 days',
    p_location_lat,
    p_location_lng,
    p_address_text
  )
  returning id into v_tenant_id;

  insert into public.shops (
    tenant_id, name, category, phone, address_text, location_lat, location_lng, is_default
  ) values (
    v_tenant_id, trim(v_shop_name), p_category, v_phone,
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
    now() + interval '3 days',
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
    pending_shop_name = null,
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
    trim(v_shop_name) || ' joined InuaBiz (' || v_phone || ').',
    'SYSTEM',
    'NORMAL',
    jsonb_build_object('tenant_id', v_tenant_id, 'phone', v_phone)
  );

  return jsonb_build_object(
    'tenant_id', v_tenant_id,
    'shop_id', v_shop_id,
    'trial_ends_at', (now() + interval '3 days'),
    'access_until', (now() + interval '3 days')
  );
end;
$$;

alter table public.tenants add column if not exists email text;

revoke execute on function public.complete_vendor_onboarding(
  text, public.business_category, text, public.payment_destination_type,
  text, text, numeric, numeric, text, text
) from public, anon;

grant execute on function public.complete_vendor_onboarding(
  text, public.business_category, text, public.payment_destination_type,
  text, text, numeric, numeric, text, text
) to authenticated;

update public.communication_templates
set
  subject = replace(subject, '14-day', '3-day'),
  html = replace(
    replace(html, '14-day', '3-day'),
    'Your 3-day trial ends on 21 Aug',
    'Your 3-day trial is ending'
  ),
  description = replace(description, '14-day', '3-day')
where coalesce(subject, '') like '%14-day%'
   or coalesce(html, '') like '%14-day%'
   or coalesce(description, '') like '%14-day%';
