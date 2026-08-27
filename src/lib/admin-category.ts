import {
  BUSINESS_CATEGORIES,
  categoryDef,
  categoryHasModule,
  daysUntilExpiry,
  parseCategory,
  type BusinessCategory,
  type FeatureModule,
} from "@/lib/category";
import { tenants as mockTenants } from "@/lib/mock-data";
import { getSupabase } from "@/lib/supabase";

export type AdminShopRow = {
  id: string;
  tenantId: string;
  tenantName: string;
  name: string;
  category: BusinessCategory;
  address: string | null;
  isDefault: boolean;
};

export type AdminExpiryRow = {
  productId: string;
  name: string;
  shopId: string | null;
  shopName: string;
  tenantId: string;
  tenantName: string;
  category: BusinessCategory;
  expiry: string;
  days: number;
  batch: string | null;
};

export type AdminTicketRow = {
  id: string;
  kind: "KITCHEN" | "SERVICE";
  status: string;
  title: string;
  shopId: string;
  shopName: string;
  tenantId: string;
  tenantName: string;
  category: BusinessCategory;
  createdAt: string;
};

export type AdminFloorRow = {
  id: string;
  label: string;
  status: string;
  seats: number;
  shopId: string;
  shopName: string;
  tenantId: string;
  tenantName: string;
};

export type CategoryMix = {
  id: BusinessCategory;
  shops: number;
  tenants: number;
};

function mockShops(): AdminShopRow[] {
  return mockTenants.map((t) => ({
    id: t.id,
    tenantId: t.id,
    tenantName: t.business,
    name: t.business,
    category: parseCategory(t.category),
    address: t.town,
    isDefault: true,
  }));
}

export async function fetchAdminShops(): Promise<AdminShopRow[]> {
  const sb = getSupabase();
  if (!sb) return mockShops();
  const { data: shops, error } = await sb
    .from("shops")
    .select("id, tenant_id, name, category, address_text, is_default")
    .order("created_at");
  if (error || !shops?.length) return [];
  const tenantIds = [...new Set(shops.map((s) => s.tenant_id as string))];
  const { data: tenants } = await sb.from("tenants").select("id, name").in("id", tenantIds);
  const names = new Map((tenants ?? []).map((t) => [t.id as string, t.name as string]));
  return shops.map((s) => ({
    id: s.id as string,
    tenantId: s.tenant_id as string,
    tenantName: names.get(s.tenant_id as string) ?? "—",
    name: s.name as string,
    category: parseCategory(s.category as string),
    address: (s.address_text as string | null) ?? null,
    isDefault: Boolean(s.is_default),
  }));
}

export function categoryMix(shops: AdminShopRow[]): CategoryMix[] {
  const byCat = new Map<BusinessCategory, { shops: number; tenants: Set<string> }>();
  for (const id of BUSINESS_CATEGORIES) {
    byCat.set(id, { shops: 0, tenants: new Set() });
  }
  for (const shop of shops) {
    const row = byCat.get(shop.category)!;
    row.shops += 1;
    row.tenants.add(shop.tenantId);
  }
  return BUSINESS_CATEGORIES.map((id) => {
    const row = byCat.get(id)!;
    return { id, shops: row.shops, tenants: row.tenants.size };
  });
}

export function shopsForTenant(shops: AdminShopRow[], tenantId: string): AdminShopRow[] {
  return shops.filter((s) => s.tenantId === tenantId);
}

export function shopCategoriesLabel(shops: AdminShopRow[]): string {
  const unique = [...new Set(shops.map((s) => categoryDef(s.category).label))];
  return unique.join(" · ");
}

