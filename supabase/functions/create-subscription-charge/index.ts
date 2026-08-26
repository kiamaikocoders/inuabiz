import {
  getServiceClient,
  handleOptions,
  jsonResponse,
  requireAuthUser,
  toKenyaMsisdn,
} from "../_shared/cors.ts";
import { subscriptionAmountKes } from "../_shared/daraja.ts";
import { functionsPublicBase, payheroStkPush } from "../_shared/payhero.ts";

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const auth = await requireAuthUser(req);
    if (auth instanceof Response) return auth;
    const { user } = auth;

    const body = await req.json().catch(() => ({}));
    const service = getServiceClient();

    const { data: profile } = await service
      .from("profiles")
      .select("id, tenant_id, phone")
      .eq("id", user.id)
      .single();
    if (!profile?.tenant_id) {
      return jsonResponse({ error: "Complete onboarding first" }, 400);
    }

    const amount = await subscriptionAmountKes(profile.tenant_id as string);

    const { data: tenant } = await service
      .from("tenants")
      .select("id, phone, name")
      .eq("id", profile.tenant_id)
      .single();
    if (!tenant) return jsonResponse({ error: "Tenant not found" }, 404);

    const phone = toKenyaMsisdn(
      String(body.phone ?? profile.phone ?? tenant.phone),
    );

    const externalRef = `SUB_${tenant.id}`;
    const stk = await payheroStkPush({
      amount,
      phone,
      externalReference: externalRef,
      customerName: (tenant.name as string) ?? undefined,
      callbackUrl: `${functionsPublicBase()}/payhero-webhook`,
    });

    const payheroRef = String(stk.reference ?? stk.CheckoutRequestID ?? `SUB-${tenant.id.slice(0, 8)}`);

    const { data: tx, error: txErr } = await service
      .from("payment_transactions")
      .insert({
        tenant_id: tenant.id,
        purpose: "SAAS_SUBSCRIPTION",
        invoice_id: payheroRef,
        tracking_id: stk.CheckoutRequestID ?? null,
        amount,
        currency: "KES",
        payment_channel: "PAYHERO",
        status: "PENDING",
        account: phone,
        api_ref: externalRef,
        raw_webhook_payload: stk,
      })
      .select("id, invoice_id, status, amount")
      .single();
    if (txErr) return jsonResponse({ error: "Failed to record payment" }, 500);

    await service.from("subscription_payments").insert({
      tenant_id: tenant.id,
      payhero_reference: payheroRef,
      amount,
      status: String(stk.status ?? "QUEUED").toUpperCase(),
      payment_transaction_id: tx.id,
    });

    return jsonResponse({
      ok: true,
      transaction: tx,
      payhero_reference: payheroRef,
      checkout_request_id: stk.CheckoutRequestID,
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
