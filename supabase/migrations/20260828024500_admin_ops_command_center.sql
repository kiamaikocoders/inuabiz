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

create or replace function private.admin_ops_pulse_payload()
returns jsonb
language plpgsql
security definer
set search_path = public, private, cron, net, storage, pg_catalog
as $$
declare
  v_mrr numeric := 0;
  v_active int := 0;
  v_trial int := 0;
  v_past_due int := 0;
  v_suspended int := 0;
  v_conversions int := 0;
  v_db_size bigint := 0;
  v_conns int := 0;
  v_max_conns int := 0;
  v_long_queries int := 0;
  v_storage jsonb := '[]'::jsonb;
  v_http_fail int := 0;
begin
  perform private.assert_super_admin();

  select
    coalesce(mrr_kes, 0),
    coalesce(active_tenants, 0),
    coalesce(trial_tenants, 0),
    coalesce(past_due_tenants, 0),
    coalesce(suspended_tenants, 0),
    coalesce(conversions_this_month, 0)
  into v_mrr, v_active, v_trial, v_past_due, v_suspended, v_conversions
  from public.admin_mrr_snapshot;

  v_db_size := pg_database_size(current_database());
  v_max_conns := current_setting('max_connections')::int;
  select count(*) into v_conns from pg_stat_activity where datname = current_database();
  select count(*) into v_long_queries
  from pg_stat_activity
  where datname = current_database()
    and state = 'active'
    and now() - query_start > interval '8 seconds'
    and pid <> pg_backend_pid();

  begin
    select coalesce(jsonb_agg(jsonb_build_object(
      'bucket', bucket_id,
      'files', files,
      'bytes', bytes
    ) order by bucket_id), '[]'::jsonb)
    into v_storage
    from (
      select
        bucket_id,
        count(*)::int as files,
        coalesce(sum((metadata->>'size')::bigint), 0)::bigint as bytes
      from storage.objects
      group by bucket_id
    ) s;
  exception when others then
    v_storage := '[]'::jsonb;
  end;

  begin
    select count(*) into v_http_fail
    from net._http_response
    where created > now() - interval '24 hours'
      and (status_code >= 400 or error_msg is not null or timed_out is true);
  exception when others then
    v_http_fail := 0;
  end;

  return jsonb_build_object(
    'generated_at', now(),
    'revenue', jsonb_build_object(
      'mrr_kes', v_mrr,
      'arr_kes', v_mrr * 12,
      'arpu_kes', case when v_active > 0 then round(v_mrr / v_active, 2) else 0 end,
      'active_tenants', v_active,
      'trial_tenants', v_trial,
      'past_due_tenants', v_past_due,
      'suspended_tenants', v_suspended,
      'conversions_this_month', v_conversions
    ),
    'db', jsonb_build_object(
      'size_bytes', v_db_size,
      'connections', v_conns,
      'max_connections', v_max_conns,
      'long_queries', v_long_queries
    ),
    'storage', v_storage,
    'cron', coalesce((
      select jsonb_agg(jsonb_build_object(
        'jobid', j.jobid,
        'jobname', j.jobname,
        'schedule', j.schedule,
        'active', j.active,
        'command', j.command,
        'last_status', r.status,
        'last_run', r.start_time,
        'last_end', r.end_time,
        'last_message', r.return_message,
        'runs_24h', coalesce(s.runs_24h, 0),
        'fail_24h', coalesce(s.fail_24h, 0)
      ) order by j.jobid)
      from cron.job j
      left join lateral (
        select status, start_time, end_time, return_message
        from cron.job_run_details d
        where d.jobid = j.jobid
        order by d.start_time desc
        limit 1
      ) r on true
      left join lateral (
        select
          count(*)::int as runs_24h,
          count(*) filter (where status not in ('succeeded', 'running'))::int as fail_24h
        from cron.job_run_details d
        where d.jobid = j.jobid
          and d.start_time > now() - interval '24 hours'
      ) s on true
    ), '[]'::jsonb),
    'usage', jsonb_build_object(
      'email_sent_24h', (select count(*) from public.email_send_log where created_at > now() - interval '24 hours' and status = 'sent'),
      'email_failed_24h', (select count(*) from public.email_send_log where created_at > now() - interval '24 hours' and status <> 'sent'),
      'pending_payments', (select count(*) from public.payment_transactions where status = 'PENDING'),
      'unclaimed', (select count(*) from public.unclaimed_payments where resolved_at is null),
      'ai_spend_month_kes', (
        select coalesce(sum(estimated_cost_kes), 0)
        from public.admin_ai_runs
        where created_at >= date_trunc('month', now())
      ),
      'ai_runs_month', (
        select count(*)
        from public.admin_ai_runs
        where created_at >= date_trunc('month', now())
      ),
      'edge_http_fail_24h', v_http_fail
    ),
    'trials_ending', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', t.id,
        'name', t.name,
        'phone', t.phone,
        'trial_ends_at', t.trial_ends_at,
        'hours_left', round((extract(epoch from (t.trial_ends_at - now())) / 3600)::numeric, 1)
      ) order by t.trial_ends_at)
      from public.tenants t
      where t.status = 'TRIAL'
        and t.trial_ends_at is not null
        and t.trial_ends_at < now() + interval '48 hours'
    ), '[]'::jsonb),
    'events', coalesce((
      select jsonb_agg(ev order by (ev->>'at')::timestamptz desc)
      from (
        (
          select jsonb_build_object(
            'at', n.created_at,
            'kind', 'notification',
            'title', n.title,
            'detail', left(n.message, 180),
            'tenant_id', n.tenant_id,
            'href', case
              when n.type = 'PAYMENT' then '/admin/unclaimed'
              when n.type = 'SUBSCRIPTION' then '/admin/subscriptions'
              else '/admin/notifications'
            end
          ) as ev
          from public.notifications n
          where n.recipient_role = 'SUPER_ADMIN'
          order by n.created_at desc
          limit 20
        )
        union all
        (
          select jsonb_build_object(
            'at', p.created_at,
            'kind', 'payment',
            'title', p.purpose::text || ' ' || p.status::text,
            'detail', coalesce(p.invoice_id::text, p.id::text),
            'tenant_id', p.tenant_id,
            'href', '/admin/unclaimed'
          )
          from public.payment_transactions p
          where p.status in ('FAILED', 'CANCELLED')
             or p.created_at > now() - interval '6 hours'
          order by p.created_at desc
          limit 12
        )
        union all
        (
          select jsonb_build_object(
            'at', t.created_at,
            'kind', 'signup',
            'title', 'New shop: ' || t.name,
            'detail', t.status::text,
            'tenant_id', t.id,
            'href', '/admin/tenants/' || t.id::text
          )
          from public.tenants t
          order by t.created_at desc
          limit 8
        )
      ) q
    ), '[]'::jsonb),
    'dlq', jsonb_build_object(
      'emails', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', l.id,
          'to_email', l.to_email,
          'template_id', l.template_id,
          'subject', l.subject,
          'error', l.error,
          'created_at', l.created_at,
          'metadata', l.metadata
        ) order by l.created_at desc)
        from (
          select * from public.email_send_log
          where status <> 'sent'
          order by created_at desc
          limit 20
        ) l
      ), '[]'::jsonb),
      'payments', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', p.id,
          'purpose', p.purpose,
          'status', p.status,
          'amount', p.amount,
          'invoice_id', p.invoice_id,
          'tenant_id', p.tenant_id,
          'created_at', p.created_at
        ) order by p.created_at desc)
        from (
          select * from public.payment_transactions
          where status in ('FAILED', 'CANCELLED', 'PENDING')
          order by created_at desc
          limit 20
        ) p
      ), '[]'::jsonb),
      'unclaimed', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', u.id,
          'invoice_id', u.invoice_id,
          'amount', u.amount,
          'created_at', u.created_at
        ) order by u.created_at desc)
        from (
          select * from public.unclaimed_payments
          where resolved_at is null
          order by created_at desc
          limit 20
        ) u
      ), '[]'::jsonb)
    ),
    'audit', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', a.id,
        'at', a.created_at,
        'kind', 'ops',
        'action', a.action,
        'label', a.target_label,
        'tenant_id', a.target_tenant_id,
        'admin_id', a.admin_id
      ) order by a.created_at desc)
      from (
        select * from public.admin_ops_audit
        order by created_at desc
        limit 25
      ) a
    ), '[]'::jsonb),
    'ghost', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', g.id,
        'at', g.started_at,
        'kind', 'impersonation',
        'action', 'impersonate',
        'label', t.name,
        'tenant_id', g.target_tenant_id,
        'admin_id', g.admin_id,
        'ended_at', g.ended_at
      ) order by g.started_at desc)
      from (
        select * from public.admin_impersonation_audit
        order by started_at desc
        limit 15
      ) g
      left join public.tenants t on t.id = g.target_tenant_id
    ), '[]'::jsonb),
    'flags', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', f.id,
        'key', f.key,
        'tenant_id', f.tenant_id,
        'enabled', f.enabled,
        'description', f.description,
        'updated_at', f.updated_at
      ) order by f.key, f.tenant_id nulls first)
      from public.platform_feature_flags f
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function private.admin_ops_pulse_payload() from public, anon, authenticated;

