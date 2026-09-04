-- Backfill local CUIN/QR on COMPLIANCE invoices that lack them.
-- Invoice issuance on cash/credit insert is handled in checkout-sale
-- (sale_items are written after the sales row, so an INSERT trigger cannot see them).

do $$
declare
  r record;
  v_plan text;
  v_cuin text;
  v_qr text;
begin
  for r in
    select i.id, i.tenant_id, i.invoice_number, i.created_at
    from public.invoices i
    where i.kra_control_number is null
  loop
    select coalesce(s.plan_code, 'SHOP_MONTHLY') into v_plan
    from public.subscriptions s
    where s.tenant_id = r.tenant_id
    order by s.updated_at desc nulls last
    limit 1;

    if coalesce(v_plan, 'SHOP_MONTHLY') <> 'COMPLIANCE' then
      continue;
    end if;

    v_cuin :=
      'CUIN' ||
      to_char(timezone('Africa/Nairobi', coalesce(r.created_at, now())), 'YYYYMMDDHH24MISS') ||
      upper(substr(replace(r.id::text, '-', ''), 1, 4));
    v_qr :=
      'https://inuabiz.co.ke/verify-receipt?cuin=' ||
      v_cuin ||
      '&inv=' ||
      r.invoice_number;

    update public.invoices
    set kra_control_number = v_cuin, kra_qr_code_url = v_qr
    where id = r.id;
  end loop;
end;
$$;

-- If an invoice already exists without CUIN, fill it on re-issue (idempotent).
create or replace function private.issue_sale_invoice(p_sale_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sale public.sales%rowtype;
  v_invoice_id uuid;
  v_customer_name text := 'Walk-in Customer';
  v_customer_pin text;
  v_year int := extract(year from timezone('Africa/Nairobi', now()))::int;
  v_n int;
  v_number text;
  v_mpesa text;
  v_line record;
  v_net numeric;
  v_vat numeric;
  v_ratio numeric;
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

  select id, kra_control_number into v_invoice_id, v_cuin
  from public.invoices where sale_id = p_sale_id;

  if v_invoice_id is not null then
    -- Backfill CUIN for existing COMPLIANCE invoices.
    if v_cuin is null then
      select coalesce(s.plan_code, 'SHOP_MONTHLY') into v_plan
      from public.subscriptions s
      where s.tenant_id = v_sale.tenant_id
      order by s.updated_at desc nulls last
      limit 1;
      if coalesce(v_plan, 'SHOP_MONTHLY') = 'COMPLIANCE' then
        select invoice_number into v_number from public.invoices where id = v_invoice_id;
        v_cuin :=
          'CUIN' ||
          to_char(timezone('Africa/Nairobi', now()), 'YYYYMMDDHH24MISS') ||
          upper(substr(replace(v_invoice_id::text, '-', ''), 1, 4));
        v_qr :=
          'https://inuabiz.co.ke/verify-receipt?cuin=' ||
          v_cuin ||
          '&inv=' ||
          v_number;
        update public.invoices
        set kra_control_number = v_cuin, kra_qr_code_url = v_qr
        where id = v_invoice_id;
      end if;
    end if;
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
    v_net := round((v_line.line_total * v_ratio)::numeric, 2);
    v_vat := 0;
    if v_line.tax_class = 'STANDARD_16' then
      v_vat := round((v_net * 16 / 116)::numeric, 2);
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
