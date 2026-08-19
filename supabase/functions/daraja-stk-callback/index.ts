import { getServiceClient, handleOptions, jsonResponse } from "../_shared/cors.ts";

type StkItem = { Name?: string; Value?: string | number };
type StkCallback = {
  Body?: {
    stkCallback?: {
      MerchantRequestID?: string;
      CheckoutRequestID?: string;
      ResultCode?: number;
      ResultDesc?: string;
      CallbackMetadata?: { Item?: StkItem[] };
    };
  };
};

function itemMap(items: StkItem[] | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  for (const i of items ?? []) {
    if (i.Name != null && i.Value != null) out[i.Name] = String(i.Value);
  }
  return out;
}

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const payload = (await req.json()) as StkCallback;
    const cb = payload.Body?.stkCallback;
    if (!cb?.CheckoutRequestID) {
      return jsonResponse({ ResultCode: 0, ResultDesc: "Accepted" });
    }

    const service = getServiceClient();
    const success = Number(cb.ResultCode) === 0;
    const meta = itemMap(cb.CallbackMetadata?.Item);
    const receipt = meta.MpesaReceiptNumber ?? null;

    const { data: tx } = await service
      .from("payment_transactions")
      .select("*")
      .or(
        `tracking_id.eq.${cb.CheckoutRequestID},invoice_id.eq.${cb.CheckoutRequestID}`,
      )
      .maybeSingle();

    if (!tx) {
      console.error("STK callback unmatched", cb.CheckoutRequestID);
      return jsonResponse({ ResultCode: 0, ResultDesc: "Accepted" });
    }

    if (tx.status === "COMPLETE") {
      return jsonResponse({ ResultCode: 0, ResultDesc: "Already processed" });
    }

    await service
      .from("payment_transactions")
      .update({
        status: success ? "COMPLETE" : "FAILED",
        raw_webhook_payload: payload,
        api_ref: receipt ?? tx.api_ref,
      })
      .eq("id", tx.id);

    if (success && tx.purpose === "SAAS_SUBSCRIPTION" && tx.tenant_id) {
      const periodEnd = new Date();
      periodEnd.setDate(periodEnd.getDate() + 30);
      await service
        .from("tenants")
        .update({ status: "ACTIVE", access_until: periodEnd.toISOString() })
        .eq("id", tx.tenant_id);
      await service
        .from("subscriptions")
        .update({
          status: "ACTIVE",
          current_period_start: new Date().toISOString(),
          current_period_end: periodEnd.toISOString(),
          last_invoice_id: receipt ?? cb.CheckoutRequestID,
        })
        .eq("tenant_id", tx.tenant_id);
    }

    if (success && tx.purpose === "VENDOR_SALE" && tx.sale_id) {
      await service
        .from("sales")
        .update({
          status: "PAID",
          paid_at: new Date().toISOString(),
          payment_channel: "MPESA_STK",
        })
        .eq("id", tx.sale_id);
    }

    if (!success && tx.sale_id) {
      await service
        .from("sales")
        .update({ status: "DRAFT" })
        .eq("id", tx.sale_id)
        .eq("status", "PENDING_PAYMENT");
    }

    return jsonResponse({ ResultCode: 0, ResultDesc: "Accepted" });
  } catch (err) {
    console.error(err);
    return jsonResponse({ ResultCode: 0, ResultDesc: "Accepted" });
  }
});
