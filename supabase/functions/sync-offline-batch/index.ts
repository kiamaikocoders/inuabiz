import {
  getServiceClient,
  getUserClient,
  handleOptions,
  jsonResponse,
  toKenyaMsisdn,
} from "../_shared/cors.ts";

type OpIn = {
  client_op_id: string;
  type: string;
  payload: Record<string, unknown>;
  created_at?: string;
};

type OpResult = {
  client_op_id: string;
  status: "applied" | "conflict" | "needs_online" | "failed" | "skipped";
  code?: string;
  message?: string;
  sale_id?: string;
  product_id?: string;
  customer_id?: string;
  meta?: Record<string, unknown>;
};

function saleBillRef(saleId: string): string {
  return saleId.replace(/-/g, "").slice(0, 8).toUpperCase();
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

    const body = await req.json().catch(() => ({}));
    const ops = (body.ops as OpIn[] | undefined) ?? [];
    if (!ops.length) return jsonResponse({ ok: true, results: [] });
    if (ops.length > 50) {
      return jsonResponse({ error: "Max 50 ops per batch" }, 400);
    }

    const service = getServiceClient();
    const { data: profile } = await service
      .from("profiles")
      .select("id, tenant_id, active_shop_id")
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

    const results: OpResult[] = [];

    for (const op of ops) {
      const clientOpId = String(op.client_op_id ?? "").trim();
      if (!clientOpId) {
        results.push({
          client_op_id: "",
          status: "failed",
          code: "missing_id",
          message: "client_op_id required",
        });
        continue;
      }

      const { data: existing } = await service
        .from("offline_client_ops")
        .select("client_op_id, status, result, conflict_code")
        .eq("client_op_id", clientOpId)
        .maybeSingle();

      if (existing) {
        const prior = (existing.result as OpResult | null) ?? {
          client_op_id: clientOpId,
          status: (existing.status as OpResult["status"]) ?? "skipped",
        };
        results.push({
          ...prior,
          client_op_id: clientOpId,
          status: prior.status === "applied" ? "skipped" : prior.status,
        });
        continue;
      }

      let result: OpResult;
      try {
        result = await applyOp(service, profile, user.id, op);
      } catch (err) {
        result = {
          client_op_id: clientOpId,
          status: "failed",
          code: "exception",
          message: err instanceof Error ? err.message : "Unexpected error",
        };
      }

      await service.from("offline_client_ops").insert({
        client_op_id: clientOpId,
        tenant_id: profile.tenant_id,
        profile_id: profile.id,
        op_type: op.type,
        payload: op.payload ?? {},
        status: result.status === "skipped" ? "applied" : result.status,
        result,
        conflict_code: result.code ?? null,
      });

      results.push(result);
    }

    return jsonResponse({ ok: true, results });
  } catch (err) {
    console.error(err);
    return jsonResponse(
      { error: err instanceof Error ? err.message : "Unexpected error" },
      500,
    );
  }
});

type ProfileRow = {
  id: string;
  tenant_id: string;
  active_shop_id: string | null;
};

// deno-lint-ignore no-explicit-any
async function applyOp(
  service: any,
  profile: ProfileRow,
  userId: string,
  op: OpIn,
): Promise<OpResult> {
  const clientOpId = String(op.client_op_id);
  const payload = op.payload ?? {};

  switch (op.type) {
    case "checkout_sale":
      return applyCheckout(service, profile, userId, clientOpId, payload);
    case "confirm_mpesa":
      return applyConfirmMpesa(service, profile, clientOpId, payload);
    case "save_product":
      return applySaveProduct(service, profile, clientOpId, payload);
    case "delete_product":
      return applyDeleteProduct(service, profile, clientOpId, payload);
    case "save_customer":
      return applySaveCustomer(service, profile, clientOpId, payload);
    case "record_credit":
      return applyRecordCredit(service, profile, userId, clientOpId, payload);
    case "cancel_open_sale":
      return applyCancelOpenSale(service, profile, clientOpId, payload);
    default:
      return {
        client_op_id: clientOpId,
        status: "needs_online",
        code: "unknown_op",
        message: `Unsupported op type: ${op.type}`,
      };
  }
}

