-- Product intelligence: event sink + admin funnel RPC

create table if not exists public.product_events (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  name text not null,
  path text,
  session_hash text,
  props jsonb not null default '{}'::jsonb
);

create index if not exists product_events_created_at_idx
  on public.product_events (created_at desc);
create index if not exists product_events_name_created_idx
  on public.product_events (name, created_at desc);
create index if not exists product_events_path_created_idx
  on public.product_events (path, created_at desc)
  where path is not null;

comment on table public.product_events is
  'Anonymous product analytics events (pageviews, signup, onboarding). Insert via edge function only.';

alter table public.product_events enable row level security;

-- No direct client policies — service role inserts; super-admin reads via RPC.

create or replace function private.admin_product_intelligence_payload(p_days integer default 30)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_catalog
as $$
declare
  v_days int := greatest(1, least(coalesce(p_days, 30), 90));
  v_since timestamptz := now() - make_interval(days => v_days);
  v_signed_up int := 0;
  v_onboarding int := 0;
  v_completed int := 0;
  v_activated int := 0;
  v_email_fail int := 0;
  v_pay_fail int := 0;
  v_pageviews jsonb := '[]'::jsonb;
  v_event_counts jsonb := '[]'::jsonb;
  v_cohorts jsonb := '[]'::jsonb;
  v_issues jsonb := '[]'::jsonb;
  v_lost int := 0;
  v_final_pct numeric := 0;
