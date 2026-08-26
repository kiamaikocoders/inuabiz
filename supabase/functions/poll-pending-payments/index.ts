import {
  getServiceClient,
  handleOptions,
  jsonResponse,
} from "../_shared/cors.ts";
import { resolveSecret } from "../_shared/daraja.ts";
import {
  mapPayHeroStatus,
  payheroTransactionStatus,
} from "../_shared/payhero.ts";
import {
  applyCompleteSubscription,
  applyShopAddon,
} from "../_shared/subscription-billing.ts";

/**
 * Re-check PENDING PayHero subscription payments older than 3 minutes.
 * Legacy Daraja STK rows are still queried when channel is MPESA_STK.
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
      .select("id, invoice_id, purpose, tenant_id, sale_id, api_ref, payment_channel, tracking_id, metadata")
      .eq("status", "PENDING")
      .lt("created_at", cutoff)
      .limit(50);

    if (error) throw error;

    const results: Array<{ invoice_id: string; state: string }> = [];

    for (const row of pending ?? []) {
      try {
        const channel = String(row.payment_channel ?? "");
        let mapped: "PENDING" | "COMPLETE" | "FAILED" | "CANCELLED" = "PENDING";
        let payload: unknown = null;

        if (channel === "PAYHERO") {
          const statusPayload = await payheroTransactionStatus(String(row.invoice_id));
          payload = statusPayload;
          mapped = mapPayHeroStatus(statusPayload.status);
        } else if (channel === "MPESA_STK") {
          const { darajaStkQuery } = await import("../_shared/daraja.ts");
          const checkoutId = String(row.tracking_id ?? row.invoice_id);
          const queried = await darajaStkQuery(checkoutId);
          payload = queried.raw;
          mapped = queried.outcome === "COMPLETE"
            ? "COMPLETE"
            : queried.outcome === "FAILED"
              ? "FAILED"
              : "PENDING";
        } else {
          results.push({ invoice_id: row.invoice_id, state: "SKIP" });
          continue;
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
            await applyCompleteSubscription(
              service,
              row.tenant_id as string,
              row.invoice_id as string,
            );
            const meta = row.metadata as Record<string, unknown> | null;
            if (meta?.kind === "SHOP_ADDON") {
              await applyShopAddon(service, row.tenant_id as string, meta);
            }
            await service
              .from("subscription_payments")
              .update({ status: "SUCCESS" })
              .eq("payhero_reference", row.invoice_id);
          }
        }

        if (mapped === "FAILED" && row.purpose === "SAAS_SUBSCRIPTION") {
          await service
            .from("subscription_payments")
            .update({ status: "FAILED" })
            .eq("payhero_reference", row.invoice_id);
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
