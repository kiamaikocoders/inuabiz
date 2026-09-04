import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { to254 } from "@/lib/phone";
import { cellAt, csvHeaderMap, numCell, parseCsv } from "@/lib/csv";
import { saveProduct, saveCustomer } from "@/lib/data";
import type { TaxClass } from "@/lib/tax";

export type ImportKind = "products" | "customers" | "sales";

export type ImportRowError = { row: number; message: string };

export type ImportPreview = {
  kind: ImportKind;
  totalRows: number;
  ready: number;
  errors: ImportRowError[];
  sample: Record<string, string>[];
};

export type ImportResult = {
  kind: ImportKind;
  imported: number;
  skipped: number;
  errors: ImportRowError[];
};

const PRODUCT_TEMPLATE = [
  ["name", "sku", "barcode", "cost", "price", "stock", "reorder_level", "tax_class", "classification_code", "department"],
  ["Gaviscon", "GAV-001", "", "80", "120", "24", "5", "ZERO_RATED", "", "Pharmacy"],
  ["Bread 400g", "BRD-400", "", "40", "55", "30", "10", "STANDARD_16", "", "General"],
];

const CUSTOMER_TEMPLATE = [
  ["name", "phone", "email", "notes", "opening_balance", "due_days"],
  ["Amina Wanjiku", "0712345678", "amina@example.com", "Regular", "1500", "14"],
  ["Walk-in credit", "0798765432", "", "Opened before InuaBiz", "500", "7"],
];

const SALES_TEMPLATE = [
  ["date", "product_sku_or_name", "qty", "unit_price", "channel", "customer_name", "customer_phone", "notes"],
  ["2026-01-15", "GAV-001", "2", "120", "CASH", "", "", "Pre-InuaBiz till book"],
  ["2026-01-16", "Bread 400g", "1", "55", "CREDIT", "Amina Wanjiku", "0712345678", ""],
];

export function backfillTemplate(kind: ImportKind): string[][] {
  if (kind === "products") return PRODUCT_TEMPLATE;
  if (kind === "customers") return CUSTOMER_TEMPLATE;
  return SALES_TEMPLATE;
}

async function resolveTenantContext(): Promise<{
  tenantId: string;
  userId: string;
  shopId: string | null;
}> {
  const sb = getSupabase();
  if (!sb || !isSupabaseConfigured()) throw new Error("Sign in to import data");
  const { data: sessionData } = await sb.auth.getSession();
  let userId = sessionData.session?.user?.id ?? null;
  if (!userId) {
    const {
      data: { user },
    } = await sb.auth.getUser();
    userId = user?.id ?? null;
  }
  if (!userId) throw new Error("Sign in to import data");
  const { data: profile } = await sb
    .from("profiles")
    .select("tenant_id, active_shop_id")
    .eq("id", userId)
    .maybeSingle();
  if (!profile?.tenant_id) throw new Error("Complete onboarding first");
  return {
    tenantId: profile.tenant_id as string,
    userId,
    shopId: (profile.active_shop_id as string | null) ?? null,
  };
}

function parseTaxClass(raw: string): TaxClass {
  const v = raw.trim().toUpperCase().replace(/\s+/g, "_");
  if (v === "ZERO_RATED" || v === "B" || v === "RATE_B" || v === "0") return "ZERO_RATED";
  if (v === "EXEMPT" || v === "C" || v === "RATE_C") return "EXEMPT";
  return "STANDARD_16";
}

function parseChannel(raw: string): "CASH" | "CREDIT" | "MPESA" {
  const v = raw.trim().toUpperCase();
  if (v.includes("CREDIT")) return "CREDIT";
  if (v.includes("MPESA") || v.includes("M-PESA") || v.includes("TILL") || v.includes("PAYBILL")) {
    return "MPESA";
  }
  return "CASH";
}

