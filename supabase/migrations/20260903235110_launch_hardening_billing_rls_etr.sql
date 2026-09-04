-- Launch hardening: write-lock RLS, ETR control numbers for COMPLIANCE,
-- subscription-ending template, platform settings keys, expire → PAST_DUE helper.

-- ---------------------------------------------------------------------------
-- Harden tenant write lock: also treat expired access_until as locked
-- ---------------------------------------------------------------------------
create or replace function public.tenant_is_write_locked(p_tenant_id uuid default null)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.tenants t
    where t.id = coalesce(p_tenant_id, private.current_tenant_id())
      and (
        t.status in ('PAST_DUE', 'SUSPENDED', 'CANCELLED')
        or t.access_until <= now()
        or t.status not in ('TRIAL', 'ACTIVE')
      )
  );
$$;

comment on function public.tenant_is_write_locked(uuid) is
  'True when the tenant cannot mutate till data (lapsed, suspended, cancelled, or access_until passed).';

-- Flip ACTIVE/TRIAL past access_until to PAST_DUE (called from lifecycle cron)
create or replace function public.mark_expired_tenants_past_due()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
begin
  update public.tenants
  set status = 'PAST_DUE', updated_at = now()
  where status in ('TRIAL', 'ACTIVE')
    and access_until <= now();
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function public.mark_expired_tenants_past_due() from public, anon, authenticated;
grant execute on function public.mark_expired_tenants_past_due() to service_role;

