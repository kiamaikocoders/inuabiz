-- USD cash tender: store CBK/manual FX on tenants + sale tender fields.
-- Morning refresh via edge function refresh-fx-rates (cron + on-demand).

alter table public.tenants
  add column if not exists usd_kes_rate numeric(12, 4),
  add column if not exists usd_kes_rate_at timestamptz,
  add column if not exists usd_kes_rate_date date,
  add column if not exists usd_kes_rate_source text;

alter table public.tenants
  drop constraint if exists tenants_usd_kes_rate_source_check;
alter table public.tenants
  add constraint tenants_usd_kes_rate_source_check
  check (usd_kes_rate_source is null or usd_kes_rate_source in ('cbk', 'manual'));

alter table public.sales
  add column if not exists tender_currency text not null default 'KES',
  add column if not exists fx_rate numeric(12, 4),
  add column if not exists foreign_amount numeric(12, 2);

alter table public.sales
  drop constraint if exists sales_tender_currency_check;
alter table public.sales
  add constraint sales_tender_currency_check
  check (tender_currency in ('KES', 'USD'));

comment on column public.tenants.usd_kes_rate is
  'KES per 1 USD used at the till. Source cbk (Frankfurter/CBK) or manual override.';
comment on column public.sales.tender_currency is
  'Currency the customer handed over. Sale total remains KES.';
comment on column public.sales.fx_rate is
  'KES per 1 unit of tender_currency at payment time.';
comment on column public.sales.foreign_amount is
  'Amount received in tender_currency (e.g. USD notes).';

insert into public.platform_settings (key, value, description)
values
  ('fx.usd_kes', '0'::jsonb, 'Latest USD→KES mid rate (CBK via Frankfurter)'),
  ('fx.usd_kes_date', '""'::jsonb, 'FX rate value date'),
  ('fx.usd_kes_fetched_at', '""'::jsonb, 'When FX rate was last pulled'),
  ('fx.usd_kes_source', '"cbk"'::jsonb, 'cbk | manual')
on conflict (key) do nothing;

-- Vendors need the platform FX quote when their tenant has no rate yet.
drop policy if exists platform_settings_read_billing on public.platform_settings;
create policy platform_settings_read_billing on public.platform_settings
  for select to authenticated
  using (
    key like 'billing.%'
    or key like 'fx.%'
    or key = 'push.vapid_public'
    or private.is_super_admin()
  );

do $$
begin
  perform cron.unschedule('refresh-fx-rates');
exception
  when others then null;
end $$;

-- Morning CBK pull ~06:00 Africa/Nairobi (03:00 UTC)
select cron.schedule(
  'refresh-fx-rates',
  '0 3 * * *',
  $$select private.invoke_edge('refresh-fx-rates', '{"job":"daily"}'::jsonb)$$
);
