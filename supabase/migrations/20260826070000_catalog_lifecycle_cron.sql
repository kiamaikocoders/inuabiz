-- Catalog emails: due dates, contact inbox, cron that hits edge functions
-- with the same x-cron-secret as poll-pending-payments.

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net;

alter table public.customers
  add column if not exists email text;

alter table public.bill_invoices
  add column if not exists billed_email text;

alter table public.credit_entries
  add column if not exists due_at timestamptz;

alter table public.platform_broadcasts
  add column if not exists email_dispatched_at timestamptz;

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  email text,
  topic text not null default 'other',
  message text not null,
  created_at timestamptz not null default now()
);

alter table public.contact_messages enable row level security;

drop policy if exists contact_messages_admin on public.contact_messages;
create policy contact_messages_admin on public.contact_messages
  for all to authenticated
  using (private.is_super_admin())
  with check (private.is_super_admin());

grant select on public.contact_messages to authenticated;
grant all on public.contact_messages to service_role;
revoke insert, update, delete on public.contact_messages from anon, authenticated;

-- Cron/triggers read secrets without a JWT (get_app_secret requires service_role JWT).
create or replace function private.read_app_secret(p_name text)
returns text
language sql
stable
security definer
set search_path = private
as $$
  select s.value from private.app_secrets s where s.name = p_name;
$$;

revoke all on function private.read_app_secret(text) from public, anon, authenticated;

create or replace function private.invoke_edge(p_name text, p_body jsonb default '{}'::jsonb)
returns bigint
language plpgsql
security definer
set search_path = private, net, vault, public
as $$
declare
  project_url text;
  publishable text;
  cron_secret text;
  request_id bigint;
begin
  select decrypted_secret into project_url
  from vault.decrypted_secrets
  where name = 'project_url'
  limit 1;
  if project_url is null or project_url = '' then
    project_url := 'https://hnzzkmifgufurkqvnchp.supabase.co';
  end if;

  select decrypted_secret into publishable
  from vault.decrypted_secrets
  where name = 'publishable_key'
  limit 1;

  cron_secret := private.read_app_secret('CRON_SECRET');

  select net.http_post(
    url := rtrim(project_url, '/') || '/functions/v1/' || p_name,
    headers := jsonb_strip_nulls(jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', publishable,
      'Authorization', case
        when publishable is not null and publishable <> '' then 'Bearer ' || publishable
      end,
      'x-cron-secret', cron_secret
    )),
    body := coalesce(p_body, '{}'::jsonb),
    timeout_milliseconds := 120000
  ) into request_id;

  return request_id;
end;
$$;

revoke all on function private.invoke_edge(text, jsonb) from public, anon, authenticated;
grant execute on function private.invoke_edge(text, jsonb) to postgres;

create or replace function private.notify_low_stock()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
declare
  r record;
begin
  if new.stock_qty <= new.low_stock_threshold
     and (old.stock_qty is distinct from new.stock_qty)
     and (old.stock_qty > old.low_stock_threshold or old.stock_qty is null)
  then
    for r in
      select id from public.profiles
      where tenant_id = new.tenant_id
        and role in ('VENDOR_ADMIN', 'VENDOR_STAFF')
        and is_active
    loop
      perform private.notify_user(
        r.id,
        'VENDOR_ADMIN',
        new.tenant_id,
        'Low stock: ' || left(new.name, 80),
        new.name || ' is at ' || new.stock_qty::text || ' (threshold ' || new.low_stock_threshold::text || ').',
        'STOCK_LOW',
        'HIGH',
        jsonb_build_object('product_id', new.id, 'stock_qty', new.stock_qty)
      );
    end loop;
    begin
      perform private.invoke_edge(
        'dispatch-outbound',
        jsonb_build_object(
          'tenant_id', new.tenant_id,
          'template_id', 'low-stock',
          'idempotency_key', 'low-stock/' || new.id::text || '/' || (current_date::text),
          'vars', jsonb_build_object(
            'product', new.name,
            'on_hand', new.stock_qty::text
          )
        )
      );
    exception when others then
      null;
    end;
  end if;
  return new;
end;
$$;

select cron.schedule(
  'poll-pending-payments',
  '*/3 * * * *',
  $$select private.invoke_edge('poll-pending-payments', '{}'::jsonb)$$
);

select cron.schedule(
  'process-ratiba-retries',
  '*/3 * * * *',
  $$select private.invoke_edge('process-ratiba-retries', '{}'::jsonb)$$
);

select cron.schedule(
  'dispatch-lifecycle',
  '*/3 * * * *',
  $$select private.invoke_edge('dispatch-lifecycle', '{}'::jsonb)$$
);

select cron.schedule(
  'dispatch-lifecycle-daily',
  '0 3 * * *',
  $$select private.invoke_edge('dispatch-lifecycle', '{"job":"daily"}'::jsonb)$$
);
