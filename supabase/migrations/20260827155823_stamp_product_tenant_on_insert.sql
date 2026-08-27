-- Stamp tenant_id / shop_id on product inserts so RLS WITH CHECK can pass
-- when the client omits them (PostgREST otherwise inserts NULL tenant_id).

create or replace function private.stamp_product_scope()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if private.is_super_admin() then
    if new.tenant_id is null then
      raise exception 'tenant_id required';
    end if;
    return new;
  end if;

  new.tenant_id := private.current_tenant_id();
  if new.tenant_id is null then
    raise exception 'Complete onboarding first';
  end if;
  if new.shop_id is null then
    new.shop_id := private.current_shop_id();
  end if;
  return new;
end;
$$;

drop trigger if exists products_stamp_scope on public.products;
create trigger products_stamp_scope
  before insert on public.products
  for each row
  execute function private.stamp_product_scope();

revoke all on function private.stamp_product_scope() from public, anon, authenticated;