async function applyCheckout(
  // deno-lint-ignore no-explicit-any
  service: any,
  profile: ProfileRow,
  userId: string,
  clientOpId: string,
  payload: Record<string, unknown>,
): Promise<OpResult> {
  const items = (payload.items as { product_id: string; qty: number }[] | undefined) ?? [];
  const discount = Number(payload.discount_amount ?? 0);
  let channel = String(payload.channel ?? "CASH").toUpperCase();
  if (channel === "HOLD") channel = "HOLD";
  const customerId = (payload.customer_id as string | undefined) ?? null;
  const label = String(payload.label ?? "").trim() || null;
  const resumeId = String(payload.sale_id ?? "").trim() || null;

  if (!items.length) {
    return {
      client_op_id: clientOpId,
      status: "failed",
      code: "empty_cart",
      message: "Cart is empty",
    };
  }

  if (channel === "CREDIT" && !customerId) {
    return {
      client_op_id: clientOpId,
      status: "failed",
      code: "credit_customer",
      message: "Select a customer for credit sales",
    };
  }

  const productIds = items.map((i) => i.product_id);
  const { data: products, error: pErr } = await service
    .from("products")
    .select("id, name, selling_price, cost_price, stock_qty, tenant_id")
    .eq("tenant_id", profile.tenant_id)
    .in("id", productIds);
  if (pErr || !products?.length) {
    return {
      client_op_id: clientOpId,
      status: "conflict",
      code: "products_missing",
      message: "One or more products were not found on the server",
    };
  }

  const byId = new Map(products.map((p: { id: string }) => [p.id, p]));
  for (const item of items) {
    if (!byId.has(item.product_id)) {
      return {
        client_op_id: clientOpId,
        status: "conflict",
        code: "product_missing",
        message: `Product ${item.product_id} not found`,
        meta: { product_id: item.product_id },
      };
    }
  }

  // Soft stock check for cash/credit (stock trigger still applies on PAID).
  if (channel === "CASH" || channel === "CREDIT") {
    for (const item of items) {
      const p = byId.get(item.product_id) as { stock_qty: number; name: string };
      if (Number(p.stock_qty) < Number(item.qty)) {
        return {
          client_op_id: clientOpId,
          status: "conflict",
          code: "stock_conflict",
          message: `${p.name} only has ${p.stock_qty} left (needed ${item.qty})`,
          meta: {
            product_id: item.product_id,
            available: Number(p.stock_qty),
            needed: Number(item.qty),
          },
        };
      }
    }
  }

  const saleItems = items.map((i) => {
    const p = byId.get(i.product_id) as {
      id: string;
      name: string;
      selling_price: number;
      cost_price: number;
    };
    const qty = Number(i.qty);
    const unit = Number(p.selling_price);
    return {
      tenant_id: profile.tenant_id,
      product_id: p.id,
      product_name: p.name,
      unit_price: unit,
      cost_price: Number(p.cost_price ?? 0),
      qty,
      line_total: Math.round(unit * qty * 100) / 100,
    };
  });

  const subtotal = saleItems.reduce((s, i) => s + i.line_total, 0);
  const total = Math.max(0, subtotal - Math.max(0, discount));
  const status = channel === "HOLD" ? "DRAFT" : statusFor(channel);
  const payChannel = channel === "HOLD" ? null : paymentChannelFor(channel);

  let saleId = resumeId;

  if (resumeId) {
    const { data: existing } = await service
      .from("sales")
      .select("id, status")
      .eq("id", resumeId)
      .eq("tenant_id", profile.tenant_id)
      .maybeSingle();
    if (existing && (existing.status === "DRAFT" || existing.status === "PENDING_PAYMENT")) {
      await service.from("sale_items").delete().eq("sale_id", existing.id);
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
      await service.from("sales").update(patch).eq("id", existing.id);
      saleId = existing.id;
    } else if (existing) {
      return {
        client_op_id: clientOpId,
        status: "skipped",
        sale_id: existing.id,
        message: "Sale already finalized",
      };
    } else {
      saleId = null;
    }
  }

  if (!saleId) {
    // Prefer client UUID when it is a valid uuid so local IDs survive sync.
    const preferClientId = /^[0-9a-f-]{36}$/i.test(clientOpId);
    const insert: Record<string, unknown> = {
      tenant_id: profile.tenant_id,
      customer_id: customerId,
      status,
      subtotal,
      discount_amount: Math.max(0, discount),
      total,
      payment_channel: payChannel,
      created_by: userId,
      paid_at: status === "PAID" ? new Date().toISOString() : null,
    };
    if (preferClientId) insert.id = clientOpId;
    if (label) insert.notes = label;
    if (channel === "MPESA") {
      insert.payment_bill_ref = saleBillRef(
        preferClientId ? clientOpId : "00000000",
      );
    }

    const { data: created, error: sErr } = await service
      .from("sales")
      .insert(insert)
      .select("id, total, status")
      .single();
    if (sErr || !created) {
      return {
        client_op_id: clientOpId,
        status: "failed",
        code: "sale_insert",
        message: sErr?.message ?? "Failed to create sale",
      };
    }
    saleId = created.id as string;
    if (channel === "MPESA") {
      await service
        .from("sales")
        .update({ payment_bill_ref: saleBillRef(saleId) })
        .eq("id", saleId);
    }
  }

  const { error: iErr } = await service.from("sale_items").insert(
    saleItems.map((row) => ({ ...row, sale_id: saleId })),
  );
  if (iErr) {
    return {
      client_op_id: clientOpId,
      status: "failed",
      code: "sale_items",
      message: iErr.message,
      sale_id: saleId ?? undefined,
    };
  }

  if (channel === "CREDIT" && customerId) {
    await service.from("credit_entries").insert({
      tenant_id: profile.tenant_id,
      customer_id: customerId,
      sale_id: saleId,
      entry_type: "CHARGE",
      amount: total,
      created_by: userId,
    });
  }

  if (channel === "CASH" || channel === "CREDIT") {
    const { error: invErr } = await service.rpc("issue_sale_invoice", {
      p_sale_id: saleId,
    });
    if (invErr) console.error("issue_sale_invoice", invErr);
  }

  return {
    client_op_id: clientOpId,
    status: "applied",
    sale_id: saleId ?? undefined,
    message: status === "PAID" ? "Sale recorded." : "Queued sale applied.",
  };
}

