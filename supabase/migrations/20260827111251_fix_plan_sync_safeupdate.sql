-- safeupdate: plan-sync trigger must not UPDATE subscriptions without WHERE.
-- Also reloads PostgREST schema cache so /rest/v1/subscription_plans is visible.

NOTIFY pgrst, 'reload schema';

create or replace function public.sync_billing_settings_from_plans()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_shop numeric;
begin
  v_shop := public.plan_amount_kes('SHOP_MONTHLY');

  insert into public.platform_settings (key, value, description)
  values (
    'billing.shop_price_kes',
    to_jsonb(v_shop),
    'Monthly InuaBiz price per shop (KES). Synced from subscription_plans.SHOP_MONTHLY.'
  )
  on conflict (key) do update
  set
    value = excluded.value,
    description = excluded.description,
    updated_at = now()
  where public.platform_settings.key = excluded.key;

  insert into public.platform_settings (key, value, description)
  values (
    'billing.shop_addon_kes',
    to_jsonb(v_shop),
    'Extra-shop STK amount (KES). Same as SHOP_MONTHLY; synced from subscription_plans.'
  )
  on conflict (key) do update
  set
    value = excluded.value,
    description = excluded.description,
    updated_at = now()
  where public.platform_settings.key = excluded.key;

  update public.subscriptions s
  set amount = public.subscription_amount_for_tenant(s.tenant_id)
  where s.tenant_id is not null;
end;
$$;

grant execute on function public.sync_billing_settings_from_plans() to service_role;

NOTIFY pgrst, 'reload schema';
