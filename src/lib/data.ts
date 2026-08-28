import {
  KES,
  type Customer,
  type DebtEntry,
  type Product,
  type Sale,
  type Tenant,
} from "@/lib/mock-data";
import { getSupabase, invokeFunction } from "@/lib/supabase";
import { prettyKePhone, to254 } from "@/lib/phone";
import { startGhost, type GhostSession } from "@/lib/ghost";
import { categoryLabel } from "@/lib/category";

const STATUS_MAP: Record<string, Tenant["status"]> = {
  ACTIVE: "Active",
  TRIAL: "Trial",
  PAST_DUE: "Error",
  SUSPENDED: "Suspended",
};

const CHANNEL_MAP: Record<string, Sale["channel"]> = {
  MPESA_STK: "M-Pesa",
  MPESA: "M-Pesa",
  PAYHERO: "PayHero",
  CASH: "Cash",
  TILL: "Till",
  PAYBILL: "Paybill",
  CREDIT: "Credit",
};

const SALE_STATUS: Record<string, Sale["status"]> = {
  PAID: "Complete",
  PENDING: "Pending",
  PENDING_PAYMENT: "Pending",
  FAILED: "Failed",
  DRAFT: "Pending",
  CREDIT: "Pending",
  VOID: "Failed",
  CANCELLED: "Failed",
};

export async function fetchProducts(): Promise<Product[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from("products")
    .select(
      "id, name, sku, cost_price, selling_price, stock_qty, low_stock_threshold, tax_class, classification_code, attrs",
    )
    .eq("is_active", true)
    .order("name");
  if (error || !data?.length) return [];
  return data.map((row) => mapProductRow(row as Record<string, unknown>));
}

export async function fetchProduct(id: string): Promise<Product | undefined> {
  const sb = getSupabase();
  if (!sb) return undefined;
  const { data, error } = await sb
    .from("products")
    .select(
      "id, name, sku, cost_price, selling_price, stock_qty, low_stock_threshold, tax_class, classification_code, attrs",
    )
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return undefined;
  return mapProductRow(data as Record<string, unknown>);
}

function mapProductRow(row: Record<string, unknown>): Product {
  const attrs = (row["attrs"] as Product["attrs"] | null) ?? undefined;
  const department = attrs?.department?.trim();
  const taxClass = row["tax_class"] as Product["taxClass"] | null;
  const classificationCode = row["classification_code"] as string | null;
  const product: Product = {
    id: String(row["id"]),
    name: String(row["name"]),
    sku: String(row["sku"] ?? "").trim() || "—",
    category: department || "General",
    cost: Number(row["cost_price"]),
    price: Number(row["selling_price"]),
    stock: Number(row["stock_qty"]),
    reorderLevel: Number(row["low_stock_threshold"]),
    emoji: "📦",
  };
  if (taxClass) product.taxClass = taxClass;
  if (classificationCode) product.classificationCode = classificationCode;
  if (attrs) product.attrs = attrs;
  return product;
}

export async function deleteProduct(id: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.from("products").update({ is_active: false }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function saveProduct(
  input: {
    id?: string;
    name: string;
    sku: string;
    cost: number;
    price: number;
    stock: number;
    reorderLevel: number;
    taxClass?: string;
    classificationCode?: string;
    attrs?: Record<string, unknown>;
  },
): Promise<{ demo: boolean; id: string }> {
  const sb = getSupabase();
  if (!sb) return { demo: true, id: input.id ?? `p-${Date.now()}` };
  const payload: Record<string, unknown> = {
    name: input.name,
    sku: input.sku || null,
    cost_price: input.cost,
    selling_price: input.price,
    stock_qty: input.stock,
    low_stock_threshold: input.reorderLevel,
  };
  if (input.taxClass) payload["tax_class"] = input.taxClass;
  if (input.classificationCode !== undefined) {
    payload["classification_code"] = input.classificationCode || null;
  }
  if (input.attrs) payload["attrs"] = input.attrs;
  if (input.id && !input.id.startsWith("p")) {
    const { error } = await sb.from("products").update(payload).eq("id", input.id);
    if (error) throw new Error(error.message);
    return { demo: false, id: input.id };
  }
  const { data: profile } = await sb
    .from("profiles")
    .select("tenant_id, active_shop_id")
    .maybeSingle();
  if (!profile?.tenant_id) throw new Error("Complete onboarding first");
  payload["tenant_id"] = profile.tenant_id;
  if (profile.active_shop_id) payload["shop_id"] = profile.active_shop_id;
  const { data, error } = await sb.from("products").insert(payload).select("id").single();
  if (error) throw new Error(error.message);
  return { demo: false, id: data.id as string };
}

function nairobiDay(iso: string | Date): string {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: "Africa/Nairobi" });
}

