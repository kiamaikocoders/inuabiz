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
  select command into v_cmd from cron.job where jobname = p_jobname limit 1;
  if v_cmd is null then raise exception 'unknown cron job' using errcode = 'P0002'; end if;
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
  if not found then raise exception 'email log not found' using errcode = 'P0002'; end if;
  v_tenant := nullif(v_row.metadata->>'tenant_id', '')::uuid;
  v_body := jsonb_strip_nulls(jsonb_build_object(
    'template_id', v_row.template_id,
    'to', v_row.to_email,
    'tenant_id', v_tenant,
    'idempotency_key', 'retry/' || p_log_id::text || '/' || extract(epoch from now())::bigint::text
  ));
  v_id := private.invoke_edge('dispatch-outbound', v_body);
  perform private.log_admin_ops('retry_email', v_tenant, v_row.template_id, jsonb_build_object('log_id', p_log_id, 'to', v_row.to_email, 'request_id', v_id));
  return jsonb_build_object('ok', true, 'request_id', v_id);
end;
$$;

revoke all on function public.admin_retry_email(bigint) from public, anon;
grant execute on function public.admin_retry_email(bigint) to authenticated;

create or replace function public.admin_extend_trial(p_tenant_id uuid, p_days integer, p_reason text)
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
  if p_days is null or p_days < 1 or p_days > 90 then raise exception 'days must be 1–90' using errcode = '22023'; end if;
  if coalesce(trim(p_reason), '') = '' then raise exception 'reason required' using errcode = '22023'; end if;
  select name into v_name from public.tenants where id = p_tenant_id;
  if v_name is null then raise exception 'tenant not found' using errcode = 'P0002'; end if;
  update public.tenants
  set trial_ends_at = greatest(coalesce(trial_ends_at, now()), now()) + make_interval(days => p_days),
      access_until = greatest(coalesce(access_until, now()), now()) + make_interval(days => p_days),
      status = case when status in ('PAST_DUE', 'SUSPENDED', 'CANCELLED') then 'TRIAL' else status end,
      updated_at = now()
  where id = p_tenant_id
  returning trial_ends_at into v_until;
  update public.subscriptions
  set status = case when status in ('PAST_DUE', 'SUSPENDED', 'CANCELLED') then 'TRIAL' else status end,
      current_period_end = v_until,
      updated_at = now()
  where tenant_id = p_tenant_id;
  perform private.log_admin_ops('extend_trial', p_tenant_id, v_name, jsonb_build_object('days', p_days, 'reason', p_reason, 'trial_ends_at', v_until));
  return jsonb_build_object('ok', true, 'trial_ends_at', v_until);
end;
$$;

revoke all on function public.admin_extend_trial(uuid, integer, text) from public, anon;
grant execute on function public.admin_extend_trial(uuid, integer, text) to authenticated;

