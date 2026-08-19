import {
  getServiceClient,
  handleOptions,
  intasendPaymentStatus,
  jsonResponse,
  mapIntaSendState,
} from "../_shared/cors.ts";
import { darajaStkQuery, resolveSecret } from "../_shared/daraja.ts";

/**
 * Re-check PENDING payments older than 3 minutes (Daraja STK first, then IntaSend).
 * Invoke via cron or manually with x-cron-secret / service role.
 */
Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  if (req.method !== "POST" && req.method !== "GET") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const cronSecret =
      Deno.env.get("CRON_SECRET") ?? (await resolveSecret("CRON_SECRET"));
    const auth = req.headers.get("Authorization") ?? "";
    const headerSecret = req.headers.get("x-cron-secret");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const authorized =
      (cronSecret && headerSecret === cronSecret) ||
      auth === `Bearer ${serviceKey}`;

    if (!authorized) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const service = getServiceClient();
    const cutoff = new Date(Date.now() - 3 * 60 * 1000).toISOString();

    const { data: pending, error } = await service
      .from("payment_transactions")
      .select("id, invoice_id, purpose, tenant_id, sale_id, api_ref, payment_channel, tracking_id")
      .eq("status", "PENDING")
      .lt("created_at", cutoff)
      .limit(50);

    if (error) throw error;

    const results: Array<{ invoice_id: string; state: string }> = [];

    for (const row of pending ?? []) {
      try {
        const checkoutId = String(row.tracking_id ?? row.invoice_id);
        const isDarajaStk =
          row.payment_channel === "MPESA_STK" ||
          checkoutId.startsWith("ws_CO_") ||
          checkoutId.startsWith("mock-c-");

        let mapped: "PENDING" | "COMPLETE" | "FAILED" | "CANCELLED" = "PENDING";
        let payload: unknown = null;

        if (isDarajaStk) {
          const queried = await darajaStkQuery(checkoutId);
          payload = queried.raw;
          mapped = queried.outcome === "COMPLETE"
            ? "COMPLETE"
            : queried.outcome === "FAILED"
              ? "FAILED"
              : "PENDING";
        } else {
          const statusPayload = await intasendPaymentStatus(row.invoice_id);
          payload = statusPayload;
          const state =
            statusPayload.invoice?.state ?? statusPayload.state ?? "PENDING";
          mapped = mapIntaSendState(state);
        }

        if (mapped === "PENDING") {
          results.push({ invoice_id: row.invoice_id, state: mapped });
          continue;
        }

        await service
          .from("payment_transactions")
          .update({
            status: mapped,
            raw_webhook_payload: payload,
          })
          .eq("id", row.id);

        if (mapped === "COMPLETE") {
          if (row.purpose === "SAAS_SUBSCRIPTION" && row.tenant_id) {
            const periodEnd = new Date();
            periodEnd.setDate(periodEnd.getDate() + 30);
            await service
              .from("tenants")
              .update({
                status: "ACTIVE",
                access_until: periodEnd.toISOString(),
              })
              .eq("id", row.tenant_id);
            await service
              .from("subscriptions")
              .update({
                status: "ACTIVE",
                current_period_end: periodEnd.toISOString(),
                last_invoice_id: row.invoice_id,
              })
              .eq("tenant_id", row.tenant_id);
          }
          if (row.purpose === "VENDOR_SALE" && row.sale_id) {
            await service
              .from("sales")
              .update({
                status: "PAID",
                paid_at: new Date().toISOString(),
                payment_channel: "MPESA_STK",
              })
              .eq("id", row.sale_id);
          }
        }

        if (mapped === "FAILED" && row.sale_id) {
          await service
            .from("sales")
            .update({ status: "DRAFT" })
            .eq("id", row.sale_id)
            .eq("status", "PENDING_PAYMENT");
        }

        results.push({ invoice_id: row.invoice_id, state: mapped });
      } catch (e) {
        console.error("poll failed", row.invoice_id, e);
        results.push({ invoice_id: row.invoice_id, state: "ERROR" });
      }
    }

    return jsonResponse({
      ok: true,
      checked: results.length,
      results,
    });
  } catch (err) {
    console.error(err);
    return jsonResponse(
      { error: err instanceof Error ? err.message : "Unexpected error" },
      500,
    );
  }
});
