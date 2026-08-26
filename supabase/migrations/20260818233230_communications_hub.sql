-- Communications hub: email templates, send log, provider settings, richer broadcasts

alter table public.platform_broadcasts
  add column if not exists audience text not null default 'all',
  add column if not exists channel text not null default 'banner',
  add column if not exists status text not null default 'draft',
  add column if not exists recipient_count integer not null default 0,
  add column if not exists published_at timestamptz;

alter table public.platform_broadcasts
  drop constraint if exists platform_broadcasts_audience_check;
alter table public.platform_broadcasts
  add constraint platform_broadcasts_audience_check
  check (audience in ('all', 'active', 'trial', 'lapsed'));

alter table public.platform_broadcasts
  drop constraint if exists platform_broadcasts_channel_check;
alter table public.platform_broadcasts
  add constraint platform_broadcasts_channel_check
  check (channel in ('banner', 'banner_email', 'all'));

alter table public.platform_broadcasts
  drop constraint if exists platform_broadcasts_status_check;
alter table public.platform_broadcasts
  add constraint platform_broadcasts_status_check
  check (status in ('draft', 'published', 'scheduled'));

create table if not exists public.communication_templates (
  id text primary key,
  category text not null default 'transactional'
    check (category in ('auth', 'transactional', 'ops')),
  name text not null,
  subject text not null,
  html text not null,
  description text,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null
);

alter table public.communication_templates enable row level security;

drop policy if exists communication_templates_admin on public.communication_templates;
create policy communication_templates_admin on public.communication_templates
  for all to authenticated
  using (private.is_super_admin())
  with check (private.is_super_admin());

grant select, insert, update, delete on public.communication_templates to authenticated;
grant all on public.communication_templates to service_role;

create table if not exists public.email_send_log (
  id bigserial primary key,
  user_id uuid references public.profiles (id) on delete set null,
  to_email text not null,
  template_id text not null,
  subject text not null,
  status text not null default 'sent',
  provider_id text,
  error text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists email_send_log_created_at_idx
  on public.email_send_log (created_at desc);

alter table public.email_send_log enable row level security;

drop policy if exists email_send_log_admin on public.email_send_log;
create policy email_send_log_admin on public.email_send_log
  for all to authenticated
  using (private.is_super_admin())
  with check (private.is_super_admin());

grant select, insert on public.email_send_log to authenticated;
grant usage, select on sequence public.email_send_log_id_seq to authenticated;
grant all on public.email_send_log to service_role;

create table if not exists public.platform_settings (
  key text primary key,
  value jsonb not null,
  description text,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null
);

alter table public.platform_settings enable row level security;

drop policy if exists platform_settings_admin on public.platform_settings;
create policy platform_settings_admin on public.platform_settings
  for all to authenticated
  using (private.is_super_admin())
  with check (private.is_super_admin());

grant select, insert, update, delete on public.platform_settings to authenticated;
grant all on public.platform_settings to service_role;

insert into public.platform_settings (key, value, description) values
  ('email.from_email', '"hello@inuabiz.co.ke"'::jsonb, 'Transactional from-address'),
  ('email.from_name', '"InuaBiz"'::jsonb, 'Transactional from-name'),
  ('email.notifications_enabled', 'true'::jsonb, 'Send transactional and broadcast email')
on conflict (key) do nothing;
