import Dexie, { type EntityTable } from "dexie";
import type { Customer, DebtEntry, NotificationItem, Product, Sale } from "@/lib/mock-data";

export type CachedVendorProfile = {
  id: string;
  tenant_id: string | null;
  role: string;
  full_name: string | null;
  phone: string | null;
  avatar_url?: string | null;
  active_shop_id?: string | null;
  pending_shop_name?: string | null;
  onboarding_completed_at?: string | null;
};

export type CachedPaymentDestination = {
  destinationType: "PERSONAL_MPESA" | "TILL" | "PAYBILL" | "POCHI";
  accountNumber: string;
  accountName: string | null;
};

/** Mirrors OpenSale from data.ts without creating a circular import. */
export type CachedOpenSale = {
  id: string;
  ref: string;
  status: "DRAFT" | "PENDING_PAYMENT";
  total: number;
  createdAt: string;
  label: string;
  itemCount: number;
  discount: number;
  billRef: string | null;
  lines: { productId: string; name: string; qty: number; price: number }[];
  offlinePending?: boolean;
};

export type CachedShop = {
  id: string;
  name: string;
  category: string;
  address_text: string | null;
  phone: string | null;
  is_default: boolean;
  location_lat: number | null;
  location_lng: number | null;
};

export type CachedTenantHeader = {
  id: string;
  name: string;
  legal_name: string | null;
  kra_pin: string | null;
  email: string | null;
  phone: string;
  address_text: string | null;
  category: string;
  vat_registered: boolean;
  logo_url: string | null;
  location_lat: number | null;
  location_lng: number | null;
  email_receipt_enabled?: boolean;
};

export type OfflineOpType =
  | "checkout_sale"
  | "confirm_mpesa"
  | "save_product"
  | "delete_product"
  | "save_customer"
  | "record_credit"
  | "cancel_open_sale";

export type OfflineOpStatus =
  "pending" | "syncing" | "applied" | "conflict" | "needs_online" | "failed";

export type OfflineOp = {
  id: string;
  type: OfflineOpType;
  payload: Record<string, unknown>;
  createdAt: string;
  status: OfflineOpStatus;
  attempts: number;
  lastError?: string | null;
  conflictCode?: string | null;
  result?: Record<string, unknown> | null;
};

export type SyncConflict = {
  id: string;
  opId: string;
  code: string;
  message: string;
  createdAt: string;
  resolved: boolean;
  meta?: Record<string, unknown> | null;
};

export type MetaRow = {
  key: string;
  value: unknown;
  updatedAt: string;
};

class InuaBizOfflineDb extends Dexie {
  products!: EntityTable<Product, "id">;
  customers!: EntityTable<Customer, "id">;
  shopCustomers!: EntityTable<{ id: string; name: string; phone: string }, "id">;
  sales!: EntityTable<Sale, "id">;
  openSales!: EntityTable<CachedOpenSale, "id">;
  creditBook!: EntityTable<DebtEntry, "id">;
  shops!: EntityTable<CachedShop, "id">;
  notifications!: EntityTable<NotificationItem, "id">;
  outbox!: EntityTable<OfflineOp, "id">;
  conflicts!: EntityTable<SyncConflict, "id">;
  meta!: EntityTable<MetaRow, "key">;

  constructor() {
    super("inuabiz-offline");
    this.version(1).stores({
      products: "id",
      customers: "id",
      shopCustomers: "id",
      sales: "id, createdAt",
      openSales: "id, createdAt",
      creditBook: "id",
      shops: "id",
      notifications: "id",
      outbox: "id, status, createdAt, type",
      conflicts: "id, resolved, createdAt, opId",
      meta: "key",
    });
  }
}

export const offlineDb = typeof window !== "undefined" ? new InuaBizOfflineDb() : null;

export async function setMeta(key: string, value: unknown): Promise<void> {
  if (!offlineDb) return;
  await offlineDb.meta.put({ key, value, updatedAt: new Date().toISOString() });
}

export async function getMeta<T>(key: string): Promise<T | null> {
  if (!offlineDb) return null;
  const row = await offlineDb.meta.get(key);
  return (row?.value as T | undefined) ?? null;
}

export async function cacheProfile(profile: CachedVendorProfile): Promise<void> {
  await setMeta("profile", profile);
}

export async function readCachedProfile(): Promise<CachedVendorProfile | null> {
  return getMeta<CachedVendorProfile>("profile");
}

export async function cacheTenantHeader(header: CachedTenantHeader): Promise<void> {
  await setMeta("tenantHeader", header);
}

export async function readCachedTenantHeader(): Promise<CachedTenantHeader | null> {
  return getMeta<CachedTenantHeader>("tenantHeader");
}

export async function cachePaymentDestination(
  dest: CachedPaymentDestination | null,
): Promise<void> {
  await setMeta("paymentDestination", dest);
}

export async function readCachedPaymentDestination(): Promise<CachedPaymentDestination | null> {
  return getMeta<CachedPaymentDestination>("paymentDestination");
}

export async function cacheTenantAccess(access: boolean): Promise<void> {
  await setMeta("tenantAccess", access);
}

export async function readCachedTenantAccess(): Promise<boolean | null> {
  return getMeta<boolean>("tenantAccess");
}
