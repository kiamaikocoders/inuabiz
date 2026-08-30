-- Idempotent ledger for offline client operations (POS / inventory / credit sync).
create table if not exists public.offline_client_ops (
  client_op_id uuid primary key,
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  op_type text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'applied'
    check (status in ('applied', 'conflict', 'needs_online', 'failed', 'skipped')),
  result jsonb,
  conflict_code text,
  created_at timestamptz not null default now(),
  applied_at timestamptz not null default now()
);

create index if not exists offline_client_ops_tenant_created_idx
  on public.offline_client_ops (tenant_id, created_at desc);

alter table public.offline_client_ops enable row level security;

drop policy if exists offline_client_ops_select_tenant on public.offline_client_ops;
create policy offline_client_ops_select_tenant
  on public.offline_client_ops
  for select
  to authenticated
  using (
    tenant_id = (select tenant_id from public.profiles where id = auth.uid())
  );

grant select on public.offline_client_ops to authenticated;
grant all on public.offline_client_ops to service_role;

comment on table public.offline_client_ops is
  'Idempotency log for sync-offline-batch (client_op_id = UUID from the till).';;
