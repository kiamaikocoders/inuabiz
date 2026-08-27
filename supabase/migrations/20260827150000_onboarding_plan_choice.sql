-- Persist plan chosen at onboarding (SHOP_MONTHLY vs COMPLIANCE) and bill from it.

create or replace function public.subscription_amount_for_tenant(p_tenant_id uuid)
returns numeric
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_plan text := 'SHOP_MONTHLY';
  v_price numeric := 3000;
  v_shops integer := 0;
begin
  select upper(coalesce(nullif(trim(plan_code), ''), 'SHOP_MONTHLY'))
    into v_plan
  from public.subscriptions
  where tenant_id = p_tenant_id
  limit 1;

  if v_plan in ('FLAT_3000', 'STANDARD', 'NETWORK', 'FREE') then
    v_plan := 'SHOP_MONTHLY';
  end if;

  if v_plan = 'COMPLIANCE' then
    v_price := public.plan_amount_kes('COMPLIANCE');
  else
    v_plan := 'SHOP_MONTHLY';
    v_price := public.plan_amount_kes('SHOP_MONTHLY');
  end if;

  if v_price is null or v_price <= 0 then
    select coalesce((value #>> '{}')::numeric, 3000) into v_price
    from public.platform_settings
    where key = 'billing.shop_price_kes';
  end if;

  select count(*) into v_shops from public.shops where tenant_id = p_tenant_id;

  return greatest(v_shops, 1) * coalesce(v_price, 3000);
end;
$$;

drop function if exists public.complete_vendor_onboarding(
  text, public.business_category, text, public.payment_destination_type,
  text, text, numeric, numeric, text, text
);

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
  p_full_name text default null,
  p_plan_code text default 'SHOP_MONTHLY'
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
  v_plan text;
  v_amount numeric;
  v_trial_days integer := 3;
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

  v_plan := upper(trim(coalesce(p_plan_code, 'SHOP_MONTHLY')));
  if v_plan = 'COMPLIANCE' then
    v_plan := 'COMPLIANCE';
  else
    v_plan := 'SHOP_MONTHLY';
  end if;

  v_amount := public.plan_amount_kes(v_plan);
  if v_amount is null or v_amount <= 0 then
    v_amount := case when v_plan = 'COMPLIANCE' then 4500 else 3000 end;
  end if;

  select coalesce((value #>> '{}')::integer, 3) into v_trial_days
  from public.platform_settings
  where key = 'billing.trial_days';
  if v_trial_days is null or v_trial_days < 1 then
    v_trial_days := 3;
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
    now() + make_interval(days => v_trial_days),
    now() + make_interval(days => v_trial_days),
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

  insert into public.subscriptions (
    tenant_id, status, plan_code, current_period_start, current_period_end, amount
  ) values (
    v_tenant_id,
    'TRIAL',
    v_plan,
    now(),
    now() + make_interval(days => v_trial_days),
    v_amount
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
        'shop_id', v_shop_id,
        'plan_code', v_plan
      )
  where id = v_uid;

  perform private.notify_super_admins(
    'New vendor registered',
    trim(v_shop_name) || ' joined InuaBiz on ' || v_plan || ' (' || v_phone || ').',
    'SYSTEM',
    'NORMAL',
    jsonb_build_object('tenant_id', v_tenant_id, 'phone', v_phone, 'plan_code', v_plan)
  );

  return jsonb_build_object(
    'tenant_id', v_tenant_id,
    'shop_id', v_shop_id,
    'plan_code', v_plan,
    'amount', v_amount,
    'trial_ends_at', (now() + make_interval(days => v_trial_days)),
    'access_until', (now() + make_interval(days => v_trial_days))
  );
end;
$$;

revoke all on function public.complete_vendor_onboarding(
  text, public.business_category, text, public.payment_destination_type,
  text, text, numeric, numeric, text, text, text
) from public, anon;

grant execute on function public.complete_vendor_onboarding(
  text, public.business_category, text, public.payment_destination_type,
  text, text, numeric, numeric, text, text, text
) to authenticated;

-- Normalize legacy plan codes so billing uses SHOP_MONTHLY / COMPLIANCE.
update public.subscriptions
set plan_code = 'SHOP_MONTHLY'
where upper(coalesce(plan_code, '')) in ('', 'FLAT_3000', 'STANDARD', 'NETWORK', 'FREE');

NOTIFY pgrst, 'reload schema';
