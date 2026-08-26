import { getServiceClient, handleOptions, jsonResponse } from "../_shared/cors.ts";
import { mapPayHeroStatus } from "../_shared/payhero.ts";
import {
  applyCompleteSubscription,
  applyShopAddon,
  parseSubscriptionExternalRef,
} from "../_shared/subscription-billing.ts";

type PayHeroCallback = {
  status?: boolean;
  forward_url?: string;
  response?: {
    Amount?: number;
    CheckoutRequestID?: string;
    ExternalReference?: string;
    MerchantRequestID?: string;
    MpesaReceiptNumber?: string;
    Phone?: string;
    ResultCode?: number;
    ResultDesc?: string;
    Status?: string;
    [k: string]: unknown;
  };
  // Payment button widget shape (fallback)
  paymentSuccess?: boolean;
  reference?: string;
  user_reference?: string;
  providerReference?: string;
  amount?: number;
  [k: string]: unknown;
};

function callbackSuccess(payload: PayHeroCallback): boolean {
  const inner = payload.response;
  if (inner) {
    const status = String(inner.Status ?? "").toLowerCase();
    if (status === "success") return true;
    if (Number(inner.ResultCode) === 0) return true;
  }
  if (payload.paymentSuccess === true) return true;
  if (payload.status === true && payload.response?.ResultCode === 0) return true;
  return false;
}

function receiptFrom(payload: PayHeroCallback): string | null {
  return (
    payload.response?.MpesaReceiptNumber ??
    payload.providerReference ??
    null
  );
}

function externalRefFrom(payload: PayHeroCallback): string {
  return String(
    payload.response?.ExternalReference ??
      payload.user_reference ??
      payload.reference ??
      "",
  ).trim();
}

function payheroRefFrom(payload: PayHeroCallback): string | null {
  const checkout = payload.response?.CheckoutRequestID;
  if (checkout) return String(checkout);
  if (payload.reference) return String(payload.reference);
  return null;
}

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const payload = (await req.json()) as PayHeroCallback;
    const service = getServiceClient();
    const success = callbackSuccess(payload);
    const externalRef = externalRefFrom(payload);
    const payheroRef =
      payheroRefFrom(payload) ??
      externalRef ??
      `PH-${Date.now()}`;
    const amount = Number(payload.response?.Amount ?? payload.amount ?? 0);
    const receipt = receiptFrom(payload);
    const mappedStatus = success
      ? "SUCCESS"
      : mapPayHeroStatus(payload.response?.Status) === "FAILED"
        ? "FAILED"
        : "PENDING";

    const { data: existingTx } = await service
      .from("payment_transactions")
      .select("*")
      .or(`invoice_id.eq.${payheroRef},tracking_id.eq.${payheroRef},api_ref.eq.${externalRef}`)
      .maybeSingle();

    if (existingTx?.status === "COMPLETE" && success) {
      return jsonResponse({ ok: true, deduped: true });
    }

    let tenantId = (existingTx?.tenant_id as string | null) ?? null;
    const parsed = parseSubscriptionExternalRef(externalRef);
    if (!tenantId && parsed.tenantId) tenantId = parsed.tenantId;

    const txStatus = success ? "COMPLETE" : mappedStatus === "FAILED" ? "FAILED" : "PENDING";

    let paymentTransactionId = existingTx?.id as string | undefined;

    const txRow = {
      tenant_id: tenantId,
      sale_id: null,
      purpose: "SAAS_SUBSCRIPTION" as const,
      invoice_id: payheroRef,
      tracking_id: payload.response?.CheckoutRequestID ?? existingTx?.tracking_id ?? null,
      amount: amount || Number(existingTx?.amount ?? 0),
      currency: "KES",
      payment_channel: "PAYHERO" as const,
      status: txStatus,
      account: payload.response?.Phone ?? existingTx?.account,
      api_ref: externalRef || existingTx?.api_ref,
      raw_webhook_payload: payload,
    };

    if (existingTx) {
      await service.from("payment_transactions").update(txRow).eq("id", existingTx.id);
    } else if (tenantId) {
      const { data: inserted, error } = await service
        .from("payment_transactions")
        .insert(txRow)
        .select("id")
        .single();
      if (error) throw error;
      paymentTransactionId = inserted.id;
    }

    if (tenantId) {
      await service.from("subscription_payments").upsert(
        {
          tenant_id: tenantId,
          payhero_reference: payheroRef,
          mpesa_receipt_code: receipt,
          amount: amount || Number(existingTx?.amount ?? 0),
          status: mappedStatus,
          payment_transaction_id: paymentTransactionId ?? null,
        },
        { onConflict: "payhero_reference" },
      );
    }

    if (success && tenantId) {
      await applyCompleteSubscription(service, tenantId, payheroRef, receipt);

      const meta = (existingTx?.metadata ?? null) as Record<string, unknown> | null;
      if (parsed.kind === "shop_addon" || meta?.kind === "SHOP_ADDON") {
        await applyShopAddon(service, tenantId, meta);
      }
    }

    return jsonResponse({ ok: true, status: mappedStatus, reference: payheroRef });
  } catch (err) {
    console.error(err);
    return jsonResponse(
      { error: err instanceof Error ? err.message : "Unexpected error" },
      500,
    );
  }
});
