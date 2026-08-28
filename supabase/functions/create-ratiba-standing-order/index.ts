import {
  getServiceClient,
  getUserClient,
  handleOptions,
  jsonResponse,
  toKenyaMsisdn,
} from "../_shared/cors.ts";
import {
  createRatibaStandingOrder,
  functionsPublicBase,
  subscriptionAmountKes,
} from "../_shared/daraja.ts";

/**
 * Vendor opts into M-Pesa Ratiba monthly auto-debit for SaaS (plan amount from DB).
 * Triggers Daraja standing-order auth STK; callback finalises registration.
 */
Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Unauthorized" }, 401);

    const userClient = getUserClient(authHeader);
    const {
      data: { user },
    } = await userClient.auth.getUser();
    if (!user) return jsonResponse({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const service = getServiceClient();

    const { data: profile } = await service
      .from("profiles")
      .select("id, tenant_id, phone, role")
      .eq("id", user.id)
      .single();

    if (!profile?.tenant_id) {
      return jsonResponse({ error: "Complete onboarding first" }, 400);
    }

    const AMOUNT = await subscriptionAmountKes(profile.tenant_id);

    const { data: tenant } = await service
      .from("tenants")
      .select("id, name, phone")
      .eq("id", profile.tenant_id)
      .single();

    if (!tenant) return jsonResponse({ error: "Tenant not found" }, 404);

    const { data: sub } = await service
      .from("subscriptions")
      .select("*")
      .eq("tenant_id", tenant.id)
      .single();

    if (!sub) return jsonResponse({ error: "Subscription row missing" }, 404);

    if (sub.auto_debit_enabled && sub.ratiba_standing_order_id) {
      return jsonResponse({
        ok: true,
        already_enabled: true,
        standing_order_id: sub.ratiba_standing_order_id,
        next_billing_date: sub.next_billing_date,
      });
    }

    const phone = toKenyaMsisdn(
      String(body.phone ?? profile.phone ?? tenant.phone),
    );
    const customStoId = crypto.randomUUID();
    const callbackUrl = `${functionsPublicBase()}/ratiba-callback`;

    // First charge typically starts after trial / next period
    const start = body.start_immediately
      ? new Date()
      : sub.current_period_end
      ? new Date(sub.current_period_end)
      : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    const darajaRes = await createRatibaStandingOrder({
      standingOrderName: `InuaBiz-${tenant.name}`.slice(0, 40),
      amount: AMOUNT,
      partyA: phone,
      accountReference: tenant.id.replace(/-/g, "").slice(0, 12),
      transactionDesc: "InuaBiz sub",
      customStoId,
      startDate: start,
      callBackURL: callbackUrl,
    });

    const standingOrderId = String(
      darajaRes.ResponseRefID ??
        darajaRes.StandingOrderID ??
        darajaRes.conversationID ??
        darajaRes.ConversationID ??
        customStoId,
    );

    const nextBilling = new Date(start);

    await service
      .from("subscriptions")
      .update({
        ratiba_custom_sto_id: customStoId,
        ratiba_standing_order_id: standingOrderId,
        ratiba_opt_in_phone: phone,
        ratiba_raw_response: darajaRes,
        // Enabled after successful auth callback; optimistic flag for pending opt-in
        auto_debit_enabled: false,
        next_billing_date: nextBilling.toISOString(),
        ratiba_retry_count: 0,
      })
      .eq("id", sub.id);

    return jsonResponse({
      ok: true,
      message: "Ratiba authorisation prompt sent. Enter M-Pesa PIN to confirm standing order.",
      custom_sto_id: customStoId,
      standing_order_id: standingOrderId,
      next_billing_date: nextBilling.toISOString(),
      daraja: darajaRes,
    });
  } catch (err) {
    console.error(err);
    return jsonResponse(
      { error: err instanceof Error ? err.message : "Unexpected error" },
      500,
    );
  }
});
