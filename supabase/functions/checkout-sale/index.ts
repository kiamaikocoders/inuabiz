import {
  getServiceClient,
  getUserClient,
  handleOptions,
  jsonResponse,
  toKenyaMsisdn,
} from "../_shared/cors.ts";
import { darajaStkPush, functionsPublicBase } from "../_shared/daraja.ts";

type CartItem = {
  product_id: string;
  qty: number;
};

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
    const items = (body.items as CartItem[] | undefined) ?? [];
    const discount = Number(body.discount_amount ?? 0);
    const channel = String(body.channel ?? "MPESA_STK");
    const customerPhoneRaw = body.customer_phone as string | undefined;
    const customerId = (body.customer_id as string | undefined) ?? null;

    if (!items.length) return jsonResponse({ error: "Cart is empty" }, 400);

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

    const productIds = items.map((i) => i.product_id);
    const { data: products, error: pErr } = await service
      .from("products")
      .select("id, name, selling_price, cost_price, tenant_id")
      .eq("tenant_id", profile.tenant_id)
      .in("id", productIds);
    if (pErr || !products?.length) {
      return jsonResponse({ error: "Products not found" }, 400);
    }

    const byId = new Map(products.map((p) => [p.id as string, p]));
    const saleItems = items.map((i) => {
      const p = byId.get(i.product_id);
      if (!p) throw new Error("Unknown product in cart");
      const qty = Number(i.qty);
      const unit = Number(p.selling_price);
      return {
        tenant_id: profile.tenant_id as string,
        product_id: p.id as string,
        product_name: p.name as string,
        unit_price: unit,
        cost_price: Number(p.cost_price ?? 0),
        qty,
        line_total: Math.round(unit * qty * 100) / 100,
      };
    });

    const subtotal = saleItems.reduce((s, i) => s + i.line_total, 0);
    const total = Math.max(0, subtotal - Math.max(0, discount));

    let phone: string | null = null;
    if (customerPhoneRaw) phone = toKenyaMsisdn(customerPhoneRaw);

    const wantsStk = channel === "MPESA_STK";
    if (channel === "CREDIT" && !customerId) {
      return jsonResponse({ error: "Select a customer for credit sales" }, 400);
    }
    const status =
      channel === "CASH"
        ? "PAID"
        : channel === "CREDIT"
          ? "CREDIT"
          : wantsStk
            ? "PENDING_PAYMENT"
            : "DRAFT";

    const { data: sale, error: sErr } = await service
      .from("sales")
      .insert({
        tenant_id: profile.tenant_id,
        customer_id: customerId,
        status,
        subtotal,
        discount_amount: Math.max(0, discount),
        total,
        payment_channel: channel,
        customer_phone: phone,
        created_by: user.id,
        paid_at: status === "PAID" ? new Date().toISOString() : null,
      })
      .select("id, total, status")
      .single();
    if (sErr || !sale) throw new Error(sErr?.message ?? "Failed to create sale");

    const { error: iErr } = await service.from("sale_items").insert(
      saleItems.map((row) => ({ ...row, sale_id: sale.id })),
    );
    if (iErr) throw new Error(iErr.message);

    if (channel === "CREDIT" && customerId) {
      await service.from("credit_entries").insert({
        tenant_id: profile.tenant_id,
        customer_id: customerId,
        sale_id: sale.id,
        entry_type: "CHARGE",
        amount: total,
        created_by: user.id,
      });
    }

    if (!wantsStk) {
      return jsonResponse({
        ok: true,
        sale,
        message: status === "PAID" ? "Sale recorded." : "Credit recorded.",
      });
    }

    if (!phone) {
      await service.from("sales").update({ status: "DRAFT" }).eq("id", sale.id);
      return jsonResponse({ error: "customer_phone required for STK" }, 400);
    }

    let stk;
    try {
      stk = await darajaStkPush({
        amount: total,
        phone,
        accountReference: `sale_${sale.id.replace(/-/g, "").slice(0, 8)}`,
        transactionDesc: "InuaBiz POS",
        callBackURL: `${functionsPublicBase()}/daraja-stk-callback`,
      });
    } catch (stkErr) {
      await service.from("sales").update({ status: "DRAFT" }).eq("id", sale.id);
      throw stkErr;
    }

    const invoiceId = String(stk.CheckoutRequestID ?? `STK-${sale.id}`);
    await service.from("payment_transactions").insert({
      tenant_id: profile.tenant_id,
      sale_id: sale.id,
      purpose: "VENDOR_SALE",
      invoice_id: invoiceId,
      tracking_id: stk.CheckoutRequestID ?? null,
      amount: total,
      currency: "KES",
      payment_channel: "MPESA_STK",
      status: "PENDING",
      account: phone,
      api_ref: `sale_${sale.id}`,
      raw_webhook_payload: stk,
    });

    return jsonResponse({
      ok: true,
      sale,
      checkout_request_id: stk.CheckoutRequestID,
      mock: Boolean(stk.mock),
      message: "STK push sent. Ask the customer to enter their M-Pesa PIN.",
    });
  } catch (err) {
    console.error(err);
    return jsonResponse(
      { error: err instanceof Error ? err.message : "Unexpected error" },
      500,
    );
  }
});
