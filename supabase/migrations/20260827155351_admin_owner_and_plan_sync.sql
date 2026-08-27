-- Owner name on admin vendor map; sync subscription amounts when any billable plan changes.

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
  s.current_period_end,
  (
    select p.full_name
    from public.profiles p
    where p.tenant_id = t.id
      and p.role = 'VENDOR_ADMIN'
      and p.is_active = true
    order by p.created_at asc nulls last
    limit 1
  ) as owner_name
from public.tenants t
left join public.subscriptions s on s.tenant_id = t.id;

grant select on public.admin_tenant_map to authenticated;

create or replace function public.trg_subscription_plans_sync_billing()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    if old.code in ('SHOP_MONTHLY', 'COMPLIANCE') then
      perform public.sync_billing_settings_from_plans();
    end if;
    return old;
  end if;

  if new.code in ('SHOP_MONTHLY', 'COMPLIANCE')
     or (tg_op = 'UPDATE' and old.code in ('SHOP_MONTHLY', 'COMPLIANCE')) then
    perform public.sync_billing_settings_from_plans();
  end if;

  return new;
end;
$$;

select public.sync_billing_settings_from_plans();

NOTIFY pgrst, 'reload schema';
