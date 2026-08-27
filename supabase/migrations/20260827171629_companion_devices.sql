-- Companion phone pairing + SMS ingest for personal / Pochi M-Pesa sales.
-- The APK on the business SIM forwards Safaricom "received" SMS; POS marks the sale PAID.

create table public.companion_devices (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  shop_id uuid references public.shops (id) on delete set null,
  label text not null default 'Business phone',
  token_hash text not null,
  token_prefix text not null,
  expected_msisdn text,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  revoked_at timestamptz
);

create unique index companion_devices_token_hash_uidx
  on public.companion_devices (token_hash);

create index companion_devices_tenant_active_idx
  on public.companion_devices (tenant_id, created_at desc)
  where revoked_at is null;

comment on table public.companion_devices is
  'Sideloaded InuaBiz Companion APK devices. Token shown once; only the SHA-256 hash is stored.';

create table public.companion_sms_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  device_id uuid not null references public.companion_devices (id) on delete cascade,
  sale_id uuid references public.sales (id) on delete set null,
  receipt_code text,
  amount numeric(12, 2),
  sender_msisdn text,
  raw_body text not null,
  parse_status text not null
    check (parse_status in ('ignored', 'matched', 'unmatched', 'duplicate')),
  created_at timestamptz not null default now()
);

create index companion_sms_events_tenant_created_idx
  on public.companion_sms_events (tenant_id, created_at desc);

comment on table public.companion_sms_events is
  'Audit log of SMS payloads the companion APK forwarded. Unmatched rows are not sales.';

alter table public.companion_devices enable row level security;
alter table public.companion_sms_events enable row level security;

create policy companion_devices_select on public.companion_devices
  for select to authenticated
  using (tenant_id = private.current_tenant_id() or private.is_super_admin());

create policy companion_devices_update on public.companion_devices
  for update to authenticated
  using (
    tenant_id = private.current_tenant_id()
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'VENDOR_ADMIN'
        and p.tenant_id = companion_devices.tenant_id
    )
  )
  with check (tenant_id = private.current_tenant_id());

create policy companion_sms_events_select on public.companion_sms_events
  for select to authenticated
  using (tenant_id = private.current_tenant_id() or private.is_super_admin());

grant select, update on public.companion_devices to authenticated;
grant select on public.companion_sms_events to authenticated;
grant all on public.companion_devices to service_role;
grant all on public.companion_sms_events to service_role;

-- Same receipt cannot close two sales in one shop.
create unique index if not exists sales_tenant_mpesa_receipt_uidx
  on public.sales (tenant_id, mpesa_receipt_code)
  where mpesa_receipt_code is not null;

-- POS listens for PAID on the open sale (personal / Pochi companion match).
alter table public.sales replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.sales;
exception
  when duplicate_object then null;
end;
$$;