begin
  perform private.assert_super_admin();

  -- Vendors who signed up in window (exclude super admins)
  select count(*)::int into v_signed_up
  from public.profiles p
  where p.role <> 'SUPER_ADMIN'
    and p.created_at >= v_since;

  -- Started onboarding: pending shop or tenant not yet completed
  select count(*)::int into v_onboarding
  from public.profiles p
  where p.role <> 'SUPER_ADMIN'
    and p.created_at >= v_since
    and (
      nullif(trim(coalesce(p.pending_shop_name, '')), '') is not null
      or p.onboarding_completed_at is not null
      or p.tenant_id is not null
    );

  select count(*)::int into v_completed
  from public.profiles p
  where p.role <> 'SUPER_ADMIN'
    and p.created_at >= v_since
    and p.onboarding_completed_at is not null
    and p.tenant_id is not null;

  -- Activated: completed onboarding + at least one sale on their tenant
  select count(*)::int into v_activated
  from public.profiles p
  where p.role <> 'SUPER_ADMIN'
    and p.created_at >= v_since
    and p.onboarding_completed_at is not null
    and p.tenant_id is not null
    and exists (
      select 1 from public.sales s
      where s.tenant_id = p.tenant_id
      limit 1
    );

  select count(*)::int into v_email_fail
  from public.email_send_log e
  where e.created_at >= v_since
    and e.status <> 'sent';

  begin
    select count(*)::int into v_pay_fail
    from public.payment_transactions t
    where t.created_at >= v_since
      and t.status in ('FAILED', 'CANCELLED');
  exception when others then
    v_pay_fail := 0;
  end;

  v_lost := v_email_fail + v_pay_fail;
  v_final_pct := case when v_signed_up > 0
    then round((v_activated::numeric / v_signed_up::numeric) * 100, 1)
    else 0 end;

  select coalesce(jsonb_agg(row_to_json(x)::jsonb), '[]'::jsonb)
  into v_pageviews
  from (
    select
      coalesce(nullif(path, ''), '(unknown)') as path,
      count(*)::int as views
    from public.product_events
    where created_at >= v_since
      and name = 'page_view'
    group by 1
    order by views desc
    limit 12
  ) x;

  select coalesce(jsonb_agg(row_to_json(x)::jsonb), '[]'::jsonb)
  into v_event_counts
  from (
    select name, count(*)::int as count
    from public.product_events
    where created_at >= v_since
    group by name
    order by count desc
    limit 20
  ) x;

  select coalesce(jsonb_agg(row_to_json(c)::jsonb order by c.week_start desc), '[]'::jsonb)
  into v_cohorts
  from (
    select
      date_trunc('week', p.created_at)::date as week_start,
      count(*)::int as signed_up,
      count(*) filter (where p.onboarding_completed_at is not null)::int as completed,
      count(*) filter (
        where p.onboarding_completed_at is not null
          and p.tenant_id is not null
          and exists (select 1 from public.sales s where s.tenant_id = p.tenant_id limit 1)
      )::int as activated,
      count(*) filter (
        where p.tenant_id is not null
          and exists (
            select 1 from public.tenants t
            where t.id = p.tenant_id
              and t.status in ('ACTIVE', 'TRIAL')
          )
      )::int as retained
    from public.profiles p
    where p.role <> 'SUPER_ADMIN'
      and p.created_at >= now() - interval '12 weeks'
    group by 1
    order by 1 desc
    limit 8
  ) c;

  select coalesce(jsonb_agg(row_to_json(i)::jsonb), '[]'::jsonb)
  into v_issues
  from (
    select * from (
      select
        e.created_at as at,
        'email_dlq'::text as kind,
        ('Email failed: ' || coalesce(e.template_id, 'unknown'))::text as title,
        left(coalesce(e.error, e.to_email), 160) as detail,
        '/admin/health'::text as href
      from public.email_send_log e
      where e.created_at >= v_since and e.status <> 'sent'
      order by e.created_at desc
      limit 8
    ) emails
    union all
    select * from (
      select
        t.created_at as at,
        'payment_fail'::text as kind,
        ('Payment ' || t.status::text)::text as title,
        left(coalesce(t.purpose::text, t.id::text), 160) as detail,
        '/admin/unclaimed'::text as href
      from public.payment_transactions t
      where t.created_at >= v_since
        and t.status in ('FAILED', 'CANCELLED')
      order by t.created_at desc
      limit 8
    ) pays
    order by at desc
    limit 12
  ) i;

  return jsonb_build_object(
    'generated_at', now(),
    'window_days', v_days,
    'kpis', jsonb_build_object(
      'final_conversion_pct', v_final_pct,
      'successful_signups', v_activated,
      'lost_to_issues', v_lost,
      'stuck_in_onboarding', greatest(v_signed_up - v_completed, 0),
      'signed_up', v_signed_up
    ),
    'funnel', jsonb_build_array(
      jsonb_build_object('id', 'signed_up', 'label', 'Signed up', 'count', v_signed_up),
      jsonb_build_object('id', 'onboarding_started', 'label', 'Onboarding started', 'count', v_onboarding),
      jsonb_build_object('id', 'onboarding_completed', 'label', 'Onboarding completed', 'count', v_completed),
      jsonb_build_object('id', 'activated', 'label', 'First sale (activated)', 'count', v_activated)
    ),
    'dropoffs', jsonb_build_array(
      jsonb_build_object(
        'from', 'signed_up', 'to', 'onboarding_started',
        'lost', greatest(v_signed_up - v_onboarding, 0),
        'rate_pct', case when v_signed_up > 0
          then round((greatest(v_signed_up - v_onboarding, 0)::numeric / v_signed_up) * 100, 1)
          else 0 end
      ),
      jsonb_build_object(
        'from', 'onboarding_started', 'to', 'onboarding_completed',
        'lost', greatest(v_onboarding - v_completed, 0),
        'rate_pct', case when v_onboarding > 0
          then round((greatest(v_onboarding - v_completed, 0)::numeric / v_onboarding) * 100, 1)
          else 0 end
      ),
      jsonb_build_object(
        'from', 'onboarding_completed', 'to', 'activated',
        'lost', greatest(v_completed - v_activated, 0),
        'rate_pct', case when v_completed > 0
          then round((greatest(v_completed - v_activated, 0)::numeric / v_completed) * 100, 1)
          else 0 end
      )
    ),
    'pages', v_pageviews,
    'events', v_event_counts,
    'cohorts', v_cohorts,
    'issues', coalesce(v_issues, '[]'::jsonb),
    'issue_counts', jsonb_build_object(
      'email_failures', v_email_fail,
      'payment_failures', v_pay_fail
    )
  );
end;
$$;

revoke all on function private.admin_product_intelligence_payload(integer) from public, anon, authenticated;

create or replace function public.admin_product_intelligence(p_days integer default 30)
returns jsonb
language sql
security definer
set search_path = public, private
as $$
  select private.admin_product_intelligence_payload(p_days);
$$;

revoke all on function public.admin_product_intelligence(integer) from public, anon;
grant execute on function public.admin_product_intelligence(integer) to authenticated;