create or replace function public.admin_override_subscription(
  p_tenant_id uuid, p_amount numeric, p_plan_code text, p_status public.tenant_status, p_period_days integer, p_reason text
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
  if coalesce(trim(p_reason), '') = '' then raise exception 'reason required' using errcode = '22023'; end if;
  if p_amount is null or p_amount < 0 or p_amount > 1000000 then raise exception 'amount out of range' using errcode = '22023'; end if;
  if p_period_days is not null and (p_period_days < 1 or p_period_days > 366) then raise exception 'period days must be 1–366' using errcode = '22023'; end if;
  select name into v_name from public.tenants where id = p_tenant_id;
  if v_name is null then raise exception 'tenant not found' using errcode = 'P0002'; end if;
  v_end := case when p_period_days is not null then now() + make_interval(days => p_period_days) else null end;
  update public.tenants
  set status = coalesce(p_status, status), access_until = coalesce(v_end, access_until), updated_at = now()
  where id = p_tenant_id;
  update public.subscriptions
  set amount = p_amount,
      plan_code = coalesce(nullif(trim(p_plan_code), ''), plan_code),
      status = coalesce(p_status, status),
      current_period_start = case when v_end is not null then now() else current_period_start end,
      current_period_end = coalesce(v_end, current_period_end),
      updated_at = now()
  where tenant_id = p_tenant_id;
  perform private.log_admin_ops('override_subscription', p_tenant_id, v_name, jsonb_build_object('amount', p_amount, 'plan_code', p_plan_code, 'status', p_status, 'period_days', p_period_days, 'reason', p_reason));
  return jsonb_build_object('ok', true, 'access_until', coalesce(v_end, (select access_until from public.tenants where id = p_tenant_id)));
end;
$$;

revoke all on function public.admin_override_subscription(uuid, numeric, text, public.tenant_status, integer, text) from public, anon;
grant execute on function public.admin_override_subscription(uuid, numeric, text, public.tenant_status, integer, text) to authenticated;

create or replace function public.admin_set_feature_flag(
  p_key text, p_enabled boolean, p_tenant_id uuid default null, p_description text default null
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
  if coalesce(trim(p_key), '') = '' then raise exception 'flag key required' using errcode = '22023'; end if;
  if p_tenant_id is null then
    insert into public.platform_feature_flags (key, tenant_id, enabled, description, updated_by, updated_at)
    values (p_key, null, p_enabled, p_description, auth.uid(), now())
    on conflict (key) where tenant_id is null
    do update set enabled = excluded.enabled,
      description = coalesce(excluded.description, public.platform_feature_flags.description),
      updated_by = auth.uid(), updated_at = now()
    returning id into v_id;
  else
    insert into public.platform_feature_flags (key, tenant_id, enabled, description, updated_by, updated_at)
    values (p_key, p_tenant_id, p_enabled, p_description, auth.uid(), now())
    on conflict (tenant_id, key) where tenant_id is not null
    do update set enabled = excluded.enabled,
      description = coalesce(excluded.description, public.platform_feature_flags.description),
      updated_by = auth.uid(), updated_at = now()
    returning id into v_id;
  end if;
  perform private.log_admin_ops('set_flag', p_tenant_id, p_key, jsonb_build_object('enabled', p_enabled, 'id', v_id));
  return jsonb_build_object('ok', true, 'id', v_id, 'enabled', p_enabled);
end;
$$;

revoke all on function public.admin_set_feature_flag(text, boolean, uuid, text) from public, anon;
grant execute on function public.admin_set_feature_flag(text, boolean, uuid, text) to authenticated;

create or replace function public.admin_purge_tenant(p_tenant_id uuid, p_confirm_name text, p_reason text)
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
  if coalesce(trim(p_reason), '') = '' then raise exception 'reason required' using errcode = '22023'; end if;
  select name into v_name from public.tenants where id = p_tenant_id;
  if v_name is null then raise exception 'tenant not found' using errcode = 'P0002'; end if;
  if lower(trim(v_name)) <> lower(trim(p_confirm_name)) then raise exception 'confirmation name does not match' using errcode = '22023'; end if;
  select coalesce(array_agg(id), '{}') into v_profiles from public.profiles where tenant_id = p_tenant_id;
  perform private.log_admin_ops('purge_tenant', p_tenant_id, v_name, jsonb_build_object('reason', p_reason, 'profile_count', coalesce(array_length(v_profiles, 1), 0)));
  update public.profiles set active_shop_id = null where tenant_id = p_tenant_id;
  delete from public.admin_impersonation_audit where target_tenant_id = p_tenant_id;
  update public.unclaimed_payments set resolved_tenant_id = null where resolved_tenant_id = p_tenant_id;
  begin
    delete from storage.objects where bucket_id = 'business-logos' and name like p_tenant_id::text || '/%';
    delete from storage.objects where bucket_id = 'profile-avatars' and name like any (select u::text || '/%' from unnest(v_profiles) u);
  exception when others then null;
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
;
