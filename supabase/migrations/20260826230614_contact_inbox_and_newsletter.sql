-- Contact inbox (WYA app_feedback pattern) + newsletter subscribers.
-- Super-admins read/update via RLS; public writes go through Edge Functions (service_role).

alter table public.contact_messages
  add column if not exists status text not null default 'new',
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'contact_messages_status_check'
  ) then
    alter table public.contact_messages
      add constraint contact_messages_status_check
      check (status in ('new', 'read', 'archived'));
  end if;
end $$;

create index if not exists contact_messages_created_at_idx
  on public.contact_messages (created_at desc);
create index if not exists contact_messages_status_idx
  on public.contact_messages (status);

create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  source text not null default 'footer',
  confirmed boolean not null default true,
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (email)
);

alter table public.newsletter_subscribers enable row level security;

drop policy if exists newsletter_subscribers_admin on public.newsletter_subscribers;
create policy newsletter_subscribers_admin on public.newsletter_subscribers
  for all to authenticated
  using (private.is_super_admin())
  with check (private.is_super_admin());

grant select, update, delete on public.newsletter_subscribers to authenticated;
grant all on public.newsletter_subscribers to service_role;
revoke insert on public.newsletter_subscribers from anon, authenticated;

grant select, update, delete on public.contact_messages to authenticated;

create index if not exists newsletter_subscribers_created_at_idx
  on public.newsletter_subscribers (created_at desc);

insert into public.platform_settings (key, value, description)
values (
  'email.ops_inbox',
  '"hello@inuabiz.co.ke"'::jsonb,
  'Where website contact messages are emailed, in addition to SUPER_ADMIN accounts'
)
on conflict (key) do nothing;
