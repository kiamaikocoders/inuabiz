import { getSupabase, invokeFunction } from "@/lib/supabase";
import { prettyKePhone } from "@/lib/phone";
import { SUBSCRIPTION_PRICE } from "@/lib/mock-data";

export type BillingSnapshot = {
  tenantName: string;
  status: string;
  trialEndsAt: string | null;
  accessUntil: string | null;
  autoDebit: boolean;
  nextBillingDate: string | null;
  amount: number;
  phone: string | null;
  planCode: string;
  planName: string;
};

export type PaymentRow = {
  id: string;
  invoice: string;
  date: string;
  amount: number;
  channel: string;
  status: string;
  phone?: string | null;
  mpesaReceipt?: string | null;
  createdAt?: string;
  purpose?: string;
};

export type BillInvoiceRow = {
  id: string;
  number: string;
  buyer: string;
  phone: string;
  amount: number;
  issued: string;
  due: string;
  channel: string;
  status: string;
};

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export async function fetchBillingSnapshot(): Promise<BillingSnapshot | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data: profile } = await sb
    .from("profiles")
    .select("tenant_id, phone")
    .maybeSingle();
  if (!profile?.tenant_id) return null;

  const { data: tenant } = await sb
    .from("tenants")
    .select("name, status, trial_ends_at, access_until, phone")
    .eq("id", profile.tenant_id)
    .maybeSingle();
  const { data: sub } = await sb
    .from("subscriptions")
    .select("amount, auto_debit_enabled, next_billing_date, current_period_end, plan_code")
    .eq("tenant_id", profile.tenant_id)
    .maybeSingle();

  const planCode = String(sub?.plan_code ?? "SHOP_MONTHLY").toUpperCase();
  const normalized = planCode === "COMPLIANCE" ? "COMPLIANCE" : "SHOP_MONTHLY";

  const { data: planRow } = await sb
    .from("subscription_plans")
    .select("name, amount_kes")
    .eq("code", normalized)
    .eq("is_active", true)
    .maybeSingle();

  const { data: liveAmount } = await sb.rpc("subscription_amount_for_tenant", {
    p_tenant_id: profile.tenant_id,
  });

  const amount =
    liveAmount != null && Number.isFinite(Number(liveAmount))
      ? Number(liveAmount)
      : Number(sub?.amount ?? planRow?.amount_kes ?? SUBSCRIPTION_PRICE);

  const planName =
    (planRow?.name as string | undefined) ??
    (normalized === "COMPLIANCE" ? "Compliance (ETR)" : "Standard");

  return {
    tenantName: (tenant?.name as string | undefined) ?? "Your shop",
    status: String(tenant?.status ?? "TRIAL"),
    trialEndsAt: (tenant?.trial_ends_at as string | null) ?? null,
    accessUntil: (tenant?.access_until as string | null) ?? null,
    autoDebit: Boolean(sub?.auto_debit_enabled),
    nextBillingDate:
      (sub?.next_billing_date as string | null) ??
      (sub?.current_period_end as string | null) ??
      (tenant?.access_until as string | null) ??
      null,
    amount,
    phone: (profile.phone as string | null) ?? (tenant?.phone as string | null),
    planCode: normalized,
    planName,
  };
}

export type VendorPlanBadge = "Free trial" | "Standard" | "Compliance";

export function vendorPlanBadge(snap: BillingSnapshot | null | undefined): VendorPlanBadge {
  if (!snap) return "Free trial";
  const status = snap.status.toUpperCase();
  if (status === "TRIAL" || status === "") return "Free trial";
  return snap.planCode === "COMPLIANCE" ? "Compliance" : "Standard";
}

function channelLabel(channel: string): string {
  const c = channel.toUpperCase();
  if (c.includes("MPESA") || c.includes("PAYHERO") || c === "STK") return "M-Pesa";
  if (c.includes("CASH")) return "Cash";
  if (c.includes("CARD")) return "Card";
  return channel.replace(/_/g, " ");
}

