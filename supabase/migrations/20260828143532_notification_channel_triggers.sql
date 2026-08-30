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
      'VENDOR_ADMIN',
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
$$;;
