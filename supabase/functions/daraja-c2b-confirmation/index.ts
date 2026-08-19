import { getServiceClient, handleOptions, jsonResponse } from "../_shared/cors.ts";

type C2bPayload = {
  TransID?: string;
  TransAmount?: string;
  BillRefNumber?: string;
  MSISDN?: string;
  BusinessShortCode?: string;
  [k: string]: unknown;
};

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

    const { data: existing } = await service
      .from("payment_transactions")
      .select("id")
      .eq("invoice_id", invoiceId)
      .maybeSingle();
    if (existing) return jsonResponse({ ResultCode: 0, ResultDesc: "Duplicate" });

    let tenantId: string | null = null;
    let saleId: string | null = null;

    if (billRef.startsWith("sale_")) {
      const { data: sale } = await service
        .from("sales")
        .select("id, tenant_id")
        .eq("id", billRef.slice(5))
        .maybeSingle();
      saleId = sale?.id ?? null;
      tenantId = sale?.tenant_id ?? null;
    } else if (/^[0-9a-f-]{36}$/i.test(billRef)) {
      const { data: tenant } = await service
        .from("tenants")
        .select("id")
        .eq("id", billRef)
        .maybeSingle();
      tenantId = tenant?.id ?? null;
    }

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
        })
        .eq("id", saleId);
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
