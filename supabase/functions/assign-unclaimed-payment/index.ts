import {
  getServiceClient,
  getUserClient,
  handleOptions,
  jsonResponse,
} from "../_shared/cors.ts";

/**
 * Super-admin: assign an unclaimed IntaSend payment to a tenant
 * and optionally extend subscription access.
 */
Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Unauthorized" }, 401);

    const userClient = getUserClient(authHeader);
    const {
      data: { user },
    } = await userClient.auth.getUser();
    if (!user) return jsonResponse({ error: "Unauthorized" }, 401);

    const service = getServiceClient();
    const { data: profile } = await service
      .from("profiles")
      .select("id, role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "SUPER_ADMIN") {
      return jsonResponse({ error: "Forbidden" }, 403);
    }

    const body = await req.json();
    const unclaimedId = body.unclaimed_payment_id as string;
    const tenantId = body.tenant_id as string;
    const asSubscription = Boolean(body.as_subscription ?? true);

    if (!unclaimedId || !tenantId) {
      return jsonResponse(
        { error: "unclaimed_payment_id and tenant_id required" },
        400,
      );
    }

    const { data: unclaimed, error: uErr } = await service
      .from("unclaimed_payments")
      .select("*")
      .eq("id", unclaimedId)
      .is("resolved_at", null)
      .single();

    if (uErr || !unclaimed) {
      return jsonResponse({ error: "Unclaimed payment not found" }, 404);
    }

    if (unclaimed.payment_transaction_id) {
      await service
        .from("payment_transactions")
        .update({
          tenant_id: tenantId,
          purpose: asSubscription ? "SAAS_SUBSCRIPTION" : "OTHER",
          status: "COMPLETE",
        })
        .eq("id", unclaimed.payment_transaction_id);
    }

    if (asSubscription) {
      const periodEnd = new Date();
      periodEnd.setDate(periodEnd.getDate() + 30);
      await service
        .from("tenants")
        .update({
          status: "ACTIVE",
          access_until: periodEnd.toISOString(),
        })
        .eq("id", tenantId);
      await service
        .from("subscriptions")
        .update({
          status: "ACTIVE",
          current_period_end: periodEnd.toISOString(),
          last_invoice_id: unclaimed.invoice_id,
        })
        .eq("tenant_id", tenantId);
    }

    await service
      .from("unclaimed_payments")
      .update({
        resolved_tenant_id: tenantId,
        resolved_by: user.id,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", unclaimedId);

    return jsonResponse({ ok: true, tenant_id: tenantId });
  } catch (err) {
    console.error(err);
    return jsonResponse(
      { error: err instanceof Error ? err.message : "Unexpected error" },
      500,
    );
  }
});