export async function fetchPaymentHistory(): Promise<PaymentRow[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from("payment_transactions")
    .select("id, invoice_id, created_at, amount, payment_channel, status, account, purpose")
    .eq("purpose", "SAAS_SUBSCRIPTION")
    .order("created_at", { ascending: false })
    .limit(40);
  if (error || !data) return [];
  const ids = data.map((row) => row.id as string);
  const invoiceIds = data.map((row) => String(row.invoice_id ?? "")).filter(Boolean);
  const receiptByTx = new Map<string, string>();
  const receiptByInvoice = new Map<string, string>();
  const rememberReceipt = (row: {
    payment_transaction_id?: unknown;
    payhero_reference?: unknown;
    mpesa_receipt_code?: unknown;
  }) => {
    const code = typeof row.mpesa_receipt_code === "string" ? row.mpesa_receipt_code : "";
    if (!code) return;
    if (typeof row.payment_transaction_id === "string") receiptByTx.set(row.payment_transaction_id, code);
    if (typeof row.payhero_reference === "string") receiptByInvoice.set(row.payhero_reference, code);
  };
  if (ids.length) {
    const { data: byTx } = await sb
      .from("subscription_payments")
      .select("payment_transaction_id, payhero_reference, mpesa_receipt_code")
      .in("payment_transaction_id", ids);
    for (const row of byTx ?? []) rememberReceipt(row);
  }
  if (invoiceIds.length) {
    const { data: byRef } = await sb
      .from("subscription_payments")
      .select("payment_transaction_id, payhero_reference, mpesa_receipt_code")
      .in("payhero_reference", invoiceIds);
    for (const row of byRef ?? []) rememberReceipt(row);
  }
  return data.map((row) => {
    const id = row.id as string;
    const invoice = (row.invoice_id as string) || id.slice(0, 8).toUpperCase();
    const out: PaymentRow = {
      id,
      invoice,
      date: fmtDate(row.created_at as string),
      amount: Number(row.amount),
      channel: channelLabel(String(row.payment_channel)),
      status: String(row.status),
      createdAt: row.created_at as string,
      purpose: String(row.purpose ?? "SAAS_SUBSCRIPTION"),
    };
    const phone = row.account as string | null;
    if (phone) out.phone = prettyKePhone(phone);
    const mpesa = receiptByTx.get(id) ?? receiptByInvoice.get(invoice);
    if (mpesa) out.mpesaReceipt = mpesa;
    return out;
  });
}

export async function fetchBillInvoices(): Promise<BillInvoiceRow[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from("bill_invoices")
    .select(
      "id, external_reference, billed_full_name, billed_phone, amount, created_at, due_date, status",
    )
    .order("created_at", { ascending: false })
    .limit(50);
  if (error || !data) return [];
  return data.map((row) => ({
    id: row.id as string,
    number: row.external_reference as string,
    buyer: row.billed_full_name as string,
    phone: prettyKePhone((row.billed_phone as string) ?? ""),
    amount: Number(row.amount),
    issued: fmtDate(row.created_at as string),
    due: fmtDate(row.due_date as string),
    channel: "Bill Manager",
    status: String(row.status),
  }));
}

export async function pollSaleStatus(
  saleId: string,
  timeoutMs = 90_000,
  signal?: AbortSignal,
): Promise<"PAID" | "FAILED" | "TIMEOUT" | "ABORTED"> {
  return waitForSalePaid(saleId, { timeoutMs, signal });
}