export async function fetchAdminExpiryWatch(shops?: AdminShopRow[]): Promise<AdminExpiryRow[]> {
  const sb = getSupabase();
  const shopRows = shops ?? (await fetchAdminShops());
  const shopMap = new Map(shopRows.map((s) => [s.id, s]));
  if (!sb) return [];
  const { data, error } = await sb
    .from("products")
    .select("id, name, shop_id, tenant_id, attrs")
    .eq("is_active", true)
    .limit(2000);
  if (error || !data) return [];
  const rows: AdminExpiryRow[] = [];
  for (const row of data) {
    const attrs = (row.attrs ?? {}) as { expiry_date?: string; batch_number?: string };
    const expiry = attrs.expiry_date;
    const days = daysUntilExpiry(expiry);
    if (!expiry || days == null) continue;
    const shop = row.shop_id ? shopMap.get(row.shop_id as string) : undefined;
    rows.push({
      productId: row.id as string,
      name: row.name as string,
      shopId: (row.shop_id as string | null) ?? null,
      shopName: shop?.name ?? "—",
      tenantId: (row.tenant_id as string) ?? shop?.tenantId ?? "",
      tenantName: shop?.tenantName ?? "—",
      category: shop?.category ?? "DUKA",
      expiry,
      days,
      batch: attrs.batch_number ?? null,
    });
  }
  return rows.sort((a, b) => a.days - b.days);
}

export async function fetchAdminOpenTickets(shops?: AdminShopRow[]): Promise<AdminTicketRow[]> {
  const sb = getSupabase();
  const shopRows = shops ?? (await fetchAdminShops());
  const shopMap = new Map(shopRows.map((s) => [s.id, s]));
  if (!sb) return [];
  const { data, error } = await sb
    .from("shop_tickets")
    .select("id, kind, status, title, shop_id, tenant_id, created_at")
    .in("status", ["NEW", "PREP", "READY"])
    .order("created_at", { ascending: false })
    .limit(200);
  if (error || !data) return [];
  return data.map((row) => {
    const shop = shopMap.get(row.shop_id as string);
    return {
      id: row.id as string,
      kind: row.kind as "KITCHEN" | "SERVICE",
      status: row.status as string,
      title: row.title as string,
      shopId: row.shop_id as string,
      shopName: shop?.name ?? "—",
      tenantId: (row.tenant_id as string) ?? shop?.tenantId ?? "",
      tenantName: shop?.tenantName ?? "—",
      category: shop?.category ?? "DUKA",
      createdAt: row.created_at as string,
    };
  });
}

export async function fetchAdminFloor(shops?: AdminShopRow[]): Promise<AdminFloorRow[]> {
  const sb = getSupabase();
  const shopRows = shops ?? (await fetchAdminShops());
  const shopMap = new Map(shopRows.map((s) => [s.id, s]));
  if (!sb) return [];
  const { data, error } = await sb
    .from("shop_floor_tables")
    .select("id, label, status, seats, shop_id, tenant_id")
    .in("status", ["SEATED", "BILLING"]);
  if (error || !data) return [];
  return data.map((row) => {
    const shop = shopMap.get(row.shop_id as string);
    return {
      id: row.id as string,
      label: row.label as string,
      status: row.status as string,
      seats: Number(row.seats),
      shopId: row.shop_id as string,
      shopName: shop?.name ?? "—",
      tenantId: (row.tenant_id as string) ?? shop?.tenantId ?? "",
      tenantName: shop?.tenantName ?? "—",
    };
  });
}

export function tenantModules(shops: AdminShopRow[]): FeatureModule[] {
  return [...new Set(shops.flatMap((s) => categoryDef(s.category).modules))];
}

export function tenantHasModule(shops: AdminShopRow[], module: FeatureModule): boolean {
  return shops.some((s) => categoryHasModule(s.category, module));
}

export type AdminCategoryDesk = {
  shops: AdminShopRow[];
  expiry: AdminExpiryRow[];
  tickets: AdminTicketRow[];
  floor: AdminFloorRow[];
};

export async function fetchAdminCategoryDesk(): Promise<AdminCategoryDesk> {
  const shops = await fetchAdminShops();
  const [expiry, tickets, floor] = await Promise.all([
    fetchAdminExpiryWatch(shops),
    fetchAdminOpenTickets(shops),
    fetchAdminFloor(shops),
  ]);
  return { shops, expiry, tickets, floor };
}
