import {
  getServiceClient,
  getUserClient,
  handleOptions,
  jsonResponse,
  toKenyaMsisdn,
} from "../_shared/cors.ts";
import { darajaStkPush, functionsPublicBase } from "../_shared/daraja.ts";

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

    const body = await req.json();
    const saleId = body.sale_id as string | undefined;
    const customerPhoneRaw = body.customer_phone as string | undefined;
    if (!saleId || !customerPhoneRaw) {
      return jsonResponse({ error: "sale_id and customer_phone required" }, 400);
    }

    const service = getServiceClient();
    const { data: profile } = await service
      .from("profiles")
      .select("id, tenant_id")
      .eq("id", user.id)
      .single();
    if (!profile?.tenant_id) {
      return jsonResponse({ error: "Complete onboarding first" }, 400);
    }

    const { data: access } = await service.rpc("tenant_has_access", {
      p_tenant_id: profile.tenant_id,
    });
    if (!access) {
      return jsonResponse({ error: "Subscription expired. Renew to continue." }, 402);
    }

    const { data: sale, error: saleErr } = await service
      .from("sales")
      .select("id, tenant_id, total, status")
      .eq("id", saleId)
      .eq("tenant_id", profile.tenant_id)
      .single();
    if (saleErr || !sale) return jsonResponse({ error: "Sale not found" }, 404);
    if (sale.status === "PAID") return jsonResponse({ error: "Sale already paid" }, 409);

    const amount = Number(sale.total);
    if (!(amount > 0)) return jsonResponse({ error: "Sale total must be > 0" }, 400);

    const phone = toKenyaMsisdn(customerPhoneRaw);
    const stk = await darajaStkPush({
      amount,
      phone,
      accountReference: `sale_${sale.id.replace(/-/g, "").slice(0, 8)}`,
      transactionDesc: "InuaBiz POS",
      callBackURL: `${functionsPublicBase()}/daraja-stk-callback`,
    });

    const invoiceId = String(stk.CheckoutRequestID ?? `STK-${sale.id}`);

    await service
      .from("sales")
      .update({
        status: "PENDING_PAYMENT",
        payment_channel: "MPESA_STK",
        customer_phone: phone,
      })
      .eq("id", sale.id);

    const { data: tx, error: txErr } = await service
      .from("payment_transactions")
      .insert({
        tenant_id: sale.tenant_id,
        sale_id: sale.id,
        purpose: "VENDOR_SALE",
        invoice_id: invoiceId,
        tracking_id: stk.CheckoutRequestID ?? null,
        amount,
        currency: "KES",
        payment_channel: "MPESA_STK",
        status: "PENDING",
        account: phone,
        api_ref: `sale_${sale.id}`,
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
      message: "STK push sent to customer phone.",
    });
  } catch (err) {
    console.error(err);
    return jsonResponse(
      { error: err instanceof Error ? err.message : "Unexpected error" },
      500,
    );
  }
});
