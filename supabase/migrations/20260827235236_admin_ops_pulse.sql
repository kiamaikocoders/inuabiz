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
stable
security definer
set search_path = public, private
as $$
  select private.admin_ops_pulse_payload();
$$;

revoke all on function public.admin_ops_pulse() from public, anon;
grant execute on function public.admin_ops_pulse() to authenticated;
;
