import { getSupabase, invokeFunction } from "@/lib/supabase";
import { prettyKePhone } from "@/lib/phone";

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
  const planName =
    planCode === "COMPLIANCE" ? "Compliance (ETR)" : "Standard";

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
    amount: Number(sub?.amount ?? 3000),
    phone: (profile.phone as string | null) ?? (tenant?.phone as string | null),
    planCode: planCode === "COMPLIANCE" ? "COMPLIANCE" : "SHOP_MONTHLY",
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

export async function fetchPaymentHistory(): Promise<PaymentRow[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from("payment_transactions")
    .select("id, invoice_id, created_at, amount, payment_channel, status")
    .order("created_at", { ascending: false })
    .limit(40);
  if (error || !data) return [];
  return data.map((row) => ({
    id: row.id as string,
    invoice: row.invoice_id as string,
    date: fmtDate(row.created_at as string),
    amount: Number(row.amount),
    channel: String(row.payment_channel),
    status: String(row.status),
  }));
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
): Promise<"PAID" | "FAILED" | "TIMEOUT"> {
  const sb = getSupabase();
  if (!sb) return "TIMEOUT";
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const { data } = await sb.from("sales").select("status").eq("id", saleId).maybeSingle();
    const status = String(data?.status ?? "");
    if (status === "PAID") return "PAID";
    if (status === "CANCELLED" || status === "DRAFT") return "FAILED";
    await new Promise((r) => setTimeout(r, 2500));
  }
  return "TIMEOUT";
}

export async function pollSubscriptionPayment(
  invoiceId: string,
  timeoutMs = 90_000,
): Promise<"COMPLETE" | "FAILED" | "TIMEOUT"> {
  const sb = getSupabase();
  if (!sb) return "TIMEOUT";
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const { data } = await sb
      .from("payment_transactions")
      .select("status")
      .eq("invoice_id", invoiceId)
      .maybeSingle();
    const status = String(data?.status ?? "");
    if (status === "COMPLETE") return "COMPLETE";
    if (status === "FAILED" || status === "CANCELLED") return "FAILED";
    await new Promise((r) => setTimeout(r, 2500));
  }
  return "TIMEOUT";
}

export { invokeFunction };
