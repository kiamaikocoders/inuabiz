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
grant execute on function public.admin_ops_digest_snapshot() to authenticated, service_role;

insert into public.communication_templates (id, category, name, subject, html, description)
values (
  'ops-digest',
  'ops',
  'Super-admin ops digest',
  'Ops digest · {{ .day }} · {{ .mrr }} MRR',
  $html$<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>InuaBiz</title>
</head>
<body style="margin:0;padding:0;background:#F7F4EF;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F7F4EF;">
    <tr>
      <td align="center" style="padding:20px 12px;">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
          <tr>
            <td align="center" style="padding:0 0 14px 0;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td valign="middle" style="padding-right:10px;">
                    <img src="https://inuabiz.co.ke/emails/inuabiz-logo.png" alt="InuaBiz" width="40" height="40" style="display:block;border:0;width:40px;height:40px;border-radius:10px;" />
                  </td>
                  <td valign="middle" style="font-family:Arial,sans-serif;font-size:20px;font-weight:800;color:#121816;letter-spacing:-0.02em;">Inua<span style="color:#F4A261;">Biz</span></td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 0 14px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0B6E4F;border-radius:12px;">
                <tr>
                  <td align="center" valign="middle" height="180" style="height:180px;background:#0B6E4F;background-image:linear-gradient(135deg,#0B6E4F,#053828);border-radius:12px;">
                    <img src="https://inuabiz.co.ke/emails/inuabiz-logo.png" alt="" width="72" height="72" style="display:block;border:0;width:72px;height:72px;border-radius:18px;" />
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 0 14px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F0EDE8;border-radius:12px;">
                <tr><td style="padding:20px;">
                  <span style="display:inline-block;background:#121816;color:#F7F4EF;font-family:Arial,sans-serif;font-size:11px;font-weight:700;padding:4px 12px;border-radius:999px;letter-spacing:0.04em;">OPS</span>
                  <p style="margin:10px 0 0 0;font-family:Arial,sans-serif;font-size:30px;line-height:36px;font-weight:800;color:#121816;">{{ .day }}</p>
                  <p style="margin:0;font-family:Arial,sans-serif;font-size:30px;line-height:36px;font-weight:800;color:#F4A261;">ops digest.</p>
                  <p style="margin:10px 0 0 0;font-family:Arial,sans-serif;font-size:14px;line-height:20px;color:#66736B;">{{ .mrr }} MRR · {{ .active }} paying shops</p>
                </td></tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 0 14px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:12px;">
                <tr><td style="padding:24px;">
                  <p style="margin:0 0 16px 0;font-family:Arial,sans-serif;font-size:16px;line-height:25px;font-weight:700;color:#121816;">Hello Zack,</p>
                  <p style="margin:0 0 16px 0;font-family:Arial,sans-serif;font-size:14px;line-height:22px;color:#66736B;">Live command-center snapshot. Cron: {{ .cron_line }}. Queues: {{ .dlq_line }}. Trials in 48h: {{ .trials_line }}.</p>
                  
                  
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;background:#F0EDE8;border-radius:10px;">
      <tr><td style="padding:16px;">
        <p style="margin:0 0 10px 0;font-family:Arial,sans-serif;font-size:12px;font-weight:700;color:#F4A261;letter-spacing:0.04em;">DETAILS</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:12px;color:#66736B;width:120px;vertical-align:top;">MRR</td>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:13px;color:#121816;font-weight:600;">{{ .mrr }}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:12px;color:#66736B;width:120px;vertical-align:top;">ARPU</td>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:13px;color:#121816;font-weight:600;">{{ .arpu }}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:12px;color:#66736B;width:120px;vertical-align:top;">Paying / trial</td>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:13px;color:#121816;font-weight:600;">{{ .active }} / {{ .trials }}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:12px;color:#66736B;width:120px;vertical-align:top;">Past due</td>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:13px;color:#121816;font-weight:600;">{{ .past_due }}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:12px;color:#66736B;width:120px;vertical-align:top;">Mail 24h</td>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:13px;color:#121816;font-weight:600;">{{ .emails_24h }}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:12px;color:#66736B;width:120px;vertical-align:top;">Unclaimed</td>
          <td style="padding:6px 0;font-family:Arial,sans-serif;font-size:13px;color:#121816;font-weight:600;">{{ .unclaimed }}</td>
        </tr></table>
      </td></tr>
    </table>
                  
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;">
        <tr>
          <td align="center" style="background:#121816;border-radius:999px;">
            <a href="https://inuabiz.co.ke/admin/health" style="display:block;padding:12px 32px;font-family:Arial,sans-serif;font-size:16px;font-weight:700;color:#F7F4EF;text-decoration:none;">Open command center</a>
          </td>
        </tr>
      </table>
                  
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F0EDE8;border-radius:10px;">
        <tr><td style="padding:16px;">
          <p style="margin:0 0 8px 0;font-family:Arial,sans-serif;font-size:12px;font-weight:700;color:#F4A261;">INTERNAL ONLY</p>
          <p style="margin:0;font-family:Arial,sans-serif;font-size:12px;line-height:18px;color:#66736B;">This goes to the super-admin ops inbox, not vendors. Change the address under Admin → Communications → Provider.</p>
        </td></tr>
      </table>
                </td></tr>
              </table>
            </td>
          </tr>
          <tr>
            <td>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F0EDE8;border-radius:12px;">
                <tr><td style="padding:16px;text-align:center;">
                  <p style="margin:0 0 6px 0;font-family:Arial,sans-serif;font-size:11px;color:#66736B;">
                    <a href="https://inuabiz.co.ke/contact" style="color:#66736B;text-decoration:none;">Support</a>
                    ·
                    <a href="https://inuabiz.co.ke/privacy" style="color:#66736B;text-decoration:none;">Privacy</a>
                    ·
                    <a href="https://inuabiz.co.ke/terms" style="color:#66736B;text-decoration:none;">Terms</a>
                  </p>
                  <p style="margin:0;font-family:Arial,sans-serif;font-size:11px;color:#66736B;">© 2026 InuaBiz Kenya. All rights reserved.</p>
                </td></tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>$html$,
  'Daily command-center snapshot to the super-admin ops inbox (06:00 EAT).'
)
on conflict (id) do update set
  category = excluded.category,
  name = excluded.name,
  subject = excluded.subject,
  html = excluded.html,
  description = excluded.description,
  updated_at = now();
