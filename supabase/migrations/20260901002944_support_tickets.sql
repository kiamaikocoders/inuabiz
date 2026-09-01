-- Merchant support desk (distinct from shop_tickets kitchen/service queue).
-- Vendors create via Edge Functions; super-admins manage the full desk.

create table public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  created_by uuid references public.profiles (id) on delete set null,
  subject text not null,
  category text not null default 'other'
    check (category in ('payment', 'pos_hardware', 'inventory', 'billing', 'other')),
  priority text not null default 'medium'
    check (priority in ('low', 'medium', 'high', 'urgent')),
  status text not null default 'open'
    check (status in ('open', 'in_progress', 'ai_handling', 'resolved', 'closed')),
  ai_summary text,
  context jsonb not null default '{}'::jsonb,
  assigned_to uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index support_tickets_tenant_id_idx on public.support_tickets (tenant_id);
create index support_tickets_status_idx on public.support_tickets (status);
create index support_tickets_priority_idx on public.support_tickets (priority);
create index support_tickets_created_at_idx on public.support_tickets (created_at desc);

create table public.support_ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets (id) on delete cascade,
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  sender_type text not null check (sender_type in ('vendor', 'admin', 'ai_assistant')),
  sender_id uuid references public.profiles (id) on delete set null,
  message text not null,
  attachments jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index support_ticket_messages_ticket_idx
  on public.support_ticket_messages (ticket_id, created_at);

create table public.support_ticket_internal_notes (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets (id) on delete cascade,
  admin_id uuid references public.profiles (id) on delete set null,
  note text not null,
  created_at timestamptz not null default now()
);

create index support_ticket_internal_notes_ticket_idx
  on public.support_ticket_internal_notes (ticket_id, created_at desc);

create trigger support_tickets_updated_at
  before update on public.support_tickets
  for each row execute function private.touch_updated_at();

alter table public.support_tickets enable row level security;
alter table public.support_ticket_messages enable row level security;
alter table public.support_ticket_internal_notes enable row level security;

-- Vendors read own tenant tickets; super-admins read all.
create policy support_tickets_select on public.support_tickets
  for select to authenticated
  using (tenant_id = private.current_tenant_id() or private.is_super_admin());

-- Super-admins update assignment, status, triage fields.
create policy support_tickets_admin_write on public.support_tickets
  for update to authenticated
  using (private.is_super_admin())
  with check (private.is_super_admin());

create policy support_ticket_messages_select on public.support_ticket_messages
  for select to authenticated
  using (tenant_id = private.current_tenant_id() or private.is_super_admin());

create policy support_ticket_notes_admin on public.support_ticket_internal_notes
  for all to authenticated
  using (private.is_super_admin())
  with check (private.is_super_admin());

grant select on public.support_tickets to authenticated;
grant update on public.support_tickets to authenticated;
grant select on public.support_ticket_messages to authenticated;
grant select, insert, update, delete on public.support_ticket_internal_notes to authenticated;
grant all on public.support_tickets to service_role;
grant all on public.support_ticket_messages to service_role;
grant all on public.support_ticket_internal_notes to service_role;
revoke insert, delete on public.support_tickets from anon, authenticated;
revoke insert, update, delete on public.support_ticket_messages from anon, authenticated;

do $$
begin
  alter publication supabase_realtime add table public.support_tickets;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.support_ticket_messages;
exception when duplicate_object then null;
end $$;

comment on table public.support_tickets is
  'Merchant helpdesk tickets. Created via create-support-ticket Edge Function.';
comment on table public.support_ticket_messages is
  'Vendor, admin and AI assistant chat thread for a support ticket.';
comment on table public.support_ticket_internal_notes is
  'Super-admin only triage notes — invisible to vendors.';
