-- Each shop is billed at KES 3,000 / month (1 shop = 3000, 2 shops = 6000).

update public.platform_settings
set
  value = '3000'::jsonb,
  description = 'Monthly InuaBiz price per shop (KES). Org total = shop_count × this amount.'
where key = 'billing.shop_addon_kes';

insert into public.platform_settings (key, value, description)
values (
  'billing.shop_price_kes',
  '3000'::jsonb,
  'Monthly InuaBiz price per shop (KES). Org total = shop_count × this amount.'
)
on conflict (key) do update
set
  value = excluded.value,
  description = excluded.description;

create or replace function public.subscription_amount_for_tenant(p_tenant_id uuid)
returns numeric
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_price numeric := 3000;
  v_shops integer := 0;
begin
  select coalesce((value #>> '{}')::numeric, 3000) into v_price
  from public.platform_settings
  where key = 'billing.shop_price_kes';

  select count(*) into v_shops from public.shops where tenant_id = p_tenant_id;

  return greatest(v_shops, 1) * coalesce(v_price, 3000);
end;
$$;

update public.subscriptions s
set amount = public.subscription_amount_for_tenant(s.tenant_id);
