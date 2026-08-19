import { getServiceClient, handleOptions, jsonResponse } from "../_shared/cors.ts";

const MAX_RETRIES = 3;
const RETRY_WINDOW_MS = 72 * 60 * 60 * 1000; // 72 hours

/**
 * Cron: after billing day, if Ratiba debit still unpaid / retries pending,
 * escalate to PAST_DUE after 3 failures within 72h (addendum §3.1).
 *
 * Note: actual debit retries are performed by Safaricom Ratiba;
 * this job reconciles local state when callbacks were missed.
 */
Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;
  if (req.method !== "POST" && req.method !== "GET") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const cronSecret = Deno.env.get("CRON_SECRET");
    const auth = req.headers.get("Authorization") ?? "";
    const headerSecret = req.headers.get("x-cron-secret");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const authorized =
      (cronSecret && headerSecret === cronSecret) ||
      auth === `Bearer ${serviceKey}`;

    if (!authorized) return jsonResponse({ error: "Unauthorized" }, 401);

    const service = getServiceClient();
    const now = Date.now();

    const { data: due, error } = await service
      .from("subscriptions")
      .select("id, tenant_id, next_billing_date, ratiba_retry_count, ratiba_last_attempt_at, auto_debit_enabled, status")
      .eq("auto_debit_enabled", true)
      .lte("next_billing_date", new Date().toISOString())
      .limit(100);

    if (error) throw error;

    const actions: Array<{ tenant_id: string; action: string }> = [];

    for (const sub of due ?? []) {
      const last = sub.ratiba_last_attempt_at
        ? new Date(sub.ratiba_last_attempt_at).getTime()
        : new Date(sub.next_billing_date).getTime();
      const elapsed = now - last;
      const retries = sub.ratiba_retry_count ?? 0;

      if (retries >= MAX_RETRIES && elapsed >= 0) {
        await service
          .from("tenants")
          .update({ status: "PAST_DUE" })
          .eq("id", sub.tenant_id);
        await service
          .from("subscriptions")
          .update({ status: "PAST_DUE" })
          .eq("id", sub.id);
        actions.push({ tenant_id: sub.tenant_id, action: "locked_past_due" });
        continue;
      }

      // Within 72h window: wait for Safaricom retries / callbacks
      if (elapsed < RETRY_WINDOW_MS) {
        actions.push({ tenant_id: sub.tenant_id, action: "awaiting_ratiba_retry" });
        continue;
      }

      // Past 72h with incomplete retries → lock
      await service
        .from("tenants")
        .update({ status: "PAST_DUE" })
        .eq("id", sub.tenant_id);
      await service
        .from("subscriptions")
        .update({
          status: "PAST_DUE",
          ratiba_retry_count: Math.max(retries, MAX_RETRIES),
        })
        .eq("id", sub.id);
      actions.push({ tenant_id: sub.tenant_id, action: "locked_after_72h" });
    }

    return jsonResponse({ ok: true, checked: due?.length ?? 0, actions });
  } catch (err) {
    console.error(err);
    return jsonResponse(
      { error: err instanceof Error ? err.message : "Unexpected error" },
      500,
    );
  }
});
