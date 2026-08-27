import { getServiceClient, handleOptions, jsonResponse } from "../_shared/cors.ts";

type C2bPayload = {
  TransID?: string;
  TransAmount?: string;
  BillRefNumber?: string;
  MSISDN?: string;
  BusinessShortCode?: string;
  [k: string]: unknown;
};

function normalizeShortCode(value: string | undefined): string {
  return String(value ?? "").replace(/\D/g, "");
}

async function resolveTenantByShortCode(
  service: ReturnType<typeof getServiceClient>,
  shortCode: string,
): Promise<string | null> {
  if (!shortCode) return null;
  const { data } = await service
    .from("tenant_payment_destinations")
    .select("tenant_id")
    .eq("account_number", shortCode)
    .limit(1)
    .maybeSingle();
  return (data?.tenant_id as string | undefined) ?? null;
}

async function resolveSaleFromBillRef(
  service: ReturnType<typeof getServiceClient>,
  billRef: string,
  tenantId: string | null,
  amount: number,
): Promise<{ saleId: string | null; tenantId: string | null }> {
  const ref = billRef.trim();
  if (!ref) return { saleId: null, tenantId };

  if (ref.startsWith("sale_")) {
    const saleUuid = ref.slice(5);
    const { data: sale } = await service
      .from("sales")
      .select("id, tenant_id, status")
      .eq("id", saleUuid)
      .maybeSingle();
    if (sale) return { saleId: sale.id as string, tenantId: sale.tenant_id as string };
  }

  if (/^[0-9a-f-]{36}$/i.test(ref)) {
    const { data: sale } = await service
      .from("sales")
      .select("id, tenant_id, status")
      .eq("id", ref)
      .maybeSingle();
    if (sale) return { saleId: sale.id as string, tenantId: sale.tenant_id as string };

    const { data: tenant } = await service
      .from("tenants")
      .select("id")
      .eq("id", ref)
      .maybeSingle();
    if (tenant) return { saleId: null, tenantId: tenant.id as string };
  }

  const compact = ref.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  if (compact.length >= 6) {
    let saleQuery = service
      .from("sales")
      .select("id, tenant_id, status, total, payment_bill_ref")
      .eq("status", "PENDING_PAYMENT")
      .eq("payment_bill_ref", compact.slice(0, 8));
    if (tenantId) saleQuery = saleQuery.eq("tenant_id", tenantId);
    const { data: byBillRef } = await saleQuery.maybeSingle();
    if (byBillRef) {
      return { saleId: byBillRef.id as string, tenantId: byBillRef.tenant_id as string };
    }
  }

  if (tenantId && amount > 0) {
    const { data: openSales } = await service
      .from("sales")
      .select("id, tenant_id, total, created_at")
      .eq("tenant_id", tenantId)
      .eq("status", "PENDING_PAYMENT")
      .eq("total", amount)
      .order("created_at", { ascending: false })
      .limit(1);
    const match = openSales?.[0];
    if (match) return { saleId: match.id as string, tenantId: match.tenant_id as string };
  }

  return { saleId: null, tenantId };
}

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;
  if (req.method !== "POST") return jsonResponse({ ResultCode: 0, ResultDesc: "Accepted" });

  try {
    const payload = (await req.json()) as C2bPayload;
    const service = getServiceClient();
    const invoiceId = payload.TransID ?? `C2B-${Date.now()}`;
    const amount = Number(payload.TransAmount ?? 0);
    const billRef = String(payload.BillRefNumber ?? "").trim();
    const shortCode = normalizeShortCode(payload.BusinessShortCode);

    const { data: existing } = await service
      .from("payment_transactions")
      .select("id")
      .eq("invoice_id", invoiceId)
      .maybeSingle();
    if (existing) return jsonResponse({ ResultCode: 0, ResultDesc: "Duplicate" });

    let tenantId = await resolveTenantByShortCode(service, shortCode);
    const resolved = await resolveSaleFromBillRef(service, billRef, tenantId, amount);
    let saleId = resolved.saleId;
    if (!tenantId && resolved.tenantId) tenantId = resolved.tenantId;

    const { data: tx } = await service
      .from("payment_transactions")
      .insert({
        tenant_id: tenantId,
        sale_id: saleId,
        purpose: saleId ? "VENDOR_SALE" : tenantId ? "SAAS_SUBSCRIPTION" : "OTHER",
        invoice_id: invoiceId,
        amount,
        currency: "KES",
        payment_channel: "PAYBILL",
        status: "COMPLETE",
        account: payload.MSISDN ?? null,
        api_ref: billRef || invoiceId,
        raw_webhook_payload: payload,
      })
      .select("id")
      .single();

    if (saleId) {
      await service
        .from("sales")
        .update({
          status: "PAID",
          paid_at: new Date().toISOString(),
          payment_channel: "PAYBILL",
          mpesa_receipt_code: invoiceId.slice(0, 32),
        })
        .eq("id", saleId)
        .eq("status", "PENDING_PAYMENT");
    }

    if (!tenantId) {
      await service.from("unclaimed_payments").insert({
        payment_transaction_id: tx?.id ?? null,
        invoice_id: invoiceId,
        amount,
        raw_webhook_payload: payload,
      });
    }

    return jsonResponse({ ResultCode: 0, ResultDesc: "Accepted" });
  } catch (err) {
    console.error(err);
    return jsonResponse({ ResultCode: 0, ResultDesc: "Accepted" });
  }
});
