-- Leads captured by the public landing-page AI assistant.

create table public.landing_bot_leads (
  id uuid primary key default gen_random_uuid(),
  business_name text,
  phone_number text,
  location text,
  business_type text,
  payment_method_used text,
  chat_summary text,
  lead_status text not null default 'new'
    check (lead_status in ('new', 'contacted', 'converted')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index landing_bot_leads_status_idx on public.landing_bot_leads (lead_status, created_at desc);
create index landing_bot_leads_phone_idx on public.landing_bot_leads (phone_number)
  where phone_number is not null;

alter table public.landing_bot_leads enable row level security;

create policy landing_bot_leads_admin on public.landing_bot_leads
  for select to authenticated
  using (private.is_super_admin());

grant select on public.landing_bot_leads to authenticated;
grant all on public.landing_bot_leads to service_role;
revoke insert, update, delete on public.landing_bot_leads from anon, authenticated;

comment on table public.landing_bot_leads is
  'Merchant leads from the public landing AI bot. Inserts via landing-bot-chat Edge Function.';