-- ---------------------------------------------------------------------------
-- RLS: keep SELECT; gate INSERT/UPDATE/DELETE on access
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'products',
    'customers',
    'sales',
    'sale_items',
    'credit_entries'
  ]
  loop
    execute format('drop policy if exists %I on public.%I', t || '_tenant', t);
    execute format(
      'create policy %I on public.%I for select to authenticated using (tenant_id = private.current_tenant_id() or private.is_super_admin())',
      t || '_select',
      t
    );
    execute format(
      $pol$
      create policy %I on public.%I for insert to authenticated
      with check (
        private.is_super_admin()
        or (
          tenant_id = private.current_tenant_id()
          and public.tenant_has_access(tenant_id)
          and not public.tenant_is_write_locked(tenant_id)
        )
      )
      $pol$,
      t || '_insert',
      t
    );
    execute format(
      $pol$
      create policy %I on public.%I for update to authenticated
      using (
        private.is_super_admin()
        or (
          tenant_id = private.current_tenant_id()
          and public.tenant_has_access(tenant_id)
          and not public.tenant_is_write_locked(tenant_id)
        )
      )
      with check (
        private.is_super_admin()
        or (
          tenant_id = private.current_tenant_id()
          and public.tenant_has_access(tenant_id)
          and not public.tenant_is_write_locked(tenant_id)
        )
      )
      $pol$,
      t || '_update',
      t
    );
    execute format(
      $pol$
      create policy %I on public.%I for delete to authenticated
      using (
        private.is_super_admin()
        or (
          tenant_id = private.current_tenant_id()
          and public.tenant_has_access(tenant_id)
          and not public.tenant_is_write_locked(tenant_id)
        )
      )
      $pol$,
      t || '_delete',
      t
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- ETR-format control number for COMPLIANCE plan invoices (manual / local — not eTIMS)
-- ---------------------------------------------------------------------------
create or replace function private.issue_sale_invoice(p_sale_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sale public.sales%rowtype;
  v_customer_name text := 'Walk-in Customer';
  v_customer_pin varchar(11);
  v_year integer := extract(year from timezone('Africa/Nairobi', now()))::integer;
  v_n integer;
  v_number varchar(64);
  v_invoice_id uuid;
  v_mpesa text;
  v_line record;
  v_ratio numeric;
  v_net numeric;
  v_vat numeric;
  v_subtotal numeric := 0;
  v_vat16 numeric := 0;
  v_vat0 numeric := 0;
  v_exempt numeric := 0;
  v_plan text;
  v_cuin text;
  v_qr text;
begin
  select * into v_sale from public.sales where id = p_sale_id;
  if not found then
    raise exception 'Sale not found';
  end if;

  if v_sale.status not in ('PAID', 'CREDIT') then
    return null;
  end if;

  select id into v_invoice_id from public.invoices where sale_id = p_sale_id;
  if v_invoice_id is not null then
    return v_invoice_id;
  end if;

  if not exists (select 1 from public.sale_items where sale_id = p_sale_id) then
    raise exception 'Sale has no line items';
  end if;

  if v_sale.customer_id is not null then
    select coalesce(nullif(trim(name), ''), 'Walk-in Customer'), kra_pin
      into v_customer_name, v_customer_pin
    from public.customers
    where id = v_sale.customer_id;
  end if;

  select api_ref into v_mpesa
  from public.payment_transactions
  where sale_id = p_sale_id
    and status = 'COMPLETE'
  order by created_at desc
  limit 1;

  insert into public.invoice_sequences (tenant_id, year, last_n)
  values (v_sale.tenant_id, v_year, 1)
  on conflict (tenant_id, year)
  do update set last_n = public.invoice_sequences.last_n + 1
  returning last_n into v_n;

  v_number := 'INB-' || v_year::text || '-' || lpad(v_n::text, 4, '0');

  insert into public.invoices (
    tenant_id, sale_id, invoice_number, customer_name, customer_kra_pin,
    subtotal, vat_16_amount, vat_0_amount, exempt_amount, total_amount,
    payment_method, mpesa_receipt_code, cashier_id
  ) values (
    v_sale.tenant_id, p_sale_id, v_number, v_customer_name, v_customer_pin,
    0, 0, 0, 0, v_sale.total,
    coalesce(v_sale.payment_channel::text, 'CASH'),
    v_mpesa,
    v_sale.created_by
  )
  returning id into v_invoice_id;

  v_ratio := case
    when v_sale.subtotal > 0 then greatest(0, 1 - (v_sale.discount_amount / v_sale.subtotal))
    else 1
  end;

  for v_line in
    select
      si.id,
      si.product_name,
      si.classification_code,
      si.qty,
      si.unit_price,
      si.line_total,
      si.tax_class,
      si.tenant_id
    from public.sale_items si
    where si.sale_id = p_sale_id
    order by si.id
  loop
    v_net := round(v_line.line_total * v_ratio, 2);
    v_vat := 0;
    if v_line.tax_class = 'STANDARD_16' then
      v_vat := round(v_net * 16 / 116, 2);
      v_vat16 := v_vat16 + v_vat;
      v_subtotal := v_subtotal + (v_net - v_vat);
    elsif v_line.tax_class = 'ZERO_RATED' then
      v_vat0 := v_vat0 + v_net;
      v_subtotal := v_subtotal + v_net;
    else
      v_exempt := v_exempt + v_net;
      v_subtotal := v_subtotal + v_net;
    end if;

    insert into public.invoice_items (
      tenant_id, invoice_id, sale_item_id, item_description, classification_code,
      qty, unit_price, line_total, tax_class, vat_amount
    ) values (
      v_line.tenant_id, v_invoice_id, v_line.id, v_line.product_name,
      v_line.classification_code, v_line.qty, v_line.unit_price, v_net,
      v_line.tax_class, v_vat
    );
  end loop;

  select coalesce(s.plan_code, 'SHOP_MONTHLY') into v_plan
  from public.subscriptions s
  where s.tenant_id = v_sale.tenant_id
  order by s.updated_at desc nulls last
  limit 1;

  if coalesce(v_plan, 'SHOP_MONTHLY') = 'COMPLIANCE' then
    -- Local ETR-format control number for KRA filing packs — NOT transmitted to eTIMS.
    v_cuin :=
      'CUIN' ||
      to_char(timezone('Africa/Nairobi', now()), 'YYYYMMDDHH24MISS') ||
      lpad(v_n::text, 4, '0');
    v_qr :=
      'https://inuabiz.co.ke/verify-receipt?cuin=' ||
      v_cuin ||
      '&inv=' ||
      v_number;
  end if;

  update public.invoices
  set
    subtotal = v_subtotal,
    vat_16_amount = v_vat16,
    vat_0_amount = v_vat0,
    exempt_amount = v_exempt,
    total_amount = v_sale.total,
    kra_control_number = v_cuin,
    kra_qr_code_url = v_qr
  where id = v_invoice_id;

  return v_invoice_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Email template: subscription ending (paid tenants)
-- ---------------------------------------------------------------------------
insert into public.communication_templates (id, category, name, subject, html, description)
values (
  'subscription-ending',
  'transactional',
  'Subscription ending',
  'Your InuaBiz plan renews soon',
  '<p>Your paid plan period is ending. Renew with M-Pesa so POS, receipts and stock alerts stay on. Nothing is deleted if you pause — you just cannot sell until you renew.</p>',
  'Reminder for ACTIVE tenants before access_until / period end.'
)
on conflict (id) do update set
  name = excluded.name,
  subject = excluded.subject,
  description = excluded.description,
  updated_at = now();

insert into public.communication_templates (id, category, name, subject, html, description)
values
  (
    'support-ticket-opened',
    'ops',
    'Support ticket opened',
    'New support ticket — {{subject}}',
    '<p>A vendor opened ticket {{ticket_id}}.</p><p>{{message}}</p>',
    'Ops inbox when a support ticket is created or escalated.'
  ),
  (
    'support-ticket-reply',
    'transactional',
    'Support ticket reply',
    'Reply on your InuaBiz ticket',
    '<p>Support replied on your ticket.</p><p>{{message}}</p><p><a href="{{cta_url}}">Open ticket</a></p>',
    'Vendor email when an admin replies to a support ticket.'
  ),
  (
    'invite-vendor',
    'ops',
    'Invite vendor',
    'You are invited to InuaBiz',
    '<p>Join InuaBiz and set up your till.</p><p><a href="{{cta_url}}">Create your shop</a></p>',
    'Admin-sent invite to a prospective vendor.'
  )
on conflict (id) do update set
  name = excluded.name,
  subject = excluded.subject,
  description = excluded.description,
  updated_at = now();

-- Platform settings defaults used by admin settings form
insert into public.platform_settings (key, value, description)
values
  ('platform.command_centre_name', '"InuaBiz Command Center"', 'Public command centre display name'),
  ('platform.location', '"Nairobi, Kenya"', 'Ops location label'),
  ('platform.support_phone', '""', 'Public support phone'),
  ('platform.allow_self_serve', 'true', 'Allow public signup'),
  ('platform.idle_lock_minutes', '30', 'Admin idle lock minutes'),
  ('platform.impersonation_reason_required', 'true', 'Require reason when ghosting a vendor')
on conflict (key) do nothing;

-- Public ETR-format receipt lookup (limited fields — not eTIMS)
create or replace function public.verify_etr_receipt(p_cuin text default null, p_invoice text default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v jsonb;
begin
  select jsonb_build_object(
    'invoice_number', i.invoice_number,
    'kra_control_number', i.kra_control_number,
    'customer_name', i.customer_name,
    'customer_kra_pin', i.customer_kra_pin,
    'subtotal', i.subtotal,
    'vat_16_amount', i.vat_16_amount,
    'total_amount', i.total_amount,
    'created_at', i.created_at,
    'shop_name', coalesce(t.legal_name, t.name),
    'shop_kra_pin', t.kra_pin,
    'shop_address', t.address_text
  )
  into v
  from public.invoices i
  join public.tenants t on t.id = i.tenant_id
  where i.kra_control_number is not null
    and (
      (nullif(trim(p_cuin), '') is not null and i.kra_control_number = trim(p_cuin))
      or (nullif(trim(p_invoice), '') is not null and i.invoice_number = trim(p_invoice))
    )
  limit 1;
  return v;
end;
$$;

revoke all on function public.verify_etr_receipt(text, text) from public;
grant execute on function public.verify_etr_receipt(text, text) to anon, authenticated;