export async function fetchSales(): Promise<Sale[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from("sales")
    .select("id, total, status, payment_channel, customer_phone, created_at")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error || !data?.length) return [];
  return data.map((row) => {
    const created = new Date(row.created_at as string);
    return {
      id: row.id as string,
      ref: `SL-${String(row.id).slice(0, 8).toUpperCase()}`,
      time: created.toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" }),
      items: 1,
      total: Number(row.total),
      channel: CHANNEL_MAP[String(row.payment_channel)] ?? "Cash",
      customer: (row.customer_phone as string | null)
        ? prettyKePhone(row.customer_phone as string)
        : "Walk-in",
      status: SALE_STATUS[String(row.status)] ?? "Pending",
      createdAt: row.created_at as string,
    };
  });
}

export async function fetchSale(id: string): Promise<Sale | undefined> {
  const list = await fetchSales();
  return list.find((s) => s.id === id);
}

export async function fetchShopCustomers(): Promise<{ id: string; name: string; phone: string }[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb.from("customers").select("id, name, phone").order("name");
  if (error || !data) return [];
  return data.map((row) => ({
    id: row.id as string,
    name: (row.name as string | null) ?? "Customer",
    phone: prettyKePhone((row.phone as string | null) ?? ""),
  }));
}

export async function fetchCustomers(): Promise<Customer[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from("customer_loyalty_stats")
    .select("customer_id, name, phone, paid_sale_count, lifetime_spend, last_paid_at, credit_balance");
  if (error || !data?.length) return [];
  return data.map((row) => {
    const spend = Number(row.lifetime_spend);
    const visits = Number(row.paid_sale_count);
    const last = row.last_paid_at
      ? new Date(row.last_paid_at as string).toLocaleDateString("en-KE", {
          day: "numeric",
          month: "short",
        })
      : "—";
    return {
      id: row.customer_id as string,
      name: (row.name as string | null) ?? "Customer",
      phone: prettyKePhone((row.phone as string | null) ?? ""),
      visits,
      spend,
      debt: Number(row.credit_balance),
      lastSeen: last,
      tier: visits >= 30 ? "VIP" : visits >= 15 ? "Loyal" : "Regular",
    };
  });
}

export async function fetchCustomer(id: string): Promise<Customer | undefined> {
  const list = await fetchCustomers();
  return list.find((c) => c.id === id);
}

export async function fetchTenants(): Promise<Tenant[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from("admin_tenant_map")
    .select(
      "id, name, category, phone, status, location_lat, location_lng, address_text, created_at, subscription_amount, owner_name, plan_code",
    );
  if (error || !data?.length) return [];
  return data.map((row) => ({
    id: row.id as string,
    business: row.name as string,
    owner: ((row.owner_name as string | null)?.trim() || "—") as string,
    phone: prettyKePhone(row.phone as string),
    category: categoryLabel(row.category as string),
    town: (row.address_text as string | null)?.split(",").pop()?.trim() ?? "Nairobi",
    status: STATUS_MAP[String(row.status)] ?? "Trial",
    mrr: Number(row.subscription_amount ?? 0),
    joined: new Date(row.created_at as string).toLocaleDateString("en-KE", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }),
    lat: Number(row.location_lat ?? -1.2921),
    lng: Number(row.location_lng ?? 36.8219),
    createdAt: row.created_at as string,
  }));
}

export type WeekPoint = { day: string; sales: number; credit: number };
export type ChannelShare = { channel: string; value: number };
export type CashflowPoint = { week: string; actual: number | null; forecast: number };