create or replace function public.admin_ops_pulse()
returns jsonb
language sql
volatile
security definer
set search_path = public, private
as $$
  select private.admin_ops_pulse_payload();
$$;

revoke all on function public.admin_ops_pulse() from public, anon;
grant execute on function public.admin_ops_pulse() to authenticated;

create or replace function public.admin_retry_cron(p_jobname text)
returns jsonb
language plpgsql
security definer
set search_path = public, private, cron
as $$
declare
  v_cmd text;
  v_id bigint;
begin
  perform private.assert_super_admin();
  select command into v_cmd
  from cron.job
  where jobname = p_jobname
  limit 1;
  if v_cmd is null then
    raise exception 'unknown cron job' using errcode = 'P0002';
  end if;
  if v_cmd !~* '^select[[:space:]]+private\.invoke_edge\(' then
    raise exception 'refusing to run non-edge cron command' using errcode = '42501';
  end if;
  execute v_cmd into v_id;
  perform private.log_admin_ops('retry_cron', null, p_jobname, jsonb_build_object('request_id', v_id));
  return jsonb_build_object('ok', true, 'jobname', p_jobname, 'request_id', v_id);
end;
$$;

revoke all on function public.admin_retry_cron(text) from public, anon;
grant execute on function public.admin_retry_cron(text) to authenticated;