/** Poll + Realtime until a pending sale is PAID (companion SMS or Daraja C2B). */
export async function waitForSalePaid(
  saleId: string,
  opts?: { timeoutMs?: number; signal?: AbortSignal },
): Promise<"PAID" | "FAILED" | "TIMEOUT" | "ABORTED"> {
  const sb = getSupabase();
  if (!sb) return "TIMEOUT";
  const timeoutMs = opts?.timeoutMs ?? 90_000;
  const signal = opts?.signal;

  const readStatus = async (): Promise<"PAID" | "FAILED" | null> => {
    const { data } = await sb.from("sales").select("status").eq("id", saleId).maybeSingle();
    const status = String(data?.status ?? "");
    if (status === "PAID") return "PAID";
    if (status === "CANCELLED" || status === "DRAFT") return "FAILED";
    return null;
  };

  const first = await readStatus();
  if (first) return first;
  if (signal?.aborted) return "ABORTED";

  return await new Promise((resolve) => {
    let settled = false;
    const finish = (value: "PAID" | "FAILED" | "TIMEOUT" | "ABORTED") => {
      if (settled) return;
      settled = true;
      window.clearInterval(pollTimer);
      window.clearTimeout(timeoutTimer);
      signal?.removeEventListener("abort", onAbort);
      void sb.removeChannel(channel);
      resolve(value);
    };

    const onAbort = () => finish("ABORTED");
    signal?.addEventListener("abort", onAbort, { once: true });

    const channel = sb
      .channel(`sale-paid-${saleId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "sales", filter: `id=eq.${saleId}` },
        (payload) => {
          const status = String((payload.new as { status?: string } | null)?.status ?? "");
          if (status === "PAID") finish("PAID");
          if (status === "CANCELLED" || status === "DRAFT") finish("FAILED");
        },
      )
      .subscribe();

    const pollTimer = window.setInterval(() => {
      void readStatus().then((status) => {
        if (status) finish(status);
      });
    }, 2500);

    const timeoutTimer = window.setTimeout(() => finish("TIMEOUT"), timeoutMs);
  });
}

export async function fetchSaleMpesaReceipt(saleId: string): Promise<string | null> {
  const meta = await fetchSaleMpesaMeta(saleId);
  return meta.code;
}

export async function fetchSaleMpesaMeta(
  saleId: string,
): Promise<{ code: string | null; payerName: string | null }> {
  const sb = getSupabase();
  if (!sb) return { code: null, payerName: null };
  const { data } = await sb
    .from("sales")
    .select("mpesa_receipt_code, mpesa_payer_name")
    .eq("id", saleId)
    .maybeSingle();
  const code = ((data?.mpesa_receipt_code as string | null | undefined) ?? "").trim() || null;
  const payerName = ((data?.mpesa_payer_name as string | null | undefined) ?? "").trim() || null;
  return { code, payerName };
}

export async function pollSubscriptionPayment(
  invoiceId: string,
  timeoutMs = 120_000,
  opts?: { alternateIds?: string[] },
): Promise<"COMPLETE" | "FAILED" | "TIMEOUT"> {
  const sb = getSupabase();
  if (!sb) return "TIMEOUT";
  const ids = [...new Set([invoiceId, ...(opts?.alternateIds ?? [])].filter(Boolean))];
  const started = Date.now();

  let baselineAccessMs = 0;
  const { data: profile } = await sb.from("profiles").select("tenant_id").maybeSingle();
  if (profile?.tenant_id) {
    const { data: tenant } = await sb
      .from("tenants")
      .select("access_until")
      .eq("id", profile.tenant_id)
      .maybeSingle();
    baselineAccessMs = tenant?.access_until
      ? new Date(tenant.access_until as string).getTime()
      : 0;
  }

  while (Date.now() - started < timeoutMs) {
    for (const id of ids) {
      const { data } = await sb
        .from("payment_transactions")
        .select("status")
        .or(`invoice_id.eq.${id},tracking_id.eq.${id},api_ref.eq.${id}`)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const status = String(data?.status ?? "");
      if (status === "COMPLETE") return "COMPLETE";
      if (status === "FAILED" || status === "CANCELLED") return "FAILED";
    }

    // Fallback: access extended after this STK started (webhook beat the tx read).
    if (profile?.tenant_id) {
      const { data: tenant } = await sb
        .from("tenants")
        .select("status, access_until")
        .eq("id", profile.tenant_id)
        .maybeSingle();
      const accessMs = tenant?.access_until
        ? new Date(tenant.access_until as string).getTime()
        : 0;
      if (String(tenant?.status ?? "") === "ACTIVE" && accessMs > baselineAccessMs + 60_000) {
        return "COMPLETE";
      }
    }

    await new Promise((r) => setTimeout(r, 2000));
  }
  return "TIMEOUT";
}

export { invokeFunction };