async function applyConfirmMpesa(
  // deno-lint-ignore no-explicit-any
  service: any,
  profile: ProfileRow,
  clientOpId: string,
  payload: Record<string, unknown>,
): Promise<OpResult> {
  const saleId = String(payload.sale_id ?? "").trim();
  const receipt = String(payload.mpesa_receipt_code ?? "")
    .trim()
    .toUpperCase();
  if (!saleId || !receipt) {
    return {
      client_op_id: clientOpId,
      status: "failed",
      code: "missing_fields",
      message: "sale_id and mpesa_receipt_code required",
    };
  }
  if (!/^[A-Z0-9]{8,12}$/.test(receipt)) {
    return {
      client_op_id: clientOpId,
      status: "failed",
      code: "bad_receipt",
      message: "Enter a valid M-Pesa confirmation code",
    };
  }

  const { data: sale } = await service
    .from("sales")
    .select("id, status")
    .eq("id", saleId)
    .eq("tenant_id", profile.tenant_id)
    .maybeSingle();

  if (!sale) {
    // Sale may still be in the same batch ahead of this op — caller should order ops.
    return {
      client_op_id: clientOpId,
      status: "conflict",
      code: "sale_missing",
      message: "Sale not found for M-Pesa confirm",
      sale_id: saleId,
    };
  }
  if (sale.status === "PAID") {
    return { client_op_id: clientOpId, status: "skipped", sale_id: saleId };
  }
  if (sale.status !== "PENDING_PAYMENT") {
    return {
      client_op_id: clientOpId,
      status: "conflict",
      code: "sale_not_pending",
      message: "Sale is not awaiting M-Pesa payment",
      sale_id: saleId,
    };
  }

  const { data: dup } = await service
    .from("sales")
    .select("id")
    .eq("tenant_id", profile.tenant_id)
    .eq("mpesa_receipt_code", receipt)
    .neq("id", saleId)
    .maybeSingle();
  if (dup) {
    return {
      client_op_id: clientOpId,
      status: "conflict",
      code: "receipt_used",
      message: "This M-Pesa code was already used on another sale",
      sale_id: saleId,
    };
  }

  await service
    .from("sales")
    .update({
      status: "PAID",
      paid_at: new Date().toISOString(),
      payment_channel: "MPESA",
      mpesa_receipt_code: receipt,
    })
    .eq("id", saleId);

  return {
    client_op_id: clientOpId,
    status: "applied",
    sale_id: saleId,
    message: "Payment confirmed.",
  };
}