create or replace function public.admin_retry_email(p_log_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_row public.email_send_log%rowtype;
  v_body jsonb;
  v_id bigint;
  v_tenant uuid;
begin
  perform private.assert_super_admin();
  select * into v_row from public.email_send_log where id = p_log_id;
  if not found then
    raise exception 'email log not found' using errcode = 'P0002';
  end if;
  v_tenant := nullif(v_row.metadata->>'tenant_id', '')::uuid;
  v_body := jsonb_strip_nulls(jsonb_build_object(
    'template_id', v_row.template_id,
    'to', v_row.to_email,
    'tenant_id', v_tenant,
    'idempotency_key', 'retry/' || p_log_id::text || '/' || extract(epoch from now())::bigint::text
  ));
  v_id := private.invoke_edge('dispatch-outbound', v_body);
  perform private.log_admin_ops(
    'retry_email',
    v_tenant,
    v_row.template_id,
    jsonb_build_object('log_id', p_log_id, 'to', v_row.to_email, 'request_id', v_id)
  );
  return jsonb_build_object('ok', true, 'request_id', v_id);
end;
$$;

revoke all on function public.admin_retry_email(bigint) from public, anon;
grant execute on function public.admin_retry_email(bigint) to authenticated;

create or replace function public.admin_extend_trial(
  p_tenant_id uuid,
  p_days integer,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_name text;
  v_until timestamptz;
begin
  perform private.assert_super_admin();
  if p_days is null or p_days < 1 or p_days > 90 then
    raise exception 'days must be 1–90' using errcode = '22023';
  end if;
  if coalesce(trim(p_reason), '') = '' then
    raise exception 'reason required' using errcode = '22023';
  end if;

  select name into v_name from public.tenants where id = p_tenant_id;
  if v_name is null then
    raise exception 'tenant not found' using errcode = 'P0002';
  end if;

  update public.tenants
  set
    trial_ends_at = greatest(coalesce(trial_ends_at, now()), now()) + make_interval(days => p_days),
    access_until = greatest(coalesce(access_until, now()), now()) + make_interval(days => p_days),
    status = case when status in ('PAST_DUE', 'SUSPENDED', 'CANCELLED') then 'TRIAL' else status end,
    updated_at = now()
  where id = p_tenant_id
  returning trial_ends_at into v_until;

  update public.subscriptions
  set
    status = case when status in ('PAST_DUE', 'SUSPENDED', 'CANCELLED') then 'TRIAL' else status end,
    current_period_end = v_until,
    updated_at = now()
  where tenant_id = p_tenant_id;

  perform private.log_admin_ops(
    'extend_trial',
    p_tenant_id,
    v_name,
    jsonb_build_object('days', p_days, 'reason', p_reason, 'trial_ends_at', v_until)
  );
  return jsonb_build_object('ok', true, 'trial_ends_at', v_until);
end;
$$;

revoke all on function public.admin_extend_trial(uuid, integer, text) from public, anon;
grant execute on function public.admin_extend_trial(uuid, integer, text) to authenticated;

create or replace function public.admin_override_subscription(
  p_tenant_id uuid,
  p_amount numeric,
  p_plan_code text,
  p_status public.tenant_status,
  p_period_days integer,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_name text;
  v_end timestamptz;
begin
  perform private.assert_super_admin();
  if coalesce(trim(p_reason), '') = '' then
    raise exception 'reason required' using errcode = '22023';
  end if;
  if p_amount is null or p_amount < 0 or p_amount > 1000000 then
    raise exception 'amount out of range' using errcode = '22023';
  end if;
  if p_period_days is not null and (p_period_days < 1 or p_period_days > 366) then
    raise exception 'period days must be 1–366' using errcode = '22023';
  end if;

  select name into v_name from public.tenants where id = p_tenant_id;
  if v_name is null then
    raise exception 'tenant not found' using errcode = 'P0002';
  end if;

  v_end := case
    when p_period_days is not null then now() + make_interval(days => p_period_days)
    else null
  end;

  update public.tenants
  set
    status = coalesce(p_status, status),
    access_until = coalesce(v_end, access_until),
    updated_at = now()
  where id = p_tenant_id;

  update public.subscriptions
  set
    amount = p_amount,
    plan_code = coalesce(nullif(trim(p_plan_code), ''), plan_code),
    status = coalesce(p_status, status),
    current_period_start = case when v_end is not null then now() else current_period_start end,
    current_period_end = coalesce(v_end, current_period_end),
    updated_at = now()
  where tenant_id = p_tenant_id;

  perform private.log_admin_ops(
    'override_subscription',
    p_tenant_id,
    v_name,
    jsonb_build_object(
      'amount', p_amount,
      'plan_code', p_plan_code,
      'status', p_status,
      'period_days', p_period_days,
      'reason', p_reason
    )
  );
  return jsonb_build_object('ok', true, 'access_until', coalesce(v_end, (select access_until from public.tenants where id = p_tenant_id)));
end;
$$;

revoke all on function public.admin_override_subscription(uuid, numeric, text, public.tenant_status, integer, text) from public, anon;
grant execute on function public.admin_override_subscription(uuid, numeric, text, public.tenant_status, integer, text) to authenticated;

create or replace function public.admin_set_feature_flag(
  p_key text,
  p_enabled boolean,
  p_tenant_id uuid default null,
  p_description text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_id uuid;
begin
  perform private.assert_super_admin();
  if coalesce(trim(p_key), '') = '' then
    raise exception 'flag key required' using errcode = '22023';
  end if;

  if p_tenant_id is null then
    insert into public.platform_feature_flags (key, tenant_id, enabled, description, updated_by, updated_at)
    values (p_key, null, p_enabled, p_description, auth.uid(), now())
    on conflict (key) where tenant_id is null
    do update set
      enabled = excluded.enabled,
      description = coalesce(excluded.description, public.platform_feature_flags.description),
      updated_by = auth.uid(),
      updated_at = now()
    returning id into v_id;
  else
    insert into public.platform_feature_flags (key, tenant_id, enabled, description, updated_by, updated_at)
    values (p_key, p_tenant_id, p_enabled, p_description, auth.uid(), now())
    on conflict (tenant_id, key) where tenant_id is not null
    do update set
      enabled = excluded.enabled,
      description = coalesce(excluded.description, public.platform_feature_flags.description),
      updated_by = auth.uid(),
      updated_at = now()
    returning id into v_id;
  end if;

  perform private.log_admin_ops(
    'set_flag',
    p_tenant_id,
    p_key,
    jsonb_build_object('enabled', p_enabled, 'id', v_id)
  );
  return jsonb_build_object('ok', true, 'id', v_id, 'enabled', p_enabled);
end;
$$;

revoke all on function public.admin_set_feature_flag(text, boolean, uuid, text) from public, anon;
grant execute on function public.admin_set_feature_flag(text, boolean, uuid, text) to authenticated;

create or replace function public.admin_purge_tenant(
  p_tenant_id uuid,
  p_confirm_name text,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, storage, auth
as $$
declare
  v_name text;
  v_profiles uuid[];
begin
  perform private.assert_super_admin();
  if coalesce(trim(p_reason), '') = '' then
    raise exception 'reason required' using errcode = '22023';
  end if;

  select name into v_name from public.tenants where id = p_tenant_id;
  if v_name is null then
    raise exception 'tenant not found' using errcode = 'P0002';
  end if;
  if lower(trim(v_name)) <> lower(trim(p_confirm_name)) then
    raise exception 'confirmation name does not match' using errcode = '22023';
  end if;

  select coalesce(array_agg(id), '{}') into v_profiles
  from public.profiles
  where tenant_id = p_tenant_id;

  perform private.log_admin_ops(
    'purge_tenant',
    p_tenant_id,
    v_name,
    jsonb_build_object('reason', p_reason, 'profile_count', coalesce(array_length(v_profiles, 1), 0))
  );

  update public.profiles set active_shop_id = null where tenant_id = p_tenant_id;
  delete from public.admin_impersonation_audit where target_tenant_id = p_tenant_id;
  update public.unclaimed_payments set resolved_tenant_id = null where resolved_tenant_id = p_tenant_id;

  begin
    delete from storage.objects
    where bucket_id = 'business-logos'
      and name like p_tenant_id::text || '/%';
    delete from storage.objects
    where bucket_id = 'profile-avatars'
      and name like any (select u::text || '/%' from unnest(v_profiles) u);
  exception when others then
    null;
  end;

  delete from public.tenants where id = p_tenant_id;

  if coalesce(array_length(v_profiles, 1), 0) > 0 then
    delete from auth.users where id = any (v_profiles);
  end if;

  return jsonb_build_object('ok', true, 'purged', v_name);
end;
$$;

revoke all on function public.admin_purge_tenant(uuid, text, text) from public, anon;
grant execute on function public.admin_purge_tenant(uuid, text, text) to authenticated;