function weekdayShort(iso: string): string {
  return new Date(iso).toLocaleDateString("en-KE", {
    weekday: "short",
    timeZone: "Africa/Nairobi",
  });
}

/**
 * Last 7 Nairobi calendar days of paid sales vs credit charges.
 */
export async function fetchWeekTrend(): Promise<WeekPoint[]> {
  const days: WeekPoint[] = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    days.push({ day: weekdayShort(d.toISOString()), sales: 0, credit: 0 });
  }
  const keys = days.map((_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - i));
    return nairobiDay(d);
  });
  const index = new Map(keys.map((k, i) => [k, i]));

  const sb = getSupabase();
  if (!sb) return days;
  const since = new Date();
  since.setDate(since.getDate() - 7);

  const { data: sales } = await sb
    .from("sales")
    .select("total, paid_at, created_at, status")
    .gte("created_at", since.toISOString())
    .limit(2000);
  for (const row of sales ?? []) {
    if (String(row.status) !== "PAID") continue;
    const key = nairobiDay((row.paid_at as string | null) ?? (row.created_at as string));
    const i = index.get(key);
    if (i == null) continue;
    days[i]!.sales += Number(row.total);
  }

  const { data: credit } = await sb
    .from("credit_entries")
    .select("amount, created_at, entry_type")
    .eq("entry_type", "CHARGE")
    .gte("created_at", since.toISOString())
    .limit(2000);
  for (const row of credit ?? []) {
    const key = nairobiDay(row.created_at as string);
    const i = index.get(key);
    if (i == null) continue;
    days[i]!.credit += Number(row.amount);
  }
  return days;
}

export async function fetchChannelSplit(): Promise<ChannelShare[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const since = new Date();
  since.setDate(since.getDate() - 7);
  const { data } = await sb
    .from("sales")
    .select("total, payment_channel, status")
    .eq("status", "PAID")
    .gte("paid_at", since.toISOString())
    .limit(2000);
  const totals = new Map<string, number>();
  let sum = 0;
  for (const row of data ?? []) {
    const label = CHANNEL_MAP[String(row.payment_channel)] ?? "Cash";
    const amt = Number(row.total);
    totals.set(label, (totals.get(label) ?? 0) + amt);
    sum += amt;
  }
  if (!sum) return [];
  return [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([channel, value]) => ({ channel, value: Math.round((value / sum) * 100) }));
}

/**
 * Weekly paid revenue for the last `past` weeks, plus a 2-week moving-average forecast.
 */
export async function fetchCashflowWeeks(past = 4): Promise<CashflowPoint[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const start = new Date();
  start.setDate(start.getDate() - past * 7);
  const { data } = await sb
    .from("sales")
    .select("total, paid_at, status")
    .eq("status", "PAID")
    .gte("paid_at", start.toISOString())
    .limit(4000);

  const buckets = new Map<string, number>();
  for (let i = past - 1; i >= 0; i--) {
    buckets.set(`W${past - i}`, 0);
  }
  const now = Date.now();
  for (const row of data ?? []) {
    const paid = new Date(row.paid_at as string).getTime();
    const weeksAgo = Math.floor((now - paid) / (7 * 86_400_000));
    if (weeksAgo < 0 || weeksAgo >= past) continue;
    const label = `W${past - weeksAgo}`;
    buckets.set(label, (buckets.get(label) ?? 0) + Number(row.total));
  }

  const actuals = [...buckets.entries()].map(([week, actual]) => ({ week, actual }));
  const window = actuals.slice(-3).map((r) => r.actual);
  const avg = window.length ? window.reduce((s, n) => s + n, 0) / window.length : 0;
  const last = actuals.at(-1)?.actual ?? 0;
  const points: CashflowPoint[] = actuals.map((r, i) => ({
    week: r.week,
    actual: r.actual,
    forecast: i === 0 ? r.actual : Math.round((r.actual + (actuals[i - 1]?.actual ?? r.actual)) / 2),
  }));
  points.push({ week: `W${past + 1}`, actual: null, forecast: Math.round(avg || last) });
  points.push({
    week: `W${past + 2}`,
    actual: null,
    forecast: Math.round((avg || last) * 1.04),
  });
  return points;
}

