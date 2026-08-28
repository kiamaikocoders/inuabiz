-- Close lying notification channels, honor prefs, email receipts, broadcasts, web push.

alter table public.tenants
  add column if not exists email_receipt_enabled boolean not null default false;

alter table public.notification_preferences
  add column if not exists channel_push boolean not null default true;

alter table public.notification_preferences
  alter column channel_sms set default false,
  alter column channel_whatsapp set default false;

update public.notification_preferences
  set channel_sms = false, channel_whatsapp = false
  where channel_sms is distinct from false
     or channel_whatsapp is distinct from false;

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (endpoint)
);

create index if not exists push_subscriptions_profile_id_idx
  on public.push_subscriptions (profile_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists push_subscriptions_self on public.push_subscriptions;
create policy push_subscriptions_self on public.push_subscriptions
  for all to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

grant select, insert, update, delete on public.push_subscriptions to authenticated;
grant all on public.push_subscriptions to service_role;

insert into public.platform_settings (key, value, description)
values (
  'push.vapid_public',
  '"BDj4yvQTLsRnuHf5YiWVlQRhmP1PCwy8DiWAhKK99f6Oe0jelVLL-CjNlaco9tbYnTSxRJmi5IgiAc91PfJMDI0"'::jsonb,
  'Web Push VAPID public key (URL-safe). Private key lives in app_secrets / Edge secrets.'
)
on conflict (key) do update
  set value = excluded.value,
      description = excluded.description,
      updated_at = now();

drop policy if exists platform_settings_read_billing on public.platform_settings;
create policy platform_settings_read_billing on public.platform_settings
  for select to authenticated
  using (
    key like 'billing.%'
    or key = 'push.vapid_public'
    or private.is_super_admin()
  );

create or replace function public.push_vapid_public()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select nullif(trim(both '"' from coalesce(value::text, '')), '')
  from public.platform_settings
  where key = 'push.vapid_public'
  limit 1;
$$;

revoke all on function public.push_vapid_public() from public, anon;
grant execute on function public.push_vapid_public() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- notify_user: honor in-app pref, fan out web push
-- ---------------------------------------------------------------------------
create or replace function private.notify_user(
  p_recipient_id uuid,
  p_recipient_role public.recipient_role,
  p_tenant_id uuid,
  p_title text,
  p_message text,
  p_type public.notification_type,
  p_priority public.notification_priority default 'NORMAL',
  p_metadata jsonb default null
)
returns uuid
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_id uuid;
  v_push boolean := true;
  v_url text;
begin
  select coalesce(channel_push, true)
  into v_push
  from public.notification_preferences
  where profile_id = p_recipient_id;

  insert into public.notifications (
    tenant_id, recipient_role, recipient_id, title, message, type, priority, metadata
  ) values (
    p_tenant_id, p_recipient_role, p_recipient_id, p_title, p_message, p_type, p_priority, p_metadata
  )
  returning id into v_id;

  if v_push then
    v_url := coalesce(p_metadata->>'url', case
      when p_recipient_role = 'SUPER_ADMIN' then '/admin/notifications'
      when p_type = 'SALE' then '/app/sales'
      when p_type = 'STOCK_LOW' then '/app/inventory'
      when p_type = 'CREDIT' then '/app/credit'
      when p_type = 'SUBSCRIPTION' then '/app/billing'
      else '/app/notifications'
    end);
    begin
      perform private.invoke_edge(
        'dispatch-push',
        jsonb_build_object(
          'recipient_id', p_recipient_id,
          'notification_id', v_id,
          'title', p_title,
          'body', p_message,
          'url', v_url,
          'tag', p_type::text
        )
      );
    exception when others then
      null;
    end;
  end if;

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Sale paid / credit: in-app + optional shop-copy email receipt
-- ---------------------------------------------------------------------------
create or replace function private.notify_sale_paid()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
declare
  r record;
  v_receipt boolean := false;
  v_note_type public.notification_type;
  v_title text;
  v_message text;
begin
  if tg_op = 'UPDATE'
     and not (new.status = 'PAID' and old.status is distinct from 'PAID')
  then
    return new;
  end if;

  if tg_op = 'INSERT' and new.status not in ('PAID', 'CREDIT') then
    return new;
  end if;

  if tg_op = 'UPDATE' and new.status is distinct from 'PAID' then
    return new;
  end if;

  select coalesce(email_receipt_enabled, false) into v_receipt
  from public.tenants
  where id = new.tenant_id;

  if new.status = 'CREDIT' then
    v_note_type := 'CREDIT';
    v_title := 'Credit sale recorded';
    v_message := 'KES ' || new.total::text || ' added to the credit book.';
  else
    v_note_type := 'SALE';
    v_title := 'Sale completed';
    v_message := 'Payment of KES ' || new.total::text || ' received.';
  end if;

  for r in
    select id, role from public.profiles
    where tenant_id = new.tenant_id
      and role in ('VENDOR_ADMIN', 'VENDOR_STAFF')
      and is_active
  loop
    perform private.notify_user(
      r.id,
      case when r.role = 'VENDOR_STAFF' then 'VENDOR_ADMIN'::public.recipient_role else 'VENDOR_ADMIN'::public.recipient_role end,
      new.tenant_id,
      v_title,
      v_message,
      v_note_type,
      'HIGH',
      jsonb_build_object(
        'sale_id', new.id,
        'amount', new.total,
        'channel', new.payment_channel,
        'url', '/app/sales/' || new.id::text
      )
    );
  end loop;

  if v_receipt then
    begin
      perform private.invoke_edge(
        'dispatch-outbound',
        jsonb_build_object(
          'sale_id', new.id,
          'tenant_id', new.tenant_id,
          'email_receipt', true,
          'idempotency_key', 'sale-receipt/' || new.id::text
        )
      );
    exception when others then
      null;
    end;
  end if;

  return new;
end;
$$;

drop trigger if exists sales_paid_notify on public.sales;
create trigger sales_paid_notify
  after insert or update of status on public.sales
  for each row execute function private.notify_sale_paid();

-- ---------------------------------------------------------------------------
-- Published broadcasts → in-app + device (email still via dispatch-lifecycle)
-- ---------------------------------------------------------------------------
create or replace function private.notify_broadcast_published()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
declare
  r record;
begin
  if not (new.is_active and new.status = 'published') then
    return new;
  end if;
  if tg_op = 'UPDATE'
     and old.status = 'published'
     and old.is_active
  then
    return new;
  end if;

  for r in
    select p.id, p.tenant_id
    from public.profiles p
    join public.tenants t on t.id = p.tenant_id
    where p.role in ('VENDOR_ADMIN', 'VENDOR_STAFF')
      and p.is_active
      and (
        coalesce(new.audience, 'all') = 'all'
        or (new.audience = 'active' and t.status = 'ACTIVE')
        or (new.audience = 'trial' and t.status = 'TRIAL')
        or (new.audience = 'lapsed' and t.status in ('PAST_DUE', 'SUSPENDED', 'CANCELLED'))
      )
  loop
    perform private.notify_user(
      r.id,
      'VENDOR_ADMIN',
      r.tenant_id,
      coalesce(nullif(trim(new.title), ''), 'InuaBiz notice'),
      left(coalesce(new.body, ''), 400),
      'SYSTEM',
      'HIGH',
      jsonb_build_object('broadcast_id', new.id, 'url', '/app/notifications')
    );
  end loop;

  return new;
end;
$$;

drop trigger if exists platform_broadcasts_notify on public.platform_broadcasts;
create trigger platform_broadcasts_notify
  after insert or update of status, is_active on public.platform_broadcasts
  for each row execute function private.notify_broadcast_published();

do $$
begin
  alter publication supabase_realtime add table public.platform_broadcasts;
exception
  when duplicate_object then null;
end;
$$;
