-- Stop planting a sample SKU at onboarding. Shops start with an empty catalog.

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
  p_plan_code text default 'SHOP_MONTHLY',
  p_destinations jsonb default null
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
  v_email text;
  v_shop_name text;
  v_plan text;
  v_amount numeric;
  v_trial_days integer := 3;
  v_dest jsonb;
  v_type text;
  v_acct text;
  v_name text;
  v_primary boolean;
  v_dest_count integer := 0;
  v_primary_seen boolean := false;
  v_dests jsonb;
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

  -- Prefer multi-destination payload; fall back to single legacy args.
  if p_destinations is not null
     and jsonb_typeof(p_destinations) = 'array'
     and jsonb_array_length(p_destinations) > 0 then
    v_dests := p_destinations;
  else
    v_dests := jsonb_build_array(
      jsonb_build_object(
        'type', p_destination_type::text,
        'account_number', p_account_number,
        'account_name', p_account_name,
        'is_primary', true
      )
    );
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

  for v_dest in
    select value from jsonb_array_elements(v_dests) as t(value)
  loop
    v_type := upper(trim(coalesce(v_dest ->> 'type', '')));
    v_acct := regexp_replace(trim(coalesce(v_dest ->> 'account_number', '')), '\s+', '', 'g');
    v_name := nullif(trim(coalesce(v_dest ->> 'account_name', '')), '');
    v_primary := coalesce((v_dest ->> 'is_primary')::boolean, false);

    if v_type not in ('PERSONAL_MPESA', 'TILL', 'PAYBILL', 'POCHI') then
      continue;
    end if;

    if v_type = 'PERSONAL_MPESA' or v_type = 'POCHI' then
      v_acct := regexp_replace(v_acct, '[^0-9]', '', 'g');
      if v_acct ~ '^0[17][0-9]{8}$' then
        v_acct := '254' || substr(v_acct, 2);
      end if;
      if v_acct !~ '^254[17][0-9]{8}$' then
        raise exception 'Invalid M-Pesa number for %', v_type;
      end if;
    else
      v_acct := regexp_replace(v_acct, '[^0-9]', '', 'g');
      if v_acct !~ '^[0-9]{5,7}$' then
        raise exception 'Invalid Till/Paybill number';
      end if;
    end if;

    if v_primary_seen then
      v_primary := false;
    elsif v_primary then
      v_primary_seen := true;
    end if;

    insert into public.tenant_payment_destinations (
      tenant_id, destination_type, account_number, account_name, is_primary
    ) values (
      v_tenant_id,
      v_type::public.payment_destination_type,
      v_acct,
      v_name,
      v_primary
    )
    on conflict (tenant_id, destination_type, account_number) do update
    set
      account_name = excluded.account_name,
      is_primary = excluded.is_primary;

    v_dest_count := v_dest_count + 1;
  end loop;

  if v_dest_count < 1 then
    raise exception 'At least one payment destination is required';
  end if;

  if not v_primary_seen then
    update public.tenant_payment_destinations d
    set is_primary = true
    where d.id = (
      select id from public.tenant_payment_destinations
      where tenant_id = v_tenant_id
      order by created_at
      limit 1
    );
  end if;

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
    jsonb_build_object(
      'tenant_id', v_tenant_id,
      'phone', v_phone,
      'plan_code', v_plan,
      'destinations', v_dest_count
    )
  );

  return jsonb_build_object(
    'tenant_id', v_tenant_id,
    'shop_id', v_shop_id,
    'plan_code', v_plan,
    'amount', v_amount,
    'destinations', v_dest_count,
    'trial_ends_at', (now() + make_interval(days => v_trial_days)),
    'access_until', (now() + make_interval(days => v_trial_days))
  );
end;
$$;

revoke all on function public.complete_vendor_onboarding(
  text, public.business_category, text, public.payment_destination_type,
  text, text, numeric, numeric, text, text, text, jsonb
) from public, anon;

grant execute on function public.complete_vendor_onboarding(
  text, public.business_category, text, public.payment_destination_type,
  text, text, numeric, numeric, text, text, text, jsonb
) to authenticated;

delete from public.products p
where p.is_sample
  and not exists (
    select 1 from public.sale_items si where si.product_id = p.id
  );

NOTIFY pgrst, 'reload schema';
