import type { CachedVendorProfile, CachedShop, CachedTenantHeader } from "@/lib/offline/db";
import type { Customer, DebtEntry, NotificationItem, Product, Sale } from "@/lib/mock-data";
import {
  cachePaymentDestination,
  cacheProfile,
  cacheTenantAccess,
  cacheTenantHeader,
  offlineDb,
  type CachedOpenSale,
  type CachedPaymentDestination,
} from "@/lib/offline/db";

export async function replaceProducts(rows: Product[]): Promise<void> {
  if (!offlineDb || !rows.length) return;
  await offlineDb.transaction("rw", offlineDb.products, async () => {
    await offlineDb!.products.clear();
    await offlineDb!.products.bulkPut(rows);
  });
}

export async function putProduct(row: Product): Promise<void> {
  if (!offlineDb) return;
  await offlineDb.products.put(row);
}

export async function removeProduct(id: string): Promise<void> {
  if (!offlineDb) return;
  await offlineDb.products.delete(id);
}

export async function readProducts(): Promise<Product[]> {
  if (!offlineDb) return [];
  return offlineDb.products
    .orderBy("id")
    .toArray()
    .then((rows) => rows.sort((a, b) => a.name.localeCompare(b.name)));
}

export async function readProduct(id: string): Promise<Product | undefined> {
  if (!offlineDb) return undefined;
  return offlineDb.products.get(id);
}

export async function replaceCustomers(rows: Customer[]): Promise<void> {
  if (!offlineDb || !rows.length) return;
  await offlineDb.transaction("rw", offlineDb.customers, async () => {
    await offlineDb!.customers.clear();
    await offlineDb!.customers.bulkPut(rows);
  });
}

export async function putCustomer(row: Customer): Promise<void> {
  if (!offlineDb) return;
  await offlineDb.customers.put(row);
  await offlineDb.shopCustomers.put({
    id: row.id,
    name: row.name,
    phone: row.phone,
  });
}

export async function readCustomers(): Promise<Customer[]> {
  if (!offlineDb) return [];
  return offlineDb.customers
    .orderBy("id")
    .toArray()
    .then((rows) => rows.sort((a, b) => a.name.localeCompare(b.name)));
}

export async function replaceShopCustomers(
  rows: { id: string; name: string; phone: string }[],
): Promise<void> {
  if (!offlineDb || !rows.length) return;
  await offlineDb.transaction("rw", offlineDb.shopCustomers, async () => {
    await offlineDb!.shopCustomers.clear();
    await offlineDb!.shopCustomers.bulkPut(rows);
  });
}

export async function readShopCustomers(): Promise<{ id: string; name: string; phone: string }[]> {
  if (!offlineDb) return [];
  return offlineDb.shopCustomers
    .orderBy("id")
    .toArray()
    .then((rows) => rows.sort((a, b) => a.name.localeCompare(b.name)));
}

export async function replaceSales(rows: Sale[]): Promise<void> {
  if (!offlineDb || !rows.length) return;
  await offlineDb.transaction("rw", offlineDb.sales, async () => {
    await offlineDb!.sales.clear();
    await offlineDb!.sales.bulkPut(rows);
  });
}

export async function putSale(row: Sale): Promise<void> {
  if (!offlineDb) return;
  await offlineDb.sales.put(row);
}

export async function readSales(): Promise<Sale[]> {
  if (!offlineDb) return [];
  const rows = await offlineDb.sales.toArray();
  return rows.sort((a, b) => String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")));
}

export async function replaceOpenSales(rows: CachedOpenSale[]): Promise<void> {
  if (!offlineDb) return;
  await offlineDb.transaction("rw", offlineDb.openSales, async () => {
    await offlineDb!.openSales.clear();
    if (rows.length) await offlineDb!.openSales.bulkPut(rows);
  });
}

export async function putOpenSale(row: CachedOpenSale): Promise<void> {
  if (!offlineDb) return;
  await offlineDb.openSales.put(row);
}

export async function removeOpenSale(id: string): Promise<void> {
  if (!offlineDb) return;
  await offlineDb.openSales.delete(id);
}

export async function readOpenSales(): Promise<CachedOpenSale[]> {
  if (!offlineDb) return [];
  const rows = await offlineDb.openSales.toArray();
  return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function replaceCreditBook(rows: DebtEntry[]): Promise<void> {
  if (!offlineDb || !rows.length) return;
  await offlineDb.transaction("rw", offlineDb.creditBook, async () => {
    await offlineDb!.creditBook.clear();
    await offlineDb!.creditBook.bulkPut(rows);
  });
}

export async function readCreditBook(): Promise<DebtEntry[]> {
  if (!offlineDb) return [];
  return offlineDb.creditBook.toArray();
}

export async function replaceShops(rows: CachedShop[]): Promise<void> {
  if (!offlineDb || !rows.length) return;
  await offlineDb.transaction("rw", offlineDb.shops, async () => {
    await offlineDb!.shops.clear();
    await offlineDb!.shops.bulkPut(rows);
  });
}

export async function readShops(): Promise<CachedShop[]> {
  if (!offlineDb) return [];
  return offlineDb.shops.toArray();
}

export async function replaceNotifications(rows: NotificationItem[]): Promise<void> {
  if (!offlineDb || !rows.length) return;
  await offlineDb.transaction("rw", offlineDb.notifications, async () => {
    await offlineDb!.notifications.clear();
    await offlineDb!.notifications.bulkPut(rows);
  });
}

export async function readNotifications(): Promise<NotificationItem[]> {
  if (!offlineDb) return [];
  return offlineDb.notifications.toArray();
}

export async function snapshotWorkspace(input: {
  profile?: CachedVendorProfile | null;
  tenantHeader?: CachedTenantHeader | null;
  paymentDestination?: CachedPaymentDestination | null;
  tenantAccess?: boolean;
}): Promise<void> {
  if (input.profile) await cacheProfile(input.profile);
  if (input.tenantHeader) await cacheTenantHeader(input.tenantHeader);
  if (input.paymentDestination !== undefined) {
    await cachePaymentDestination(input.paymentDestination);
  }
  if (input.tenantAccess !== undefined) await cacheTenantAccess(input.tenantAccess);
}

/** Optimistically reduce local stock after an offline sale. */
export async function adjustLocalStock(
  lines: { productId: string; qty: number }[],
  direction: "decrement" | "increment" = "decrement",
): Promise<void> {
  if (!offlineDb) return;
  for (const line of lines) {
    const product = await offlineDb.products.get(line.productId);
    if (!product) continue;
    const next =
      direction === "decrement" ? Math.max(0, product.stock - line.qty) : product.stock + line.qty;
    await offlineDb.products.put({ ...product, stock: next });
  }
}
