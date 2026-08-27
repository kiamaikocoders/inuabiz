-- Admin-editable subscription / pricing plans (source of truth for public pricing + STK amounts).

create table if not exists public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  amount_kes numeric(12, 2) not null check (amount_kes >= 0),
  currency text not null default 'KES',
  billing_interval text not null default 'month'
    check (billing_interval in ('month', 'one_time', 'quote')),
  is_active boolean not null default true,
  is_public boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null
);

create index if not exists subscription_plans_active_order_idx
  on public.subscription_plans (is_active, display_order, code);

alter table public.subscription_plans enable row level security;

drop policy if exists subscription_plans_public_read on public.subscription_plans;
create policy subscription_plans_public_read on public.subscription_plans
  for select to anon, authenticated
  using (is_active = true and is_public = true);

drop policy if exists subscription_plans_admin_all on public.subscription_plans;
create policy subscription_plans_admin_all on public.subscription_plans
  for all to authenticated
  using (private.is_super_admin())
  with check (private.is_super_admin());

grant select on public.subscription_plans to anon, authenticated;
grant insert, update, delete on public.subscription_plans to authenticated;
grant all on public.subscription_plans to service_role;

insert into public.subscription_plans (
  code, name, description, amount_kes, billing_interval, is_active, is_public, display_order
) values
  (
    'SHOP_MONTHLY',
    'Standard',
    'Self-serve POS per shop / month after trial. Extra shops use the same rate.',
    3000,
    'month',
    true,
    true,
    10
  ),
  (
    'COMPLIANCE',
    'Compliance (ETR)',
    'Standard plus ETR / KRA-ready invoicing. Quoted — not self-serve PIN.',
    4500,
    'month',
    true,
    true,
    20
  ),
  (
    'SETUP',
    'Assisted setup',
    'Optional one-time assisted onboarding.',
    1000,
    'one_time',
    true,
    true,
    30
  )
on conflict (code) do update
set
  name = excluded.name,
  description = excluded.description,
  amount_kes = excluded.amount_kes,
  billing_interval = excluded.billing_interval,
  is_active = excluded.is_active,
  is_public = excluded.is_public,
  display_order = excluded.display_order,
  updated_at = now();

insert into public.platform_settings (key, value, description)
values (
  'billing.trial_days',
  '3'::jsonb,
  'Self-serve trial length in days for the first shop.'
)
on conflict (key) do nothing;

-- Public pricing page (anon) needs trial + price keys.
drop policy if exists platform_settings_read_billing on public.platform_settings;
create policy platform_settings_read_billing on public.platform_settings
  for select to anon, authenticated
  using (key like 'billing.%' or private.is_super_admin());

create or replace function public.plan_amount_kes(p_code text)
returns numeric
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_amount numeric;
begin
  select amount_kes into v_amount
  from public.subscription_plans
  where code = upper(trim(p_code))
    and is_active = true
  limit 1;

  if v_amount is null then
    if upper(trim(p_code)) = 'SHOP_MONTHLY' then
      return 3000;
    elsif upper(trim(p_code)) = 'COMPLIANCE' then
      return 4500;
    elsif upper(trim(p_code)) = 'SETUP' then
      return 1000;
    end if;
    return 0;
  end if;

  return v_amount;
end;
$$;

revoke all on function public.plan_amount_kes(text) from public, anon;
grant execute on function public.plan_amount_kes(text) to authenticated, service_role, anon;

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
  v_price := public.plan_amount_kes('SHOP_MONTHLY');

  if v_price is null or v_price <= 0 then
    select coalesce((value #>> '{}')::numeric, 3000) into v_price
    from public.platform_settings
    where key = 'billing.shop_price_kes';
  end if;

  select count(*) into v_shops from public.shops where tenant_id = p_tenant_id;

  return greatest(v_shops, 1) * coalesce(v_price, 3000);
end;
$$;

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

revoke all on function public.sync_billing_settings_from_plans() from public, anon;
grant execute on function public.sync_billing_settings_from_plans() to service_role;

create or replace function public.trg_subscription_plans_touch()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.trg_subscription_plans_sync_billing()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    if old.code = 'SHOP_MONTHLY' then
      perform public.sync_billing_settings_from_plans();
    end if;
    return old;
  end if;

  if new.code = 'SHOP_MONTHLY'
     or (tg_op = 'UPDATE' and old.code = 'SHOP_MONTHLY') then
    perform public.sync_billing_settings_from_plans();
  end if;

  return new;
end;
$$;

drop trigger if exists subscription_plans_touch on public.subscription_plans;
create trigger subscription_plans_touch
  before insert or update on public.subscription_plans
  for each row
  execute function public.trg_subscription_plans_touch();

drop trigger if exists subscription_plans_sync_billing on public.subscription_plans;
create trigger subscription_plans_sync_billing
  after insert or update on public.subscription_plans
  for each row
  execute function public.trg_subscription_plans_sync_billing();

drop trigger if exists subscription_plans_sync_billing_del on public.subscription_plans;
create trigger subscription_plans_sync_billing_del
  after delete on public.subscription_plans
  for each row
  execute function public.trg_subscription_plans_sync_billing();

-- Initial sync so platform_settings + subscription rows match seeded plans.
select public.sync_billing_settings_from_plans();
