-- Per-tenant custom price per shop (e.g. 2500 instead of public SHOP_MONTHLY).
-- When null, billing uses the public plan amount × shop count as before.

alter table public.subscriptions
  add column if not exists custom_unit_amount_kes numeric(12, 2)
    check (custom_unit_amount_kes is null or custom_unit_amount_kes >= 0);

comment on column public.subscriptions.custom_unit_amount_kes is
  'Optional negotiated KES per shop / month. Null = use subscription_plans amount for the tenant plan.';

create or replace function public.subscription_unit_amount_for_tenant(p_tenant_id uuid)
returns numeric
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_plan text := 'SHOP_MONTHLY';
  v_custom numeric;
  v_price numeric := 3000;
begin
  select
    upper(coalesce(nullif(trim(plan_code), ''), 'SHOP_MONTHLY')),
    custom_unit_amount_kes
  into v_plan, v_custom
  from public.subscriptions
  where tenant_id = p_tenant_id
  limit 1;

  if v_custom is not null then
    return v_custom;
  end if;

  if v_plan in ('FLAT_3000', 'STANDARD', 'NETWORK', 'FREE') then
    v_plan := 'SHOP_MONTHLY';
  end if;

  if v_plan = 'COMPLIANCE' then
    v_price := public.plan_amount_kes('COMPLIANCE');
  else
    v_price := public.plan_amount_kes('SHOP_MONTHLY');
  end if;

  if v_price is null or v_price <= 0 then
    select coalesce((value #>> '{}')::numeric, 3000) into v_price
    from public.platform_settings
    where key = 'billing.shop_price_kes';
  end if;

  return coalesce(v_price, 3000);
end;
$$;

revoke all on function public.subscription_unit_amount_for_tenant(uuid) from public, anon;
grant execute on function public.subscription_unit_amount_for_tenant(uuid) to authenticated, service_role;

create or replace function public.subscription_amount_for_tenant(p_tenant_id uuid)
returns numeric
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_price numeric;
  v_shops integer := 0;
begin
  v_price := public.subscription_unit_amount_for_tenant(p_tenant_id);
  select count(*) into v_shops from public.shops where tenant_id = p_tenant_id;
  return greatest(v_shops, 1) * coalesce(v_price, 3000);
end;
$$;

drop function if exists public.admin_override_subscription(uuid, numeric, text, public.tenant_status, integer, text);

create or replace function public.admin_override_subscription(
  p_tenant_id uuid,
  p_amount numeric,
  p_plan_code text,
  p_status public.tenant_status,
  p_period_days integer,
  p_reason text,
  p_custom_unit_amount_kes numeric default null,
  p_set_custom_unit boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_name text;
  v_end timestamptz;
  v_amount numeric;
  v_shops integer;
begin
  perform private.assert_super_admin();
  if coalesce(trim(p_reason), '') = '' then
    raise exception 'reason required' using errcode = '22023';
  end if;
  if p_amount is not null and (p_amount < 0 or p_amount > 1000000) then
    raise exception 'amount out of range' using errcode = '22023';
  end if;
  if p_set_custom_unit and p_custom_unit_amount_kes is not null
     and (p_custom_unit_amount_kes < 0 or p_custom_unit_amount_kes > 1000000) then
    raise exception 'custom unit amount out of range' using errcode = '22023';
  end if;
  if p_period_days is not null and (p_period_days < 1 or p_period_days > 366) then
    raise exception 'period days must be 1–366' using errcode = '22023';
  end if;

  select name into v_name from public.tenants where id = p_tenant_id;
  if v_name is null then
    raise exception 'tenant not found' using errcode = 'P0002';
  end if;

  v_end := case
    when p_period_days is not null then now() + make_interval(days => p_period_days)
    else null
  end;

  update public.tenants
  set
    status = coalesce(p_status, status),
    access_until = coalesce(v_end, access_until),
    updated_at = now()
  where id = p_tenant_id;

  update public.subscriptions
  set
    plan_code = coalesce(nullif(trim(p_plan_code), ''), plan_code),
    status = coalesce(p_status, status),
    current_period_start = case when v_end is not null then now() else current_period_start end,
    current_period_end = coalesce(v_end, current_period_end),
    custom_unit_amount_kes = case
      when p_set_custom_unit then p_custom_unit_amount_kes
      else custom_unit_amount_kes
    end,
    updated_at = now()
  where tenant_id = p_tenant_id;

  -- Always recompute total from unit × shops when custom pricing is in play,
  -- or when caller did not pass a one-off total.
  select count(*) into v_shops from public.shops where tenant_id = p_tenant_id;
  if p_set_custom_unit or p_amount is null then
    v_amount := public.subscription_amount_for_tenant(p_tenant_id);
  else
    v_amount := p_amount;
  end if;

  update public.subscriptions
  set amount = v_amount, updated_at = now()
  where tenant_id = p_tenant_id;

  perform private.log_admin_ops(
    'override_subscription',
    p_tenant_id,
    v_name,
    jsonb_build_object(
      'amount', v_amount,
      'custom_unit_amount_kes', case when p_set_custom_unit then p_custom_unit_amount_kes else null end,
      'set_custom_unit', p_set_custom_unit,
      'shops', greatest(v_shops, 1),
      'plan_code', p_plan_code,
      'status', p_status,
      'period_days', p_period_days,
      'reason', p_reason
    )
  );

  return jsonb_build_object(
    'ok', true,
    'amount', v_amount,
    'custom_unit_amount_kes', (
      select custom_unit_amount_kes from public.subscriptions where tenant_id = p_tenant_id limit 1
    ),
    'access_until', coalesce(v_end, (select access_until from public.tenants where id = p_tenant_id))
  );
end;
$$;

revoke all on function public.admin_override_subscription(
  uuid, numeric, text, public.tenant_status, integer, text, numeric, boolean
) from public, anon;
grant execute on function public.admin_override_subscription(
  uuid, numeric, text, public.tenant_status, integer, text, numeric, boolean
) to authenticated;
