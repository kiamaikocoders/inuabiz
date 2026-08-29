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

function checkoutMpesaMessage(destinationType: string | undefined): string {
  const type = String(destinationType ?? "");
  if (type === "TILL") {
    return "Customer pays your till. Companion SMS or the M-Pesa code confirms the sale. A Safaricom callback also closes it if this till is registered with InuaBiz.";
  }
  if (type === "PAYBILL") {
    return "Customer pays your paybill. Companion SMS or the M-Pesa code confirms the sale. A Safaricom callback also closes it if this paybill is registered with InuaBiz.";
  }
  return "Customer pays your number. Companion SMS or the M-Pesa code confirms the sale.";
}

function paymentChannelFor(channel: string): "MPESA" | "CASH" | "CREDIT" | null {
  if (channel === "MPESA") return "MPESA";
  if (channel === "CASH") return "CASH";
  if (channel === "CREDIT") return "CREDIT";
  return null;
}

function statusFor(channel: string): "PAID" | "CREDIT" | "PENDING_PAYMENT" | "DRAFT" {
  if (channel === "CASH") return "PAID";
  if (channel === "CREDIT") return "CREDIT";
  if (channel === "MPESA") return "PENDING_PAYMENT";
  return "DRAFT";
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
    if (channel === "PARK") channel = "HOLD";
    const customerId = (body.customer_id as string | undefined) ?? null;
    const resumeId = String(body.sale_id ?? "").trim() || null;
    const label = String(body.label ?? body.notes ?? "").trim() || null;

    const reopenOnly = Boolean(resumeId && channel === "MPESA" && !items.length);
    if (!items.length && !reopenOnly) {
      return jsonResponse({ error: "Cart is empty" }, 400);
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

    const loadDestination = async () => {
      const { data } = await service
        .from("tenant_payment_destinations")
        .select("destination_type, account_number, account_name")
        .eq("tenant_id", profile.tenant_id)
        .eq("is_primary", true)
        .maybeSingle();
      return data;
    };

    const mpesaPayload = async (sale: { id: string; total: unknown; status: string }) => {
      const billRef = saleBillRef(sale.id);
      const destination = await loadDestination();
      return jsonResponse({
        ok: true,
        sale: { ...sale, payment_bill_ref: billRef },
        payment_destination: destination ?? null,
        bill_ref: billRef,
        message: checkoutMpesaMessage(destination?.destination_type as string | undefined),
      });
    };

    if (reopenOnly && resumeId) {
      const { data: existing } = await service
        .from("sales")
        .select("id, total, status, payment_bill_ref")
        .eq("id", resumeId)
        .eq("tenant_id", profile.tenant_id)
        .maybeSingle();
      if (!existing) return jsonResponse({ error: "Sale not found" }, 404);
      if (existing.status === "PAID") {
        return jsonResponse({ ok: true, sale: existing, already_paid: true });
      }
      if (existing.status !== "PENDING_PAYMENT" && existing.status !== "DRAFT") {
        return jsonResponse({ error: "Sale is not open" }, 409);
      }
      if (existing.status === "DRAFT") {
        await service
          .from("sales")
          .update({
            status: "PENDING_PAYMENT",
            payment_channel: "MPESA",
            payment_bill_ref: existing.payment_bill_ref ?? saleBillRef(existing.id),
          })
          .eq("id", existing.id);
        existing.status = "PENDING_PAYMENT";
      }
      return await mpesaPayload(existing);
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

    const status = statusFor(channel);
    const payChannel = paymentChannelFor(channel);

    let sale: { id: string; total: unknown; status: string };

    if (resumeId) {
      const { data: existing } = await service
        .from("sales")
        .select("id, status")
        .eq("id", resumeId)
        .eq("tenant_id", profile.tenant_id)
        .maybeSingle();
      if (!existing) return jsonResponse({ error: "Sale not found" }, 404);
      if (existing.status !== "DRAFT" && existing.status !== "PENDING_PAYMENT") {
        return jsonResponse({ error: "Sale is not open" }, 409);
      }
      if (existing.status === "PENDING_PAYMENT" && channel === "HOLD") {
        return jsonResponse({
          ok: true,
          sale: { id: existing.id, total, status: existing.status },
          parked: true,
          message: "Sale parked. Recall it from Open sales.",
        });
      }
      if (existing.status === "PENDING_PAYMENT" && channel === "MPESA") {
        return await mpesaPayload({ id: existing.id, total, status: existing.status });
      }

      const { error: delErr } = await service.from("sale_items").delete().eq("sale_id", existing.id);
      if (delErr) throw new Error(delErr.message);

      const patch: Record<string, unknown> = {
        customer_id: customerId,
        status,
        subtotal,
        discount_amount: Math.max(0, discount),
        total,
        payment_channel: payChannel,
        paid_at: status === "PAID" ? new Date().toISOString() : null,
      };
      if (label) patch.notes = label;
      if (channel === "MPESA") patch.payment_bill_ref = saleBillRef(existing.id);

      const { data: updated, error: uErr } = await service
        .from("sales")
        .update(patch)
        .eq("id", existing.id)
        .select("id, total, status")
        .single();
      if (uErr || !updated) throw new Error(uErr?.message ?? "Failed to update sale");
      sale = updated;
    } else {
      const insert: Record<string, unknown> = {
        tenant_id: profile.tenant_id,
        customer_id: customerId,
        status,
        subtotal,
        discount_amount: Math.max(0, discount),
        total,
        payment_channel: payChannel,
        created_by: user.id,
        paid_at: status === "PAID" ? new Date().toISOString() : null,
      };
      if (label) insert.notes = label;

      const { data: created, error: sErr } = await service
        .from("sales")
        .insert(insert)
        .select("id, total, status")
        .single();
      if (sErr || !created) throw new Error(sErr?.message ?? "Failed to create sale");
      sale = created;

      if (channel === "MPESA") {
        await service
          .from("sales")
          .update({ payment_bill_ref: saleBillRef(sale.id) })
          .eq("id", sale.id);
      }
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

    if (channel === "HOLD") {
      return jsonResponse({
        ok: true,
        sale,
        parked: true,
        message: "Sale parked. Recall it from Open sales.",
      });
    }

    if (channel !== "MPESA") {
      return jsonResponse({
        ok: true,
        sale,
        message: status === "PAID" ? "Sale recorded." : "Credit recorded.",
      });
    }

    return await mpesaPayload(sale);
  } catch (err) {
    console.error(err);
    return jsonResponse(
      { error: err instanceof Error ? err.message : "Unexpected error" },
      500,
    );
  }
});
