-- Super-admin ops command center: cron visibility, audit, flags, lifecycle overrides.

create or replace function private.assert_super_admin()
returns void
language plpgsql
stable
security definer
set search_path = public, private
as $$
begin
  if not private.is_super_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
end;
$$;

revoke all on function private.assert_super_admin() from public, anon, authenticated;

create table if not exists public.admin_ops_audit (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references public.profiles (id) on delete set null,
  action text not null,
  target_tenant_id uuid,
  target_label text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_ops_audit_created_at_idx
  on public.admin_ops_audit (created_at desc);

comment on table public.admin_ops_audit is
  'Append-only super-admin actions. target_tenant_id is not FK so GDPR purge can remove the tenant.';

alter table public.admin_ops_audit enable row level security;

drop policy if exists admin_ops_audit_admin_select on public.admin_ops_audit;
create policy admin_ops_audit_admin_select on public.admin_ops_audit
  for select to authenticated
  using (private.is_super_admin());

drop policy if exists admin_ops_audit_admin_insert on public.admin_ops_audit;
create policy admin_ops_audit_admin_insert on public.admin_ops_audit
  for insert to authenticated
  with check (private.is_super_admin() and admin_id = auth.uid());

grant select, insert on public.admin_ops_audit to authenticated;
grant all on public.admin_ops_audit to service_role;
revoke update, delete on public.admin_ops_audit from authenticated, anon;

create table if not exists public.platform_feature_flags (
  id uuid primary key default gen_random_uuid(),
  key text not null,
  tenant_id uuid references public.tenants (id) on delete cascade,
  enabled boolean not null default true,
  description text,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null
);

create unique index if not exists platform_feature_flags_global_key
  on public.platform_feature_flags (key)
  where tenant_id is null;

create unique index if not exists platform_feature_flags_tenant_key
  on public.platform_feature_flags (tenant_id, key)
  where tenant_id is not null;

alter table public.platform_feature_flags enable row level security;

drop policy if exists platform_feature_flags_read on public.platform_feature_flags;
create policy platform_feature_flags_read on public.platform_feature_flags
  for select to authenticated
  using (
    tenant_id is null
    or tenant_id = private.current_tenant_id()
    or private.is_super_admin()
  );

drop policy if exists platform_feature_flags_admin on public.platform_feature_flags;
create policy platform_feature_flags_admin on public.platform_feature_flags
  for all to authenticated
  using (private.is_super_admin())
  with check (private.is_super_admin());

grant select on public.platform_feature_flags to authenticated;
grant insert, update, delete on public.platform_feature_flags to authenticated;
grant all on public.platform_feature_flags to service_role;

insert into public.platform_feature_flags (key, enabled, description)
values
  ('extra_shops', true, 'Vendors can add extra shops at the shop monthly rate'),
  ('bill_manager', true, 'M-Pesa Bill Manager e-invoices'),
  ('ratiba', true, 'M-Pesa Ratiba auto-debit'),
  ('companion_apk', true, 'Sideloaded companion APK'),
  ('admin_ai', true, 'Super-admin copilot'),
  ('beta_kitchen', false, 'Kitchen / floor tickets beta')
on conflict (key) where tenant_id is null do nothing;

create or replace function private.log_admin_ops(
  p_action text,
  p_tenant uuid default null,
  p_label text default null,
  p_payload jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public, private
as $$
begin
  insert into public.admin_ops_audit (admin_id, action, target_tenant_id, target_label, payload)
  values (auth.uid(), p_action, p_tenant, p_label, coalesce(p_payload, '{}'::jsonb));
end;
$$;

revoke all on function private.log_admin_ops(text, uuid, text, jsonb) from public, anon, authenticated;

create or replace function public.feature_enabled(p_key text, p_tenant_id uuid default null)
returns boolean
language plpgsql
stable
security definer
set search_path = public, private
as $$
declare
  v_tenant uuid;
  v_enabled boolean;
begin
  v_tenant := coalesce(p_tenant_id, private.current_tenant_id());
  if v_tenant is not null then
    select enabled into v_enabled
    from public.platform_feature_flags
    where key = p_key and tenant_id = v_tenant
    limit 1;
    if found then
      return v_enabled;
    end if;
  end if;
  select enabled into v_enabled
  from public.platform_feature_flags
  where key = p_key and tenant_id is null
  limit 1;
  return coalesce(v_enabled, true);
end;
$$;

revoke all on function public.feature_enabled(text, uuid) from public, anon;
grant execute on function public.feature_enabled(text, uuid) to authenticated, service_role;
;