function parseSaleDate(raw: string): Date | null {
  const t = raw.trim();
  if (!t) return null;
  // Prefer YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) {
    const d = new Date(t.includes("T") ? t : `${t}T12:00:00+03:00`);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  // DD/MM/YYYY common in KE books
  const m = t.match(/^(\d{1,2})[\/.](\d{1,2})[\/.](\d{4})$/);
  if (m) {
    const d = new Date(
      `${m[3]}-${m[2]!.padStart(2, "0")}-${m[1]!.padStart(2, "0")}T12:00:00+03:00`,
    );
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(t);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function previewBackfill(kind: ImportKind, text: string): ImportPreview {
  const table = parseCsv(text);
  if (table.length < 2) {
    return {
      kind,
      totalRows: 0,
      ready: 0,
      errors: [{ row: 1, message: "File needs a header row and at least one data row" }],
      sample: [],
    };
  }
  const map = csvHeaderMap(table[0]!);
  const errors: ImportRowError[] = [];
  const sample: Record<string, string>[] = [];
  let ready = 0;

  for (let i = 1; i < table.length; i++) {
    const row = table[i]!;
    const rowNum = i + 1;
    if (row.every((c) => !c.trim())) continue;

    if (kind === "products") {
      const name = cellAt(row, map, "name", "product", "product_name", "item");
      const price = numCell(cellAt(row, map, "price", "selling_price", "unit_price"));
      if (!name) {
        errors.push({ row: rowNum, message: "Missing product name" });
        continue;
      }
      if (price < 0) {
        errors.push({ row: rowNum, message: "Price cannot be negative" });
        continue;
      }
      ready++;
      if (sample.length < 5) {
        sample.push({
          name,
          sku: cellAt(row, map, "sku", "code"),
          price: String(price),
          stock: cellAt(row, map, "stock", "stock_qty", "qty") || "0",
        });
      }
    } else if (kind === "customers") {
      const name = cellAt(row, map, "name", "customer", "customer_name");
      if (!name || name.length < 2) {
        errors.push({ row: rowNum, message: "Customer name required (2+ characters)" });
        continue;
      }
      const bal = numCell(cellAt(row, map, "opening_balance", "balance", "debt", "credit"));
      if (bal < 0) {
        errors.push({ row: rowNum, message: "Opening balance cannot be negative" });
        continue;
      }
      ready++;
      if (sample.length < 5) {
        sample.push({
          name,
          phone: cellAt(row, map, "phone", "mobile", "msisdn"),
          opening_balance: String(bal),
        });
      }
    } else {
      const date = parseSaleDate(cellAt(row, map, "date", "sold_at", "sale_date", "created_at"));
      const product = cellAt(row, map, "product_sku_or_name", "product", "sku", "item", "name");
      const qty = numCell(cellAt(row, map, "qty", "quantity"), 0);
      if (!date) {
        errors.push({ row: rowNum, message: "Invalid or missing date (use YYYY-MM-DD)" });
        continue;
      }
      if (!product) {
        errors.push({ row: rowNum, message: "Missing product sku or name" });
        continue;
      }
      if (qty <= 0) {
        errors.push({ row: rowNum, message: "Qty must be greater than 0" });
        continue;
      }
      ready++;
      if (sample.length < 5) {
        sample.push({
          date: date.toISOString().slice(0, 10),
          product,
          qty: String(qty),
          channel: cellAt(row, map, "channel", "payment") || "CASH",
        });
      }
    }
  }

  return {
    kind,
    totalRows: Math.max(0, table.length - 1),
    ready,
    errors: errors.slice(0, 40),
    sample,
  };
}

export async function runProductImport(text: string): Promise<ImportResult> {
  const table = parseCsv(text);
  const map = csvHeaderMap(table[0] ?? []);
  const errors: ImportRowError[] = [];
  let imported = 0;
  let skipped = 0;

  for (let i = 1; i < table.length; i++) {
    const row = table[i]!;
    const rowNum = i + 1;
    if (row.every((c) => !c.trim())) {
      skipped++;
      continue;
    }
    const name = cellAt(row, map, "name", "product", "product_name", "item");
    const price = numCell(cellAt(row, map, "price", "selling_price", "unit_price"));
    if (!name) {
      errors.push({ row: rowNum, message: "Missing product name" });
      skipped++;
      continue;
    }
    try {
      const sku = cellAt(row, map, "sku", "code") || "";
      const barcode = cellAt(row, map, "barcode") || null;
      const cost = numCell(cellAt(row, map, "cost", "cost_price"));
      const stock = numCell(cellAt(row, map, "stock", "stock_qty", "qty"));
      const reorder = numCell(cellAt(row, map, "reorder_level", "reorder", "low_stock"), 5);
      const taxClass = parseTaxClass(cellAt(row, map, "tax_class", "tax", "vat_class"));
      const classificationCode = cellAt(row, map, "classification_code", "item_code") || undefined;
      const department = cellAt(row, map, "department", "category") || "General";
      await saveProduct({
        name,
        sku,
        barcode,
        cost,
        price,
        stock,
        reorderLevel: reorder,
        taxClass,
        ...(classificationCode ? { classificationCode } : {}),
        attrs: { department },
      });
      imported++;
    } catch (err) {
      errors.push({
        row: rowNum,
        message: err instanceof Error ? err.message : "Could not import product",
      });
      skipped++;
    }
  }

  return { kind: "products", imported, skipped, errors: errors.slice(0, 50) };
}

export async function runCustomerImport(text: string): Promise<ImportResult> {
  const sb = getSupabase();
  if (!sb) throw new Error("Sign in to import data");
  const ctx = await resolveTenantContext();
  const table = parseCsv(text);
  const map = csvHeaderMap(table[0] ?? []);
  const errors: ImportRowError[] = [];
  let imported = 0;
  let skipped = 0;

  for (let i = 1; i < table.length; i++) {
    const row = table[i]!;
    const rowNum = i + 1;
    if (row.every((c) => !c.trim())) {
      skipped++;
      continue;
    }
    const name = cellAt(row, map, "name", "customer", "customer_name");
    if (!name || name.length < 2) {
      errors.push({ row: rowNum, message: "Customer name required" });
      skipped++;
      continue;
    }
    try {
      let phone: string | undefined;
      const rawPhone = cellAt(row, map, "phone", "mobile", "msisdn");
      if (rawPhone) {
        try {
          phone = to254(rawPhone);
        } catch {
          phone = rawPhone.replace(/\D/g, "") || undefined;
        }
      }
      const email = cellAt(row, map, "email") || undefined;
      const notes = cellAt(row, map, "notes", "note") || undefined;
      const opening = numCell(cellAt(row, map, "opening_balance", "balance", "debt", "credit"));
      const dueDays = Math.max(1, Math.round(numCell(cellAt(row, map, "due_days", "due"), 14)));

      const saved = await saveCustomer({ name, phone, email, notes });
      if (opening > 0) {
        const due = new Date();
        due.setDate(due.getDate() + dueDays);
        const { error } = await sb.from("credit_entries").insert({
          tenant_id: ctx.tenantId,
          customer_id: saved.id,
          entry_type: "CHARGE",
          amount: opening,
          due_at: due.toISOString(),
          created_by: ctx.userId,
          note: "Opening balance (imported before InuaBiz)",
        });
        if (error) throw new Error(error.message);
      }
      imported++;
    } catch (err) {
      errors.push({
        row: rowNum,
        message: err instanceof Error ? err.message : "Could not import customer",
      });
      skipped++;
    }
  }

  return { kind: "customers", imported, skipped, errors: errors.slice(0, 50) };
}

type ProductHit = {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  selling_price: number;
  tax_class: TaxClass;
  classification_code: string | null;
};

export async function runSalesImport(text: string): Promise<ImportResult> {
  const sb = getSupabase();
  if (!sb) throw new Error("Sign in to import data");
  const ctx = await resolveTenantContext();
  const table = parseCsv(text);
  const map = csvHeaderMap(table[0] ?? []);
  const errors: ImportRowError[] = [];
  let imported = 0;
  let skipped = 0;

  const { data: products, error: pErr } = await sb
    .from("products")
    .select("id, name, sku, barcode, selling_price, tax_class, classification_code")
    .eq("tenant_id", ctx.tenantId)
    .eq("is_active", true);
  if (pErr) throw new Error(pErr.message);
  const list = (products ?? []) as ProductHit[];

  const findProduct = (key: string): ProductHit | null => {
    const k = key.trim().toLowerCase();
    if (!k) return null;
    return (
      list.find((p) => (p.sku ?? "").toLowerCase() === k) ||
      list.find((p) => (p.barcode ?? "").toLowerCase() === k) ||
      list.find((p) => p.name.toLowerCase() === k) ||
      list.find((p) => p.name.toLowerCase().includes(k)) ||
      null
    );
  };

  // Group multi-line tickets by date+customer+channel into one sale when consecutive? 
  // v1: one CSV row = one single-item sale (simpler for till books).
  for (let i = 1; i < table.length; i++) {
    const row = table[i]!;
    const rowNum = i + 1;
    if (row.every((c) => !c.trim())) {
      skipped++;
      continue;
    }

    const when = parseSaleDate(cellAt(row, map, "date", "sold_at", "sale_date", "created_at"));
    const productKey = cellAt(row, map, "product_sku_or_name", "product", "sku", "item", "name");
    const qty = numCell(cellAt(row, map, "qty", "quantity"), 0);
    const unitPriceRaw = cellAt(row, map, "unit_price", "price");
    const channel = parseChannel(cellAt(row, map, "channel", "payment", "payment_channel"));
    const customerName = cellAt(row, map, "customer_name", "customer", "buyer");
    const customerPhoneRaw = cellAt(row, map, "customer_phone", "phone");
    const notes = cellAt(row, map, "notes", "note") || "Imported pre-InuaBiz sale";

    if (!when || !productKey || qty <= 0) {
      errors.push({ row: rowNum, message: "Need date, product, and qty > 0" });
      skipped++;
      continue;
    }

    const product = findProduct(productKey);
    if (!product) {
      errors.push({
        row: rowNum,
        message: `No product match for "${productKey}" — import products first`,
      });
      skipped++;
      continue;
    }

    const unitPrice = unitPriceRaw ? numCell(unitPriceRaw) : Number(product.selling_price);
    const lineTotal = Math.round(unitPrice * qty * 100) / 100;
    const status = channel === "CREDIT" ? "CREDIT" : "PAID";
    const iso = when.toISOString();

    try {
      let customerId: string | null = null;
      let customerPhone: string | null = null;
      if (customerPhoneRaw) {
        try {
          customerPhone = to254(customerPhoneRaw);
        } catch {
          customerPhone = customerPhoneRaw.replace(/\D/g, "") || null;
        }
      }
      if (customerPhone || customerName) {
        if (customerPhone) {
          const { data: existing } = await sb
            .from("customers")
            .select("id")
            .eq("tenant_id", ctx.tenantId)
            .eq("phone", customerPhone)
            .maybeSingle();
          if (existing) customerId = existing.id as string;
        }
        if (!customerId && (customerName || customerPhone)) {
          const saved = await saveCustomer({
            name: customerName || "Imported customer",
            ...(customerPhone ? { phone: customerPhone } : {}),
          });
          customerId = saved.id;
        }
      }

      const { data: sale, error: sErr } = await sb
        .from("sales")
        .insert({
          tenant_id: ctx.tenantId,
          shop_id: ctx.shopId,
          status,
          payment_channel: channel,
          subtotal: lineTotal,
          discount_amount: 0,
          total: lineTotal,
          customer_id: customerId,
          customer_phone: customerPhone,
          notes,
          created_by: ctx.userId,
          created_at: iso,
          paid_at: status === "PAID" ? iso : null,
        })
        .select("id")
        .single();
      if (sErr || !sale) throw new Error(sErr?.message ?? "Sale insert failed");

      const { error: iErr } = await sb.from("sale_items").insert({
        tenant_id: ctx.tenantId,
        sale_id: sale.id,
        product_id: product.id,
        product_name: product.name,
        qty,
        unit_price: unitPrice,
        cost_price: 0,
        line_total: lineTotal,
        tax_class: product.tax_class ?? "STANDARD_16",
        classification_code: product.classification_code,
      });
      if (iErr) throw new Error(iErr.message);

      if (status === "CREDIT" && customerId) {
        await sb.from("credit_entries").insert({
          tenant_id: ctx.tenantId,
          customer_id: customerId,
          sale_id: sale.id,
          entry_type: "CHARGE",
          amount: lineTotal,
          created_by: ctx.userId,
          note: "Imported pre-InuaBiz credit sale",
        });
      }

      imported++;
    } catch (err) {
      errors.push({
        row: rowNum,
        message: err instanceof Error ? err.message : "Could not import sale",
      });
      skipped++;
    }
  }

  return { kind: "sales", imported, skipped, errors: errors.slice(0, 50) };
}

export async function runBackfillImport(kind: ImportKind, text: string): Promise<ImportResult> {
  if (kind === "products") return runProductImport(text);
  if (kind === "customers") return runCustomerImport(text);
  return runSalesImport(text);
}
