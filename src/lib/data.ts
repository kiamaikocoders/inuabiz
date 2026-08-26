import {
  customers as mockCustomers,
  products as mockProducts,
  sales as mockSales,
  tenants as mockTenants,
  type Customer,
  type Product,
  type Sale,
  type Tenant,
} from "@/lib/mock-data";
import { getSupabase } from "@/lib/supabase";
import { prettyKePhone } from "@/lib/phone";
import { startGhost, type GhostSession } from "@/lib/ghost";

const STATUS_MAP: Record<string, Tenant["status"]> = {
  ACTIVE: "Active",
  TRIAL: "Trial",
  PAST_DUE: "Error",
  SUSPENDED: "Suspended",
};

const CATEGORY_MAP: Record<string, Tenant["category"]> = {
  DUKA: "Duka",
  BOUTIQUE: "Boutique",
  CHEMIST: "Chemist",
  HARDWARE: "Hardware",
  EATERY: "Eatery",
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
  },
): Promise<{ demo: boolean; id: string }> {
  const sb = getSupabase();
  if (!sb) return { demo: true, id: input.id ?? `p-${Date.now()}` };
  const payload = {
    name: input.name,
    sku: input.sku || null,
    cost_price: input.cost,
    selling_price: input.price,
    stock_qty: input.stock,
    low_stock_threshold: input.reorderLevel,
  };
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
    category: CATEGORY_MAP[String(row.category)] ?? "Duka",
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
