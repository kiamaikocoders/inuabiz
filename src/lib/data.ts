import {
  customers as mockCustomers,
  debts as mockDebts,
  products as mockProducts,
  sales as mockSales,
  tenants as mockTenants,
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
  if (!sb) return mockProducts;
  const { data, error } = await sb
    .from("products")
    .select("id, name, sku, cost_price, selling_price, stock_qty, low_stock_threshold")
    .eq("is_active", true)
    .order("name");
  if (error || !data?.length) return [];
  return data.map((row) => ({
    id: row.id as string,
    name: row.name as string,
    sku: (row.sku as string | null) ?? "—",
    category: "General",
    cost: Number(row.cost_price),
    price: Number(row.selling_price),
    stock: Number(row.stock_qty),
    reorderLevel: Number(row.low_stock_threshold),
    emoji: "📦",
  }));
}

export async function fetchProduct(id: string): Promise<Product | undefined> {
  const list = await fetchProducts();
  return list.find((p) => p.id === id);
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
  const { data, error } = await sb.from("products").insert(payload).select("id").single();
  if (error) throw new Error(error.message);
  return { demo: false, id: data.id as string };
}

export async function fetchSales(): Promise<Sale[]> {
  const sb = getSupabase();
  if (!sb) return mockSales;
  const { data, error } = await sb
    .from("sales")
    .select("id, total, status, payment_channel, customer_phone, created_at")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error || !data?.length) return mockSales;
  return data.map((row, i) => {
    const created = new Date(row.created_at as string);
    return {
      id: row.id as string,
      ref: `SL-${String(i + 10231)}`,
      time: created.toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" }),
      items: 1,
      total: Number(row.total),
      channel: CHANNEL_MAP[String(row.payment_channel)] ?? "Cash",
      customer: (row.customer_phone as string | null)
        ? prettyKePhone(row.customer_phone as string)
        : "Walk-in",
      status: SALE_STATUS[String(row.status)] ?? "Pending",
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
  if (!sb) return mockCustomers;
  const { data, error } = await sb
    .from("customer_loyalty_stats")
    .select("customer_id, name, phone, paid_sale_count, lifetime_spend, last_paid_at, credit_balance");
  if (error || !data?.length) return mockCustomers;
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
  if (!sb) return mockTenants;
  const { data, error } = await sb
    .from("admin_tenant_map")
    .select(
      "id, name, category, phone, status, location_lat, location_lng, address_text, created_at, subscription_amount",
    );
  if (error || !data?.length) return mockTenants;
  return data.map((row) => ({
    id: row.id as string,
    business: row.name as string,
    owner: (row.address_text as string | null) ?? "—",
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
  }));
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
  destinationType: "PERSONAL_MPESA" | "TILL" | "PAYBILL";
  accountNumber: string;
  accountName: string | null;
};

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
  if (!sb) return mockDebts;

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
