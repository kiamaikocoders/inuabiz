-- Harden RPC grants + mutable search_path on private.touch_updated_at

create or replace function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Onboarding / access checks: authenticated only (never anon)
revoke execute on function public.complete_vendor_onboarding(
  text, public.business_category, text, public.payment_destination_type,
  text, text, numeric, numeric, text, text
) from public, anon;

grant execute on function public.complete_vendor_onboarding(
  text, public.business_category, text, public.payment_destination_type,
  text, text, numeric, numeric, text, text
) to authenticated;

revoke execute on function public.tenant_has_access(uuid) from public, anon;
grant execute on function public.tenant_has_access(uuid) to authenticated;

revoke execute on function public.customer_credit_balance(uuid) from public, anon;
grant execute on function public.customer_credit_balance(uuid) to authenticated;

-- Platform helper if present — lock down from API roles
do $$
begin
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'rls_auto_enable'
  ) then
    execute 'revoke execute on function public.rls_auto_enable() from public, anon, authenticated';
  end if;
end;
$$;