async function applySaveProduct(
  // deno-lint-ignore no-explicit-any
  service: any,
  profile: ProfileRow,
  clientOpId: string,
  payload: Record<string, unknown>,
): Promise<OpResult> {
  const existingId = String(payload.id ?? "").trim() || null;
  const localId = String(payload.local_id ?? clientOpId).trim();
  const row: Record<string, unknown> = {
    name: String(payload.name ?? "").trim(),
    sku: (payload.sku as string | null) || null,
    cost_price: Number(payload.cost ?? 0),
    selling_price: Number(payload.price ?? 0),
    stock_qty: Number(payload.stock ?? 0),
    low_stock_threshold: Number(payload.reorderLevel ?? 0),
    updated_at: new Date().toISOString(),
  };
  if (payload.taxClass) row.tax_class = payload.taxClass;
  if (payload.classificationCode !== undefined) {
    row.classification_code = payload.classificationCode || null;
  }
  if (payload.attrs) row.attrs = payload.attrs;
  if (payload.imageUrl !== undefined) row.image_url = payload.imageUrl;

  if (existingId) {
    const { error } = await service.from("products").update(row).eq("id", existingId).eq(
      "tenant_id",
      profile.tenant_id,
    );
    if (error) {
      return {
        client_op_id: clientOpId,
        status: "failed",
        code: "product_update",
        message: error.message,
      };
    }
    return { client_op_id: clientOpId, status: "applied", product_id: existingId };
  }

  row.tenant_id = profile.tenant_id;
  if (profile.active_shop_id) row.shop_id = profile.active_shop_id;
  if (/^[0-9a-f-]{36}$/i.test(localId)) row.id = localId;

  const { data, error } = await service.from("products").insert(row).select("id").single();
  if (error || !data) {
    return {
      client_op_id: clientOpId,
      status: "failed",
      code: "product_insert",
      message: error?.message ?? "Could not create product",
    };
  }
  return { client_op_id: clientOpId, status: "applied", product_id: data.id as string };
}

async function applyDeleteProduct(
  // deno-lint-ignore no-explicit-any
  service: any,
  profile: ProfileRow,
  clientOpId: string,
  payload: Record<string, unknown>,
): Promise<OpResult> {
  const id = String(payload.id ?? "").trim();
  if (!id) {
    return {
      client_op_id: clientOpId,
      status: "failed",
      code: "missing_id",
      message: "Product id required",
    };
  }
  const { error } = await service
    .from("products")
    .update({ is_active: false })
    .eq("id", id)
    .eq("tenant_id", profile.tenant_id);
  if (error) {
    return {
      client_op_id: clientOpId,
      status: "failed",
      code: "product_delete",
      message: error.message,
    };
  }
  return { client_op_id: clientOpId, status: "applied", product_id: id };
}

