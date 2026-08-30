-- Close lying notification channels, honor prefs, email receipts, broadcasts, web push.

alter table public.tenants
  add column if not exists email_receipt_enabled boolean not null default false;

alter table public.notification_preferences
  add column if not exists channel_push boolean not null default true;

alter table public.notification_preferences
  alter column channel_sms set default false,
  alter column channel_whatsapp set default false;

update public.notification_preferences
  set channel_sms = false, channel_whatsapp = false
  where channel_sms is distinct from false
     or channel_whatsapp is distinct from false;

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (endpoint)
);

create index if not exists push_subscriptions_profile_id_idx
  on public.push_subscriptions (profile_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists push_subscriptions_self on public.push_subscriptions;
create policy push_subscriptions_self on public.push_subscriptions
  for all to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

grant select, insert, update, delete on public.push_subscriptions to authenticated;
grant all on public.push_subscriptions to service_role;

insert into public.platform_settings (key, value, description)
values (
  'push.vapid_public',
  '"BDj4yvQTLsRnuHf5YiWVlQRhmP1PCwy8DiWAhKK99f6Oe0jelVLL-CjNlaco9tbYnTSxRJmi5IgiAc91PfJMDI0"'::jsonb,
  'Web Push VAPID public key (URL-safe). Private key lives in app_secrets / Edge secrets.'
)
on conflict (key) do update
  set value = excluded.value,
      description = excluded.description,
      updated_at = now();

drop policy if exists platform_settings_read_billing on public.platform_settings;
create policy platform_settings_read_billing on public.platform_settings
  for select to authenticated
  using (
    key like 'billing.%'
    or key = 'push.vapid_public'
    or private.is_super_admin()
  );

create or replace function public.push_vapid_public()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select nullif(trim(both '"' from coalesce(value::text, '')), '')
  from public.platform_settings
  where key = 'push.vapid_public'
  limit 1;
$$;

revoke all on function public.push_vapid_public() from public, anon;
grant execute on function public.push_vapid_public() to authenticated, service_role;
;
