import type { Sale } from "@/lib/mock-data";
import { enqueueOp } from "@/lib/offline/outbox";
import { adjustLocalStock, putOpenSale, putSale, readProduct } from "@/lib/offline/replica";

export type OfflineCartItem = {
  product_id: string;
  qty: number;
  name?: string;
  unit_price?: number;
};

function clientSaleId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `offline-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function billRefFromId(id: string): string {
  return id.replace(/-/g, "").slice(0, 8).toUpperCase();
}

/**
 * Record a cash / credit / park / mpesa-open sale while offline.
 * Returns a local sale id used as client_op_id for idempotent sync.
 */
export async function recordOfflineCheckout(input: {
  channel: "CASH" | "CREDIT" | "HOLD" | "MPESA";
  items: OfflineCartItem[];
  discount_amount?: number;
  customer_id?: string | null;
  customer_name?: string;
  label?: string | null;
  sale_id?: string | null;
}): Promise<{
  ok: true;
  sale: { id: string; total: number; status: string; payment_bill_ref?: string };
  bill_ref?: string;
  queued: true;
}> {
  const opId = input.sale_id?.trim() || clientSaleId();
  const lines = [];
  let subtotal = 0;
  for (const item of input.items) {
    const product = await readProduct(item.product_id);
    const unit = item.unit_price ?? product?.price ?? 0;
    const name = item.name ?? product?.name ?? "Item";
    const qty = Number(item.qty) || 1;
    const lineTotal = Math.round(unit * qty * 100) / 100;
    subtotal += lineTotal;
    lines.push({
      productId: item.product_id,
      name,
      qty,
      price: unit,
    });
  }
  const discount = Math.max(0, Number(input.discount_amount ?? 0));
  const total = Math.max(0, subtotal - discount);

  const status =
    input.channel === "CASH"
      ? "PAID"
      : input.channel === "CREDIT"
        ? "CREDIT"
        : input.channel === "MPESA"
          ? "PENDING_PAYMENT"
          : "DRAFT";

  await enqueueOp(
    "checkout_sale",
    {
      channel: input.channel,
      items: input.items.map((i) => ({ product_id: i.product_id, qty: i.qty })),
      discount_amount: discount,
      customer_id: input.customer_id ?? null,
      label: input.label ?? null,
      sale_id: input.sale_id ?? null,
      local_sale_id: opId,
    },
    opId,
  );

  if (input.channel === "CASH" || input.channel === "CREDIT") {
    await adjustLocalStock(
      lines.map((l) => ({ productId: l.productId, qty: l.qty })),
      "decrement",
    );
    const now = new Date();
    const sale: Sale = {
      id: opId,
      ref: `SL-${opId.slice(0, 8).toUpperCase()}`,
      time: now.toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" }),
      items: lines.length || 1,
      total,
      channel: input.channel === "CREDIT" ? "Credit" : "Cash",
      customer: input.customer_name ?? (input.channel === "CREDIT" ? "Customer" : "Walk-in"),
      status: input.channel === "CASH" ? "Complete" : "Pending",
      createdAt: now.toISOString(),
      offlinePending: true,
    };
    await putSale(sale);
  } else {
    const bill = billRefFromId(opId);
    await putOpenSale({
      id: opId,
      ref: `SL-${opId.slice(0, 8).toUpperCase()}`,
      status: input.channel === "MPESA" ? "PENDING_PAYMENT" : "DRAFT",
      total,
      createdAt: new Date().toISOString(),
      label: input.label?.trim() || (lines[0]?.name ?? "Open sale"),
      itemCount: lines.length || 1,
      discount,
      billRef: input.channel === "MPESA" ? bill : null,
      lines,
      offlinePending: true,
    });
    if (input.channel === "MPESA") {
      // Do not decrement stock until PAID on server.
      const sale: Sale = {
        id: opId,
        ref: `SL-${opId.slice(0, 8).toUpperCase()}`,
        time: new Date().toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" }),
        items: lines.length || 1,
        total,
        channel: "M-Pesa",
        customer: "Walk-in",
        status: "Pending",
        createdAt: new Date().toISOString(),
        offlinePending: true,
      };
      await putSale(sale);
    }
  }

  const bill_ref = input.channel === "MPESA" ? billRefFromId(opId) : undefined;
  return {
    ok: true,
    sale: {
      id: opId,
      total,
      status,
      ...(bill_ref ? { payment_bill_ref: bill_ref } : {}),
    },
    ...(bill_ref ? { bill_ref } : {}),
    queued: true,
  };
}

export async function queueConfirmMpesa(input: {
  sale_id: string;
  mpesa_receipt_code: string;
}): Promise<{ ok: true; queued: true }> {
  await enqueueOp("confirm_mpesa", {
    sale_id: input.sale_id,
    mpesa_receipt_code: input.mpesa_receipt_code.trim().toUpperCase(),
  });
  return { ok: true, queued: true };
}
