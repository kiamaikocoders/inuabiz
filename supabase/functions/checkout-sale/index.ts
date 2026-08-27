import {
  getServiceClient,
  getUserClient,
  handleOptions,
  jsonResponse,
} from "../_shared/cors.ts";

type CartItem = {
  product_id: string;
  qty: number;
};

function saleBillRef(saleId: string): string {
  return saleId.replace(/-/g, "").slice(0, 8).toUpperCase();
}

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
    let channel = String(body.channel ?? "CASH").toUpperCase();
    if (channel === "MPESA_STK") channel = "MPESA";
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

    if (channel === "CREDIT" && !customerId) {
      return jsonResponse({ error: "Select a customer for credit sales" }, 400);
    }

    const status =
      channel === "CASH"
        ? "PAID"
        : channel === "CREDIT"
          ? "CREDIT"
          : channel === "MPESA"
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
        payment_channel: channel === "MPESA" ? "MPESA" : channel === "CASH" ? "CASH" : "CREDIT",
        created_by: user.id,
        paid_at: status === "PAID" ? new Date().toISOString() : null,
      })
      .select("id, total, status")
      .single();
    if (sErr || !sale) throw new Error(sErr?.message ?? "Failed to create sale");

    const billRef = saleBillRef(sale.id as string);
    if (channel === "MPESA") {
      await service
        .from("sales")
        .update({ payment_bill_ref: billRef })
        .eq("id", sale.id);
    }

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

    if (channel !== "MPESA") {
      return jsonResponse({
        ok: true,
        sale,
        message: status === "PAID" ? "Sale recorded." : "Credit recorded.",
      });
    }

    const { data: destination } = await service
      .from("tenant_payment_destinations")
      .select("destination_type, account_number, account_name")
      .eq("tenant_id", profile.tenant_id)
      .eq("is_primary", true)
      .maybeSingle();

    return jsonResponse({
      ok: true,
      sale: { ...sale, payment_bill_ref: billRef },
      payment_destination: destination ?? null,
      bill_ref: billRef,
      message:
        destination?.destination_type === "PERSONAL_MPESA" ||
          destination?.destination_type === "POCHI"
          ? "Customer pays your number. Companion SMS or the M-Pesa code confirms the sale."
          : "Customer pays your till/paybill. Waiting for Daraja confirmation…",
    });
  } catch (err) {
    console.error(err);
    return jsonResponse(
      { error: err instanceof Error ? err.message : "Unexpected error" },
      500,
    );
  }
});
