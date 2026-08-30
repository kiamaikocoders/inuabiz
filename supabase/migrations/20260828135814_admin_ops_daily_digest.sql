-- Daily super-admin ops digest: recipient, snapshot RPC, branded template.

insert into public.platform_settings (key, value, description)
values (
  'email.ops_digest',
  '"komuzack@gmail.com"'::jsonb,
  'Daily command-center digest recipient, in addition to SUPER_ADMIN Auth emails'
)
on conflict (key) do update
set
  value = excluded.value,
  description = excluded.description,
  updated_at = now();

create or replace function public.admin_ops_digest_snapshot()
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, private, cron, pg_catalog
as $$
declare
  v_mrr numeric := 0;
  v_active int := 0;
  v_trial int := 0;
  v_past_due int := 0;
  v_suspended int := 0;
  v_conversions int := 0;
  v_cron jsonb := '[]'::jsonb;
begin
  if auth.role() is distinct from 'service_role' then
    perform private.assert_super_admin();
  end if;

  select
    coalesce(mrr_kes, 0),
    coalesce(active_tenants, 0),
    coalesce(trial_tenants, 0),
    coalesce(past_due_tenants, 0),
    coalesce(suspended_tenants, 0),
    coalesce(conversions_this_month, 0)
  into v_mrr, v_active, v_trial, v_past_due, v_suspended, v_conversions
  from public.admin_mrr_snapshot;

  begin
    select coalesce(jsonb_agg(jsonb_build_object(
      'jobname', j.jobname,
      'last_status', r.status,
      'fail_24h', coalesce(s.fail_24h, 0)
    ) order by j.jobname), '[]'::jsonb)
    into v_cron
    from cron.job j
    left join lateral (
      select status
      from cron.job_run_details d
      where d.jobid = j.jobid
      order by d.start_time desc
      limit 1
    ) r on true
    left join lateral (
      select count(*) filter (
        where status not in ('succeeded', 'running')
      )::int as fail_24h
      from cron.job_run_details d
      where d.jobid = j.jobid
        and d.start_time > now() - interval '24 hours'
    ) s on true;
  exception when others then
    v_cron := '[]'::jsonb;
  end;

  return jsonb_build_object(
    'mrr_kes', v_mrr,
    'arpu_kes', case when v_active > 0 then round(v_mrr / v_active, 2) else 0 end,
    'active_tenants', v_active,
    'trial_tenants', v_trial,
    'past_due_tenants', v_past_due,
    'suspended_tenants', v_suspended,
    'conversions_this_month', v_conversions,
    'email_sent_24h', (
      select count(*) from public.email_send_log
      where created_at > now() - interval '24 hours' and status = 'sent'
    ),
    'email_failed_24h', (
      select count(*) from public.email_send_log
      where created_at > now() - interval '24 hours' and status <> 'sent'
    ),
    'pending_payments', (
      select count(*) from public.payment_transactions where status = 'PENDING'
    ),
    'unclaimed', (
      select count(*) from public.unclaimed_payments where resolved_at is null
    ),
    'cron', v_cron,
    'trials_ending', coalesce((
      select jsonb_agg(jsonb_build_object(
        'name', t.name,
        'hours_left', round((extract(epoch from (t.trial_ends_at - now())) / 3600)::numeric, 1)
      ) order by t.trial_ends_at)
      from public.tenants t
      where t.status = 'TRIAL'
        and t.trial_ends_at is not null
        and t.trial_ends_at < now() + interval '48 hours'
    ), '[]'::jsonb)
  );
end;
$$;

comment on function public.admin_ops_digest_snapshot() is
  'Compact command-center snapshot for the daily super-admin digest. Super-admin or service_role only.';

revoke all on function public.admin_ops_digest_snapshot() from public, anon;
grant execute on function public.admin_ops_digest_snapshot() to authenticated, service_role;;
