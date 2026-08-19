-- Platform-operator AI run log (super-admin only).
-- Vendor shop insights stay in public.ai_insights (tenant-scoped).

create table public.admin_ai_runs (
  id uuid primary key default gen_random_uuid(),
  run_type text not null check (run_type in (
    'briefing', 'churn', 'unclaimed', 'broadcast', 'tenant_brief', 'chat'
  )),
  input jsonb not null default '{}'::jsonb,
  output jsonb not null default '{}'::jsonb,
  model text,
  prompt_tokens integer,
  completion_tokens integer,
  estimated_cost_kes numeric(12, 4) not null default 0,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create index admin_ai_runs_created_at_idx on public.admin_ai_runs (created_at desc);
create index admin_ai_runs_type_idx on public.admin_ai_runs (run_type, created_at desc);

alter table public.admin_ai_runs enable row level security;

create policy admin_ai_runs_admin on public.admin_ai_runs
  for all
  using (private.is_super_admin())
  with check (private.is_super_admin());

grant select, insert on public.admin_ai_runs to authenticated;
