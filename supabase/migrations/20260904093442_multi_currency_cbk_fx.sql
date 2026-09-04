-- Multi-currency CBK FX: platform rates, tenant enablement, currency requests.
-- Books stay in KES. USD is the default foreign tender; other codes need admin approval.
-- Shop-side manual rate overrides are retired (rates come from CBK only).

create table if not exists public.fx_rates (
  currency text primary key check (currency ~ '^[A-Z]{3}$' and currency <> 'KES'),
  kes_per_unit numeric(14, 6) not null check (kes_per_unit > 0),
  rate_date date,
  fetched_at timestamptz not null default now(),
  source text not null default 'cbk' check (source = 'cbk'),
  name text
);

comment on table public.fx_rates is
  'CBK-sourced foreign→KES mid rates (KES per 1 unit of currency). Refreshed by refresh-fx-rates.';

alter table public.fx_rates enable row level security;

drop policy if exists fx_rates_read on public.fx_rates;
create policy fx_rates_read on public.fx_rates
  for select to authenticated
  using (true);

grant select on public.fx_rates to authenticated;
grant all on public.fx_rates to service_role;

create table if not exists public.tenant_currencies (
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  currency text not null check (currency ~ '^[A-Z]{3}$' and currency <> 'KES'),
  enabled boolean not null default true,
  enabled_at timestamptz not null default now(),
  enabled_by uuid references public.profiles (id) on delete set null,
  primary key (tenant_id, currency)
);

comment on table public.tenant_currencies is
  'Foreign cash tenders enabled for a shop. USD is auto-enabled; others via admin approval.';

alter table public.tenant_currencies enable row level security;

drop policy if exists tenant_currencies_select on public.tenant_currencies;
create policy tenant_currencies_select on public.tenant_currencies
  for select to authenticated
  using (tenant_id = private.current_tenant_id() or private.is_super_admin());

drop policy if exists tenant_currencies_admin on public.tenant_currencies;
create policy tenant_currencies_admin on public.tenant_currencies
  for all to authenticated
  using (private.is_super_admin())
  with check (private.is_super_admin());

grant select on public.tenant_currencies to authenticated;
grant all on public.tenant_currencies to service_role;

-- Ensure every existing tenant can take USD cash.
insert into public.tenant_currencies (tenant_id, currency, enabled)
select id, 'USD', true
from public.tenants
on conflict (tenant_id, currency) do nothing;

create or replace function private.ensure_tenant_usd_currency()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.tenant_currencies (tenant_id, currency, enabled)
  values (new.id, 'USD', true)
  on conflict (tenant_id, currency) do nothing;
  return new;
end;
$$;

drop trigger if exists tenants_ensure_usd_currency on public.tenants;
create trigger tenants_ensure_usd_currency
  after insert on public.tenants
  for each row
  execute function private.ensure_tenant_usd_currency();

create table if not exists public.currency_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  currency text not null check (currency ~ '^[A-Z]{3}$' and currency <> 'KES'),
  message text not null default '',
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  admin_note text
);

create unique index if not exists currency_requests_one_pending
  on public.currency_requests (tenant_id, currency)
  where status = 'pending';

create index if not exists currency_requests_status_idx
  on public.currency_requests (status, created_at desc);

alter table public.currency_requests enable row level security;

drop policy if exists currency_requests_select on public.currency_requests;
create policy currency_requests_select on public.currency_requests
  for select to authenticated
  using (tenant_id = private.current_tenant_id() or private.is_super_admin());

drop policy if exists currency_requests_insert on public.currency_requests;
create policy currency_requests_insert on public.currency_requests
  for insert to authenticated
  with check (
    tenant_id = private.current_tenant_id()
    and created_by = auth.uid()
    and status = 'pending'
  );

drop policy if exists currency_requests_admin on public.currency_requests;
create policy currency_requests_admin on public.currency_requests
  for update to authenticated
  using (private.is_super_admin())
  with check (private.is_super_admin());

grant select, insert on public.currency_requests to authenticated;
grant update on public.currency_requests to authenticated;
grant all on public.currency_requests to service_role;

-- Sales may tender any ISO currency code (still ledgered in KES).
alter table public.sales drop constraint if exists sales_tender_currency_check;
alter table public.sales
  add constraint sales_tender_currency_check
  check (tender_currency ~ '^[A-Z]{3}$');

-- Retire shop-side manual FX overrides; CBK is the only source.
alter table public.tenants drop constraint if exists tenants_usd_kes_rate_source_check;
alter table public.tenants
  add constraint tenants_usd_kes_rate_source_check
  check (usd_kes_rate_source is null or usd_kes_rate_source = 'cbk');

update public.tenants
set usd_kes_rate_source = 'cbk'
where usd_kes_rate_source = 'manual';

-- Seed USD row from legacy platform_settings if present.
do $$
declare
  v_rate numeric;
  v_date date;
  v_fetched timestamptz;
begin
  select nullif(trim(both '"' from value::text), '')::numeric
    into v_rate
  from public.platform_settings
  where key = 'fx.usd_kes'
  limit 1;

  if v_rate is null or v_rate <= 0 then
    return;
  end if;

  begin
    select nullif(trim(both '"' from value::text), '')::date
      into v_date
    from public.platform_settings
    where key = 'fx.usd_kes_date'
    limit 1;
  exception when others then
    v_date := null;
  end;

  begin
    select nullif(trim(both '"' from value::text), '')::timestamptz
      into v_fetched
    from public.platform_settings
    where key = 'fx.usd_kes_fetched_at'
    limit 1;
  exception when others then
    v_fetched := now();
  end;

  insert into public.fx_rates (currency, kes_per_unit, rate_date, fetched_at, source, name)
  values ('USD', v_rate, v_date, coalesce(v_fetched, now()), 'cbk', 'US Dollar')
  on conflict (currency) do update
    set kes_per_unit = excluded.kes_per_unit,
        rate_date = coalesce(excluded.rate_date, public.fx_rates.rate_date),
        fetched_at = excluded.fetched_at;
end $$;