async function applySaveCustomer(
  // deno-lint-ignore no-explicit-any
  service: any,
  profile: ProfileRow,
  clientOpId: string,
  payload: Record<string, unknown>,
): Promise<OpResult> {
  const existingId = String(payload.id ?? "").trim() || null;
  const localId = String(payload.local_id ?? clientOpId).trim();
  const name = String(payload.name ?? "").trim();
  if (name.length < 2) {
    return {
      client_op_id: clientOpId,
      status: "failed",
      code: "bad_name",
      message: "Enter the customer's name",
    };
  }
  const phoneRaw = (payload.phone as string | null) ?? null;
  let phone: string | null = phoneRaw;
  if (phoneRaw) {
    try {
      phone = toKenyaMsisdn(phoneRaw);
    } catch {
      phone = phoneRaw.replace(/\D/g, "") || null;
    }
  }
  const row = {
    name,
    phone,
    email: (payload.email as string | null) ?? null,
    notes: (payload.notes as string | null) ?? null,
  };

  if (existingId) {
    const { error } = await service
      .from("customers")
      .update(row)
      .eq("id", existingId)
      .eq("tenant_id", profile.tenant_id);
    if (error) {
      return {
        client_op_id: clientOpId,
        status: "failed",
        code: "customer_update",
        message: error.message,
      };
    }
    return { client_op_id: clientOpId, status: "applied", customer_id: existingId };
  }

  const insert: Record<string, unknown> = {
    tenant_id: profile.tenant_id,
    ...row,
  };
  if (/^[0-9a-f-]{36}$/i.test(localId)) insert.id = localId;

  const { data, error } = await service.from("customers").insert(insert).select("id").single();
  if (error || !data) {
    return {
      client_op_id: clientOpId,
      status: "failed",
      code: "customer_insert",
      message: error?.message ?? "Could not save customer",
    };
  }
  return { client_op_id: clientOpId, status: "applied", customer_id: data.id as string };
}

async function applyRecordCredit(
  // deno-lint-ignore no-explicit-any
  service: any,
  profile: ProfileRow,
  userId: string,
  clientOpId: string,
  payload: Record<string, unknown>,
): Promise<OpResult> {
  const raw = String(payload.name_or_phone ?? "").trim();
  const amount = Number(payload.amount ?? 0);
  const dueDays = Math.max(1, Number(payload.due_days ?? 7));
  if (!raw || !(amount > 0)) {
    return {
      client_op_id: clientOpId,
      status: "failed",
      code: "bad_credit",
      message: "Name/phone and amount required",
    };
  }

  const phoneLike = /^[\d+\s-]{9,}$/.test(raw);
  let phone: string | null = null;
  let name = raw;
  if (phoneLike) {
    try {
      phone = toKenyaMsisdn(raw);
      name = phone;
    } catch {
      phone = raw.replace(/\D/g, "") || null;
    }
  }

  let customerId: string | null = null;
  if (phone) {
    const { data: existing } = await service
      .from("customers")
      .select("id, name")
      .eq("tenant_id", profile.tenant_id)
      .eq("phone", phone)
      .maybeSingle();
    if (existing) {
      customerId = existing.id as string;
      name = (existing.name as string | null) ?? name;
    }
  }

  if (!customerId) {
    const { data: created, error } = await service
      .from("customers")
      .insert({ tenant_id: profile.tenant_id, name, phone })
      .select("id")
      .single();
    if (error || !created) {
      return {
        client_op_id: clientOpId,
        status: "failed",
        code: "customer_create",
        message: error?.message ?? "Could not create customer",
      };
    }
    customerId = created.id as string;
  }

  const due = new Date();
  due.setDate(due.getDate() + dueDays);

  const { error: cErr } = await service.from("credit_entries").insert({
    tenant_id: profile.tenant_id,
    customer_id: customerId,
    entry_type: "CHARGE",
    amount,
    due_at: due.toISOString(),
    created_by: userId,
    note: "Manual credit entry (offline sync)",
  });
  if (cErr) {
    return {
      client_op_id: clientOpId,
      status: "failed",
      code: "credit_insert",
      message: cErr.message,
    };
  }

  return {
    client_op_id: clientOpId,
    status: "applied",
    customer_id: customerId ?? undefined,
  };
}

async function applyCancelOpenSale(
  // deno-lint-ignore no-explicit-any
  service: any,
  profile: ProfileRow,
  clientOpId: string,
  payload: Record<string, unknown>,
): Promise<OpResult> {
  const id = String(payload.id ?? "").trim();
  if (!id) {
    return {
      client_op_id: clientOpId,
      status: "failed",
      code: "missing_id",
      message: "Sale id required",
    };
  }
  const { error } = await service
    .from("sales")
    .update({ status: "CANCELLED" })
    .eq("id", id)
    .eq("tenant_id", profile.tenant_id)
    .in("status", ["DRAFT", "PENDING_PAYMENT"]);
  if (error) {
    return {
      client_op_id: clientOpId,
      status: "failed",
      code: "cancel_sale",
      message: error.message,
    };
  }
  return { client_op_id: clientOpId, status: "applied", sale_id: id };
}
