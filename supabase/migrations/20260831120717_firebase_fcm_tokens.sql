-- Firebase Cloud Messaging tokens alongside legacy Web Push subscriptions.

alter table public.push_subscriptions
  add column if not exists fcm_token text;

alter table public.push_subscriptions
  alter column endpoint drop not null,
  alter column p256dh drop not null,
  alter column auth drop not null;

create unique index if not exists push_subscriptions_fcm_token_uidx
  on public.push_subscriptions (fcm_token)
  where fcm_token is not null;

alter table public.push_subscriptions
  drop constraint if exists push_subscriptions_channel_check;

alter table public.push_subscriptions
  add constraint push_subscriptions_channel_check check (
    (fcm_token is not null)
    or (endpoint is not null and p256dh is not null and auth is not null)
  );

update public.platform_settings
set
  value = '"BMfttKYWrw5QAAj2nbmqf6GQA3MoDF4No1TdpVsKO1Dc9-uQKSwvcjpnQxZuI7EEBFi-zcOu_yXO43BuZblAHU8"'::jsonb,
  description = 'Firebase Web Push VAPID key (URL-safe) for FCM getToken.',
  updated_at = now()
where key = 'push.vapid_public';

insert into public.platform_settings (key, value, description)
values (
  'push.vapid_public',
  '"BMfttKYWrw5QAAj2nbmqf6GQA3MoDF4No1TdpVsKO1Dc9-uQKSwvcjpnQxZuI7EEBFi-zcOu_yXO43BuZblAHU8"'::jsonb,
  'Firebase Web Push VAPID key (URL-safe) for FCM getToken.'
)
on conflict (key) do nothing;
