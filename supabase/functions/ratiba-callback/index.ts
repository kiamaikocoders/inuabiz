import { getServiceClient, handleOptions, jsonResponse } from "../_shared/cors.ts";
import { subscriptionAmountKes } from "../_shared/daraja.ts";

const MAX_RETRIES = 3;

type RatibaCallback = {
  Result?: {
    ResultCode?: number | string;
    ResultDesc?: string;
    ResultParameters?: {
      ResultParameter?: Array<{ Key?: string; Value?: string }> | {
        Key?: string;
        Value?: string;
      };
    };
    ConversationID?: string;
    OriginatorConversationID?: string;
    TransactionID?: string;
  };
  ResponseCode?: string;
  ResponseDescription?: string;
  ResponseRefID?: string;
  CustomStoId?: string;
  StandingOrderID?: string;
  Body?: Record<string, unknown>;
  [k: string]: unknown;
};

function flattenParams(payload: RatibaCallback): Record<string, string> {
  const out: Record<string, string> = {};
  const rp = payload.Result?.ResultParameters?.ResultParameter;
  const list = Array.isArray(rp) ? rp : rp ? [rp] : [];
  for (const p of list) {
    if (p.Key && p.Value != null) out[p.Key] = String(p.Value);
  }
  return out;
}

function isSuccess(payload: RatibaCallback): boolean {
  const code = payload.Result?.ResultCode ?? payload.ResponseCode;
  return code === 0 || code === "0" || code === "00";
}

/**
 * Daraja Ratiba callback — standing-order registration OR monthly debit result.
 * Extends tenant access on success; increments retries and may PAST_DUE-lock on failure.
 */
Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const payload = (await req.json()) as RatibaCallback;
    const service = getServiceClient();
    const AMOUNT = await subscriptionAmountKes();
    const params = flattenParams(payload);

    const customStoId =
      payload.CustomStoId ??
      params.CustomStoId ??
      params.customStoId ??
      null;

    const standingOrderId =
      payload.StandingOrderID ??
      payload.ResponseRefID ??
      params.StandingOrderID ??
      payload.Result?.ConversationID ??
      null;

    let query = service.from("subscriptions").select("*");
    if (customStoId) {
      query = query.eq("ratiba_custom_sto_id", customStoId);
    } else if (standingOrderId) {
      query = query.eq("ratiba_standing_order_id", standingOrderId);
    } else {
      console.error("Ratiba callback missing identifiers", payload);
      return jsonResponse({ ResultCode: 0, ResultDesc: "Accepted" });
    }

    const { data: sub, error } = await query.maybeSingle();
    if (error) console.error(error);
    if (!sub) {
      console.error("No subscription for Ratiba callback", { customStoId, standingOrderId });
      return jsonResponse({ ResultCode: 0, ResultDesc: "Accepted" });
    }

    const success = isSuccess(payload);
    const tenantId = sub.tenant_id as string;

    if (success) {
      const periodEnd = new Date();
      periodEnd.setDate(periodEnd.getDate() + 30);

      const isDebit =
        params.Amount != null ||
        params.TransAmount != null ||
        payload.Result?.TransactionID != null;

      await service
        .from("subscriptions")
        .update({
          auto_debit_enabled: true,
          ratiba_standing_order_id:
            standingOrderId ?? sub.ratiba_standing_order_id,
          ratiba_raw_response: payload,
          ratiba_retry_count: 0,
          ratiba_last_attempt_at: new Date().toISOString(),
          status: "ACTIVE",
          current_period_start: new Date().toISOString(),
          current_period_end: periodEnd.toISOString(),
          next_billing_date: periodEnd.toISOString(),
          amount: AMOUNT,
        })
        .eq("id", sub.id);

      await service
        .from("tenants")
        .update({
          status: "ACTIVE",
          access_until: periodEnd.toISOString(),
        })
        .eq("id", tenantId);

      if (isDebit || sub.auto_debit_enabled) {
        const invoiceId = `RATIBA-${standingOrderId ?? sub.id}-${Date.now()}`;
        const { data: tx } = await service
          .from("payment_transactions")
          .insert({
            tenant_id: tenantId,
            purpose: "SAAS_SUBSCRIPTION",
            invoice_id: invoiceId,
            amount: AMOUNT,
            currency: "KES",
            payment_channel: "RATIBA",
            status: "COMPLETE",
            account: sub.ratiba_opt_in_phone,
            api_ref: `ratiba_${tenantId}`,
            raw_webhook_payload: payload,
          })
          .select("id")
          .single();

        await service.from("ratiba_debit_attempts").insert({
          tenant_id: tenantId,
          subscription_id: sub.id,
          standing_order_id: standingOrderId ?? sub.ratiba_standing_order_id,
          amount: AMOUNT,
          status: "COMPLETE",
          attempt_number: (sub.ratiba_retry_count ?? 0) + 1,
          raw_callback: payload,
          payment_transaction_id: tx?.id ?? null,
        });
      }

      const { data: admins } = await service
        .from("profiles")
        .select("id")
        .eq("role", "SUPER_ADMIN")
        .eq("is_active", true);

      if (admins?.length) {
        await service.from("notifications").insert(
          admins.map((a) => ({
            recipient_id: a.id,
            recipient_role: "SUPER_ADMIN",
            title: "Ratiba payment received",
            message: `Tenant ${tenantId} auto-debit succeeded (KES ${AMOUNT}).`,
            type: "SUBSCRIPTION",
            priority: "NORMAL",
            metadata: { tenant_id: tenantId, channel: "RATIBA" },
          })),
        );
      }
    } else {
      const retries = (sub.ratiba_retry_count ?? 0) + 1;
      await service
        .from("subscriptions")
        .update({
          ratiba_retry_count: retries,
          ratiba_last_attempt_at: new Date().toISOString(),
          ratiba_raw_response: payload,
          status: retries >= MAX_RETRIES ? "PAST_DUE" : sub.status,
        })
        .eq("id", sub.id);

      await service.from("ratiba_debit_attempts").insert({
        tenant_id: tenantId,
        subscription_id: sub.id,
        standing_order_id: standingOrderId ?? sub.ratiba_standing_order_id,
        amount: AMOUNT,
        status: "FAILED",
        attempt_number: retries,
        raw_callback: payload,
      });

      if (retries >= MAX_RETRIES) {
        // Soft lock write access (PAST_DUE → tenant_has_access = false)
        await service
          .from("tenants")
          .update({ status: "PAST_DUE" })
          .eq("id", tenantId);

        const { data: vendors } = await service
          .from("profiles")
          .select("id")
          .eq("tenant_id", tenantId)
          .eq("role", "VENDOR_ADMIN");

        if (vendors?.length) {
          await service.from("notifications").insert(
            vendors.map((v) => ({
              tenant_id: tenantId,
              recipient_id: v.id,
              recipient_role: "VENDOR_ADMIN",
              title: "Subscription payment failed",
              message:
                "M-Pesa Ratiba could not collect KES 3,000 after 3 retries. Access is paused until you renew.",
              type: "SUBSCRIPTION",
              priority: "CRITICAL",
              metadata: { retries, channel: "RATIBA" },
            })),
          );
        }
      }
    }

    // Daraja expects a success ack on the callback HTTP response
    return jsonResponse({ ResultCode: 0, ResultDesc: "Accepted" });
  } catch (err) {
    console.error(err);
    return jsonResponse({ ResultCode: 0, ResultDesc: "Accepted" });
  }
});
