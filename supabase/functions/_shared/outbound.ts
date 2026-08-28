/** Fire-and-forget outbound email/SMS dispatcher. Never throws. */
export async function dispatchOutbound(payload: Record<string, unknown>): Promise<void> {
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) return;
    await fetch(`${url}/functions/v1/dispatch-outbound`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error("dispatch-outbound skipped", err);
  }
}

export type PaymentEmailTx = {
  id?: string;
  purpose?: string | null;
  tenant_id?: string | null;
  sale_id?: string | null;
  amount?: number | null;
  account?: string | null;
  api_ref?: string | null;
  metadata?: Record<string, unknown> | null;
};

/** Map a Daraja/poll payment result to a branded email payload, or null if none. */
export function paymentEmailPayload(
  tx: PaymentEmailTx,
  success: boolean,
): Record<string, unknown> | null {
  const meta = (tx.metadata ?? {}) as {
    kind?: string;
    shop?: { name?: string };
    email_receipt?: boolean;
  };
  const amount =
    tx.amount != null && !Number.isNaN(Number(tx.amount))
      ? `KES ${Number(tx.amount).toLocaleString("en-KE")}`
      : "";
  const txId = tx.id ?? tx.api_ref ?? "tx";

  if (tx.purpose === "SAAS_SUBSCRIPTION" && meta.kind === "SHOP_ADDON") {
    return {
      tenant_id: tx.tenant_id,
      template_id: success ? "extra-shop-paid" : "extra-shop-failed",
      vars: {
        shop: String(meta.shop?.name ?? ""),
        amount,
        reason: success ? "" : "PIN cancelled or timed out",
      },
      idempotency_key: `addon/${success ? "paid" : "failed"}/${txId}`,
    };
  }

  if (tx.purpose === "SAAS_SUBSCRIPTION") {
    return {
      tenant_id: tx.tenant_id,
      template_id: success ? "subscription-paid" : "payment-stk-failed",
      vars: {
        amount,
        phone: String(tx.account ?? ""),
      },
      idempotency_key: `sub/${success ? "paid" : "failed"}/${txId}`,
    };
  }

  if (success && tx.purpose === "VENDOR_SALE" && tx.sale_id && meta.email_receipt === true) {
    return {
      sale_id: tx.sale_id,
      tenant_id: tx.tenant_id,
      email_receipt: true,
    };
  }

  return null;
}