export function mrrTrendFromTenants(
  tenants: Tenant[],
): Array<{ month: string; mrr: number; tenants: number }> {
  const now = new Date();
  const months: Array<{ month: string; end: Date }> = [];
  for (let i = 5; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59);
    months.push({
      month: start.toLocaleString("en-KE", { month: "short" }),
      end,
    });
  }
  return months.map(({ month, end }, idx) => {
    const isLatest = idx === months.length - 1;
    const active = tenants.filter((t) => {
      if (t.status !== "Active") return false;
      if (!t.createdAt) return isLatest;
      return new Date(t.createdAt) <= end;
    });
    return {
      month,
      mrr: active.reduce((s, t) => s + t.mrr, 0),
      tenants: active.length,
    };
  });
}

export async function fetchTodaySales(): Promise<{
  total: number;
  count: number;
  yesterday: number;
}> {
  const sb = getSupabase();
  if (!sb) return { total: 0, count: 0, yesterday: 0 };
  const now = new Date();
  const todayKey = nairobiDay(now);
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  const yesterdayKey = nairobiDay(y);
  const since = new Date();
  since.setDate(since.getDate() - 2);
  const { data } = await sb
    .from("sales")
    .select("total, paid_at, created_at, status")
    .eq("status", "PAID")
    .gte("created_at", since.toISOString())
    .limit(2000);
  let total = 0;
  let count = 0;
  let yesterday = 0;
  for (const row of data ?? []) {
    const key = nairobiDay((row.paid_at as string | null) ?? (row.created_at as string));
    const amt = Number(row.total);
    if (key === todayKey) {
      total += amt;
      count += 1;
    } else if (key === yesterdayKey) {
      yesterday += amt;
    }
  }
  return { total, count, yesterday };
}

export async function fetchTenant(id: string): Promise<Tenant | undefined> {
  const list = await fetchTenants();
  return list.find((t) => t.id === id);
}

export async function startImpersonation(tenant: Tenant): Promise<GhostSession> {
  const session: GhostSession = { tenantId: tenant.id, business: tenant.business };
  const sb = getSupabase();
  if (sb) {
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (user) {
      const { data } = await sb
        .from("admin_impersonation_audit")
        .insert({
          admin_id: user.id,
          target_tenant_id: tenant.id,
          reason: "Live support",
        })
        .select("id")
        .maybeSingle();
      if (data?.id) session.auditId = data.id as string;
    }
  }
  startGhost(session);
  return session;
}

export type PaymentDestination = {
  destinationType: "PERSONAL_MPESA" | "TILL" | "PAYBILL" | "POCHI";
  accountNumber: string;
  accountName: string | null;
  isPrimary: boolean;
};

export async function fetchPaymentDestinations(): Promise<PaymentDestination[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data: profile } = await sb.from("profiles").select("tenant_id").maybeSingle();
  if (!profile?.tenant_id) return [];
  const { data, error } = await sb
    .from("tenant_payment_destinations")
    .select("destination_type, account_number, account_name, is_primary")
    .eq("tenant_id", profile.tenant_id)
    .order("is_primary", { ascending: false });
  if (error || !data) return [];
  return data.map((row) => ({
    destinationType: row.destination_type as PaymentDestination["destinationType"],
    accountNumber: String(row.account_number),
    accountName: (row.account_name as string | null) ?? null,
    isPrimary: Boolean(row.is_primary),
  }));
}

export async function fetchPrimaryPaymentDestination(): Promise<PaymentDestination | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data: profile } = await sb.from("profiles").select("tenant_id").maybeSingle();
  if (!profile?.tenant_id) return null;
  const { data } = await sb
    .from("tenant_payment_destinations")
    .select("destination_type, account_number, account_name")
    .eq("tenant_id", profile.tenant_id)
    .eq("is_primary", true)
    .maybeSingle();
  if (!data) return null;
  return {
    destinationType: data.destination_type as PaymentDestination["destinationType"],
    accountNumber: String(data.account_number),
    accountName: (data.account_name as string | null) ?? null,
    isPrimary: true,
  };
}

function fmtShortDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-KE", { day: "numeric", month: "short" });
}

function creditStatus(dueAt: string | null): DebtEntry["status"] {
  if (!dueAt) return "Current";
  const due = new Date(dueAt).getTime();
  const now = Date.now();
  const day = 86_400_000;
  if (due < now) return "Overdue";
  if (due - now <= 3 * day) return "Due soon";
  return "Current";
}

export async function fetchCreditBook(): Promise<DebtEntry[]> {
  const sb = getSupabase();
  if (!sb) return [];

  const { data: profile } = await sb.from("profiles").select("tenant_id").maybeSingle();
  if (!profile?.tenant_id) return [];

  const { data: customers, error } = await sb
    .from("customers")
    .select("id, name, phone, email")
    .eq("tenant_id", profile.tenant_id);
  if (error || !customers?.length) return [];

  const rows: DebtEntry[] = [];
  for (const customer of customers) {
    const { data: balance } = await sb.rpc("customer_credit_balance", {
      p_customer_id: customer.id,
    });
    const amount = Number(balance ?? 0);
    if (!(amount > 0)) continue;

    const { data: lastCharge } = await sb
      .from("credit_entries")
      .select("created_at, due_at")
      .eq("customer_id", customer.id)
      .eq("entry_type", "CHARGE")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    rows.push({
      id: customer.id as string,
      customer: (customer.name as string | null) ?? "Customer",
      phone: prettyKePhone((customer.phone as string | null) ?? ""),
      amount,
      taken: fmtShortDate(lastCharge?.created_at as string | undefined),
      due: fmtShortDate(lastCharge?.due_at as string | undefined),
      status: creditStatus((lastCharge?.due_at as string | null) ?? null),
      lastReminder: "—",
    });
  }

  return rows.sort((a, b) => b.amount - a.amount);
}

export async function recordCredit(input: {
  nameOrPhone: string;
  amount: number;
  dueDays: number;
}): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error("Sign in to record credit");

  const { data: profile } = await sb
    .from("profiles")
    .select("id, tenant_id")
    .maybeSingle();
  if (!profile?.tenant_id) throw new Error("Complete onboarding first");

  const raw = input.nameOrPhone.trim();
  const phoneLike = /^[\d+\s-]{9,}$/.test(raw);
  let phone: string | null = null;
  let name = raw;
  if (phoneLike) {
    try {
      phone = to254(raw);
      name = prettyKePhone(phone);
    } catch {
      phone = raw.replace(/\D/g, "") || null;
    }
  }

  let customerId: string | null = null;
  if (phone) {
    const { data: existing } = await sb
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
    const { data: created, error } = await sb
      .from("customers")
      .insert({
        tenant_id: profile.tenant_id,
        name,
        phone,
      })
      .select("id")
      .single();
    if (error || !created) throw new Error(error?.message ?? "Could not create customer");
    customerId = created.id as string;
  }

  const due = new Date();
  due.setDate(due.getDate() + Math.max(1, input.dueDays));

  const { error: cErr } = await sb.from("credit_entries").insert({
    tenant_id: profile.tenant_id,
    customer_id: customerId,
    entry_type: "CHARGE",
    amount: input.amount,
    due_at: due.toISOString(),
    created_by: profile.id,
    note: "Manual credit entry",
  });
  if (cErr) throw new Error(cErr.message);
}

export async function remindCredit(row: DebtEntry): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error("Sign in to send reminders");

  const { data: customer } = await sb
    .from("customers")
    .select("id, name, email, phone")
    .eq("id", row.id)
    .maybeSingle();

  const email = (customer?.email as string | null)?.trim() ?? "";
  if (!email.includes("@")) {
    throw new Error(
      `${row.customer} has no email on file. Add an email on the Customers page to send reminders.`,
    );
  }

  const { error } = await invokeFunction("dispatch-outbound", {
    template_id: "credit-reminder",
    to: email,
    vars: {
      customer_name: row.customer,
      amount: KES(row.amount),
    },
    idempotency_key: `credit-reminder/${row.id}/${new Date().toISOString().slice(0, 10)}`,
  });
  if (error) throw new Error(error);
}
