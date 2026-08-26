import {
  getServiceClient,
  getUserClient,
  handleOptions,
  jsonResponse,
  toKenyaMsisdn,
} from "../_shared/cors.ts";
import { functionsPublicBase, payheroStkPush } from "../_shared/payhero.ts";

const SHOP_PRICE_KES = 3000;

/**
 * Extra shop: PayHero STK KES 3,000 first. Shop row is inserted in payhero-webhook
 * after PIN success (metadata.kind = SHOP_ADDON).
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
    const name = String(body.name ?? "").trim();
    const category = String(body.category ?? "DUKA").toUpperCase();
    const address = String(body.address_text ?? "").trim();
    if (name.length < 2) return jsonResponse({ error: "Shop name required" }, 400);

    const service = getServiceClient();
    const { data: profile } = await service
      .from("profiles")
      .select("id, tenant_id, phone, role")
      .eq("id", user.id)
      .single();
    if (!profile?.tenant_id) return jsonResponse({ error: "Complete onboarding first" }, 400);
    if (profile.role !== "VENDOR_ADMIN") {
      return jsonResponse({ error: "Only the owner can add a shop" }, 403);
    }

    const { count } = await service
      .from("shops")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", profile.tenant_id);
    if (!count || count < 1) {
      return jsonResponse({ error: "Create your first shop during onboarding" }, 400);
    }

    const { data: tenant } = await service
      .from("tenants")
      .select("id, phone")
      .eq("id", profile.tenant_id)
      .single();
    if (!tenant) return jsonResponse({ error: "Tenant not found" }, 404);

    const phone = toKenyaMsisdn(String(body.phone ?? profile.phone ?? tenant.phone));
    const externalRef = `shopadd_${tenant.id}`;
    const stk = await payheroStkPush({
      amount: SHOP_PRICE_KES,
      phone,
      externalReference: externalRef,
      callbackUrl: `${functionsPublicBase()}/payhero-webhook`,
    });

    const payheroRef = String(stk.reference ?? stk.CheckoutRequestID ?? `SHOP-${crypto.randomUUID()}`);
    const { data: tx, error: txErr } = await service
      .from("payment_transactions")
      .insert({
        tenant_id: tenant.id,
        purpose: "SAAS_SUBSCRIPTION",
        invoice_id: payheroRef,
        tracking_id: stk.CheckoutRequestID ?? null,
        amount: SHOP_PRICE_KES,
        currency: "KES",
        payment_channel: "PAYHERO",
        status: "PENDING",
        account: phone,
        api_ref: externalRef,
        raw_webhook_payload: stk,
        metadata: {
          kind: "SHOP_ADDON",
          shop: { name, category, address_text: address || null },
        },
      })
      .select("id, invoice_id, status, amount")
      .single();
    if (txErr) return jsonResponse({ error: txErr.message }, 500);

    await service.from("subscription_payments").insert({
      tenant_id: tenant.id,
      payhero_reference: payheroRef,
      amount: SHOP_PRICE_KES,
      status: String(stk.status ?? "QUEUED").toUpperCase(),
      payment_transaction_id: tx.id,
    });

    return jsonResponse({
      ok: true,
      transaction: tx,
      payhero_reference: payheroRef,
      checkout_request_id: stk.CheckoutRequestID,
      message: "Enter M-Pesa PIN. The new shop is created after payment.",
    });
  } catch (err) {
    console.error(err);
    return jsonResponse(
      { error: err instanceof Error ? err.message : "Unexpected error" },
      500,
    );
  }
});
