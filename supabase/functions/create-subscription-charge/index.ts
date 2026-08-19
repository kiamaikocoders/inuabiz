import {
  getServiceClient,
  getUserClient,
  handleOptions,
  jsonResponse,
  toKenyaMsisdn,
} from "../_shared/cors.ts";
import {
  darajaStkPush,
  functionsPublicBase,
  subscriptionAmountKes,
} from "../_shared/daraja.ts";

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
    const amount = await subscriptionAmountKes();

    const { data: profile } = await service
      .from("profiles")
      .select("id, tenant_id, phone")
      .eq("id", user.id)
      .single();
    if (!profile?.tenant_id) {
      return jsonResponse({ error: "Complete onboarding first" }, 400);
    }

    const { data: tenant } = await service
      .from("tenants")
      .select("id, phone, name")
      .eq("id", profile.tenant_id)
      .single();
    if (!tenant) return jsonResponse({ error: "Tenant not found" }, 404);

    const phone = toKenyaMsisdn(
      String(body.phone ?? profile.phone ?? tenant.phone),
    );

    const stk = await darajaStkPush({
      amount,
      phone,
      accountReference: tenant.id.replace(/-/g, "").slice(0, 12),
      transactionDesc: "InuaBiz sub",
      callBackURL: `${functionsPublicBase()}/daraja-stk-callback`,
    });

    const invoiceId = String(stk.CheckoutRequestID ?? `SUB-${tenant.id.slice(0, 8)}`);
    const { data: tx, error: txErr } = await service
      .from("payment_transactions")
      .insert({
        tenant_id: tenant.id,
        purpose: "SAAS_SUBSCRIPTION",
        invoice_id: invoiceId,
        tracking_id: stk.CheckoutRequestID ?? null,
        amount,
        currency: "KES",
        payment_channel: "MPESA_STK",
        status: "PENDING",
        account: phone,
        api_ref: `saas_${tenant.id}`,
        raw_webhook_payload: stk,
      })
      .select("id, invoice_id, status, amount")
      .single();
    if (txErr) return jsonResponse({ error: "Failed to record payment" }, 500);

    return jsonResponse({
      ok: true,
      transaction: tx,
      checkout_request_id: stk.CheckoutRequestID,
      mock: Boolean(stk.mock),
      message: "STK push sent. Enter M-Pesa PIN on your phone.",
    });
  } catch (err) {
    console.error(err);
    return jsonResponse(
      { error: err instanceof Error ? err.message : "Unexpected error" },
      500,
    );
  }
});
