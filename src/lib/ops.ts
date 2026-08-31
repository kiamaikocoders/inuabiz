import { getSupabase, invokeFunction, isSupabaseConfigured } from "@/lib/supabase";
import { prettyKePhone } from "@/lib/phone";
import type { TaxClass } from "@/lib/tax";
import type { LastSale, ReceiptLine } from "@/lib/last-sale";
import type { NotificationItem } from "@/lib/mock-data";
import { parseCategory } from "@/lib/category";
import { getGhost } from "@/lib/ghost";
import { isBrowserOffline, probeOnline } from "@/lib/offline/connectivity";
import {
  cacheTenantAccess,
  cacheTenantHeader,
  readCachedTenantAccess,
  readCachedTenantHeader,
} from "@/lib/offline/db";
import {
  readNotifications,
  readShops,
  replaceNotifications,
  replaceShops,
} from "@/lib/offline/replica";

async function shouldUseCache(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (!isBrowserOffline()) return false;
  return !(await probeOnline());
}

export type ShopRow = {
  id: string;
  name: string;
  category: string;
  address_text: string | null;
  phone: string | null;
  is_default: boolean;
  location_lat: number | null;
  location_lng: number | null;
};

export type TenantHeader = {
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

export type StaffRow = {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: string;
  active_shop_id: string | null;
};

export async function fetchTenantAccess(): Promise<boolean> {
  const sb = getSupabase();
  if (!sb || (await shouldUseCache())) {
    return (await readCachedTenantAccess()) ?? true;
  }
  try {
    const { data, error } = await sb.rpc("tenant_has_access");
    if (error) return (await readCachedTenantAccess()) ?? true;
    const access = Boolean(data);
    await cacheTenantAccess(access);
    return access;
  } catch {
    return (await readCachedTenantAccess()) ?? true;
  }
}

export async function fetchShops(): Promise<ShopRow[]> {
  const sb = getSupabase();
  if (!sb || (await shouldUseCache())) return (await readShops()) as ShopRow[];
  try {
    const { data, error } = await sb
      .from("shops")
      .select("id, name, category, address_text, phone, is_default, location_lat, location_lng")
      .order("created_at");
    if (error || !data) return (await readShops()) as ShopRow[];
    const rows = data as ShopRow[];
    await replaceShops(rows);
    return rows;
  } catch {
    return (await readShops()) as ShopRow[];
  }
}

export async function setActiveShop(shopId: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.rpc("set_active_shop", { p_shop_id: shopId });
  if (error) throw new Error(error.message);
}

export async function createShop(input: {
  name: string;
  category: string;
  address_text?: string;
}): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { data: profile } = await sb.from("profiles").select("tenant_id").maybeSingle();
  if (!profile?.tenant_id) throw new Error("Complete onboarding first");
  const { error } = await sb.from("shops").insert({
    tenant_id: profile.tenant_id,
    name: input.name,
    category: parseCategory(input.category),
    address_text: input.address_text ?? null,
    is_default: false,
  });
  if (error) throw new Error(error.message);
}

export async function fetchTenantHeader(): Promise<TenantHeader | null> {
  const sb = getSupabase();
  if (!sb || (await shouldUseCache())) {
    return (await readCachedTenantHeader()) as TenantHeader | null;
  }
  try {
    const { data: profile } = await sb.from("profiles").select("tenant_id").maybeSingle();
    if (!profile?.tenant_id) {
      return (await readCachedTenantHeader()) as TenantHeader | null;
    }
    const { data } = await sb
      .from("tenants")
      .select(
        "id, name, legal_name, kra_pin, email, phone, address_text, category, vat_registered, logo_url, location_lat, location_lng, email_receipt_enabled",
      )
      .eq("id", profile.tenant_id)
      .maybeSingle();
    if (data) await cacheTenantHeader(data as TenantHeader);
    return ((data as TenantHeader | null) ??
      (await readCachedTenantHeader())) as TenantHeader | null;
  } catch {
    return (await readCachedTenantHeader()) as TenantHeader | null;
  }
}

export async function saveTenantHeader(patch: {
  name?: string;
  legal_name?: string;
  kra_pin?: string | null;
  email?: string | null;
  phone?: string;
  address_text?: string | null;
  category?: string;
  vat_registered?: boolean;
  logo_url?: string | null;
  location_lat?: number | null;
  location_lng?: number | null;
  email_receipt_enabled?: boolean;
}): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { data: profile } = await sb
    .from("profiles")
    .select("tenant_id, active_shop_id")
    .maybeSingle();
  if (!profile?.tenant_id) throw new Error("No tenant");
  const payload = { ...patch };
  if (payload.category) payload.category = parseCategory(payload.category);
  const { error } = await sb.from("tenants").update(payload).eq("id", profile.tenant_id);
  if (error) throw new Error(error.message);

  // Keep shop locations/address in sync with the business profile.
  const shopPatch: Record<string, unknown> = {};
  if (payload.address_text !== undefined) shopPatch["address_text"] = payload.address_text;
  if (payload.category) shopPatch["category"] = payload.category;
  if (payload.location_lat !== undefined) shopPatch["location_lat"] = payload.location_lat;
  if (payload.location_lng !== undefined) shopPatch["location_lng"] = payload.location_lng;
  if (Object.keys(shopPatch).length) {
    const { error: shopErr } = await sb
      .from("shops")
      .update(shopPatch)
      .eq("tenant_id", profile.tenant_id);
    if (shopErr) throw new Error(shopErr.message);
  }
}

export async function fetchStaff(): Promise<StaffRow[]> {
  const sb = getSupabase();
  if (!sb) return [];
  // Ghost is UI-only (auth stays SUPER_ADMIN). Scope to the ghosted shop,
  // otherwise the caller's own tenant — never list platform admins as staff.
  const ghostTenantId = getGhost()?.tenantId ?? null;
  let tenantId = ghostTenantId;
  if (!tenantId) {
    const { data: profile } = await sb.from("profiles").select("tenant_id").maybeSingle();
    tenantId = (profile?.tenant_id as string | null) ?? null;
  }
  if (!tenantId) return [];
  const { data, error } = await sb
    .from("profiles")
    .select("id, full_name, phone, role, active_shop_id")
    .eq("tenant_id", tenantId)
    .neq("role", "SUPER_ADMIN")
    .order("created_at");
  if (error || !data) return [];
  return data as StaffRow[];
}

export const EMAIL_RECEIPT_KEY = "inuabiz:email-receipt";

/** Shop-copy receipts stay off until Settings → Send email receipt is turned on. */
export function emailReceiptEnabled(header?: TenantHeader | null): boolean {
  if (header && typeof header.email_receipt_enabled === "boolean") {
    return header.email_receipt_enabled;
  }
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(EMAIL_RECEIPT_KEY) === "true";
}

export async function inviteStaff(
  shopId: string,
  phone: string,
  fullName: string,
  email?: string,
): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.rpc("invite_shop_staff", {
    p_shop_id: shopId,
    p_phone: phone,
    p_full_name: fullName,
  });
  if (error) throw new Error(error.message);
  const to = email?.trim().toLowerCase() ?? "";
  if (!to.includes("@")) return;
  const { data: profile } = await sb.from("profiles").select("tenant_id").maybeSingle();
  const { data: shop } = await sb.from("shops").select("name").eq("id", shopId).maybeSingle();
  const { error: mailErr } = await invokeFunction("dispatch-outbound", {
    template_id: "invite-staff",
    to,
    tenant_id: profile?.tenant_id,
    vars: {
      shop: (shop?.name as string | undefined) ?? "",
    },
  });
  if (mailErr) throw new Error(mailErr);
}

export async function fetchNotifications(): Promise<NotificationItem[]> {
  const sb = getSupabase();
  if (!sb || (await shouldUseCache())) return readNotifications();
  try {
    // Super-admin RLS can read every row. Ghost sessions must show the vendor
    // shop feed only — not "New vendor registered" / platform admin alerts.
    const ghostTenantId = getGhost()?.tenantId ?? null;
    let query = sb
      .from("notifications")
      .select("id, title, message, type, priority, is_read, created_at, tenant_id, metadata")
      .order("created_at", { ascending: false })
      .limit(ghostTenantId ? 80 : 250);
    if (ghostTenantId) {
      query = query.eq("tenant_id", ghostTenantId).neq("recipient_role", "SUPER_ADMIN");
    } else {
      const { data: sessionData } = await sb.auth.getSession();
      const userId = sessionData.session?.user?.id;
      if (!userId) return readNotifications();
      query = query.eq("recipient_id", userId);
    }
    const { data, error } = await query;
    if (error || !data) return readNotifications();
    const mapped = data.map((row) => {
      const meta = (row.metadata as Record<string, unknown> | null) ?? null;
      const metaTenant =
        meta && typeof meta["tenant_id"] === "string" ? (meta["tenant_id"] as string) : null;
      return {
        id: row.id as string,
        title: row.title as string,
        message: row.message as string,
        type: (String(row.type) === "PAYMENT"
          ? "SYSTEM"
          : String(row.type)) as NotificationItem["type"],
        priority: String(row.priority) as NotificationItem["priority"],
        read: Boolean(row.is_read),
        time: new Date(row.created_at as string).toLocaleTimeString("en-KE", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        createdAt: row.created_at as string,
        tenantId: (row.tenant_id as string | null) ?? metaTenant,
        metadata: meta,
      };
    });
    await replaceNotifications(mapped);
    return mapped;
  } catch {
    return readNotifications();
  }
}

export async function markNotificationRead(id: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  await sb.from("notifications").update({ is_read: true }).eq("id", id);
}

export async function markAllNotificationsRead(): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return;
  await sb.from("notifications").update({ is_read: true }).eq("recipient_id", user.id);
}

export type Prefs = {
  channel_in_app: boolean;
  channel_email: boolean;
  channel_sms: boolean;
  channel_whatsapp: boolean;
  channel_sound: boolean;
  channel_push: boolean;
};

export async function fetchNotificationPrefs(): Promise<Prefs | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb
    .from("notification_preferences")
    .select(
      "channel_in_app, channel_email, channel_sms, channel_whatsapp, channel_sound, channel_push",
    )
    .maybeSingle();
  if (error || !data) {
    const fallback = await sb
      .from("notification_preferences")
      .select("channel_in_app, channel_email, channel_sms, channel_whatsapp, channel_sound")
      .maybeSingle();
    if (!fallback.data) return null;
    return { ...(fallback.data as Omit<Prefs, "channel_push">), channel_push: true };
  }
  const row = data as Prefs;
  return { ...row, channel_push: row.channel_push !== false };
}

export async function saveNotificationPrefs(patch: Partial<Prefs>): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return;
  const { error } = await sb
    .from("notification_preferences")
    .upsert({ profile_id: user.id, ...patch, updated_at: new Date().toISOString() }, { onConflict: "profile_id" });
  if (error) throw new Error(error.message);
}

export type UnclaimedRow = {
  id: string;
  invoiceId: string;
  amount: number;
  account: string;
  apiRef: string;
  received: string;
  reason: string;
};

export async function fetchUnclaimedPayments(): Promise<UnclaimedRow[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from("unclaimed_payments")
    .select("id, invoice_id, amount, created_at, raw_webhook_payload, resolved_at")
    .is("resolved_at", null)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data.map((row) => {
    const raw = (row.raw_webhook_payload ?? {}) as Record<string, unknown>;
    return {
      id: row.id as string,
      invoiceId: row.invoice_id as string,
      amount: Number(row.amount),
      account: String(raw["account"] ?? raw["MSISDN"] ?? "—"),
      apiRef: String(raw["api_ref"] ?? raw["BillRefNumber"] ?? "—"),
      received: new Date(row.created_at as string).toLocaleString("en-KE"),
      reason: String(raw["reason"] ?? "Unmatched api_ref"),
    };
  });
}

export type PaymentEventRow = {
  id: string;
  event: string;
  tenant: string;
  time: string;
  attempts: number;
  status: string;
};

export async function fetchRecentPaymentEvents(): Promise<PaymentEventRow[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from("payment_transactions")
    .select("id, purpose, status, created_at, invoice_id, tenant_id")
    .order("created_at", { ascending: false })
    .limit(12);
  if (error || !data) return [];
  const openUnclaimed = new Set((await fetchUnclaimedPayments()).map((u) => u.invoiceId));
  const tenantIds = [
    ...new Set(
      data.map((row) => row.tenant_id as string | null).filter((id): id is string => Boolean(id)),
    ),
  ];
  const names = new Map<string, string>();
  if (tenantIds.length) {
    const { data: tenants } = await sb.from("tenants").select("id, name").in("id", tenantIds);
    for (const t of tenants ?? []) names.set(t.id as string, t.name as string);
  }
  return data.map((row) => {
    const unclaimed = openUnclaimed.has(String(row.invoice_id));
    const rawStatus = String(row.status);
    const status = unclaimed
      ? "Unclaimed"
      : rawStatus === "COMPLETE"
        ? "Delivered"
        : rawStatus === "FAILED" || rawStatus === "CANCELLED"
          ? "Failed"
          : "In progress";
    const tenantId = row.tenant_id as string | null;
    return {
      id: row.id as string,
      event: String(row.purpose).toLowerCase().replaceAll("_", "."),
      tenant: names.get(tenantId ?? "") ?? (unclaimed ? "Unmapped" : "—"),
      time: new Date(row.created_at as string).toLocaleTimeString("en-KE", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
      attempts: 1,
      status,
    };
  });
}

export async function assignUnclaimed(id: string, tenantId: string): Promise<void> {
  const { error } = await invokeFunction("assign-unclaimed-payment", {
    unclaimed_payment_id: id,
    tenant_id: tenantId,
  });
  if (error) throw new Error(error);
}

export type MrrSnapshot = {
  mrr_kes: number;
  active_tenants: number;
  trial_tenants: number;
  past_due_tenants: number;
  conversions_this_month: number;
};

export async function fetchMrrSnapshot(): Promise<MrrSnapshot | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb.from("admin_mrr_snapshot").select("*").maybeSingle();
  if (error || !data) return null;
  return {
    mrr_kes: Number(data.mrr_kes ?? 0),
    active_tenants: Number(data.active_tenants ?? 0),
    trial_tenants: Number(data.trial_tenants ?? 0),
    past_due_tenants: Number(data.past_due_tenants ?? 0),
    conversions_this_month: Number(data.conversions_this_month ?? 0),
  };
}

export type AuditInvoice = {
  id: string;
  invoice_number: string;
  created_at: string;
  customer_name: string;
  vat_16_amount: number;
  vat_0_amount: number;
  exempt_amount: number;
  total_amount: number;
  payment_method: string;
  mpesa_receipt_code: string | null;
  kra_pin: string | null;
};

export async function fetchAuditInvoices(
  fromIso?: string,
  toIso?: string,
): Promise<AuditInvoice[]> {
  const sb = getSupabase();
  if (!sb) return [];
  let q = sb
    .from("invoices")
    .select(
      "id, invoice_number, created_at, customer_name, vat_16_amount, vat_0_amount, exempt_amount, total_amount, payment_method, mpesa_receipt_code",
    )
    .order("created_at", { ascending: false })
    .limit(500);
  if (fromIso) q = q.gte("created_at", fromIso);
  if (toIso) q = q.lte("created_at", toIso);
  const { data, error } = await q;
  if (error || !data) return [];
  const header = await fetchTenantHeader();
  return data.map((row) => ({
    ...(row as Omit<AuditInvoice, "kra_pin">),
    kra_pin: header?.kra_pin ?? null,
  }));
}

export async function fetchSaleReceipt(saleId: string): Promise<LastSale | null> {
  const sb = getSupabase();
  if (!sb || !isSupabaseConfigured()) return null;
  const { data: sale, error } = await sb
    .from("sales")
    .select(
      "id, total, status, payment_channel, customer_phone, created_at, shop_id, discount_amount, mpesa_receipt_code, mpesa_payer_name",
    )
    .eq("id", saleId)
    .maybeSingle();
  if (error || !sale) return null;

  const { data: items } = await sb
    .from("sale_items")
    .select("product_name, qty, unit_price, tax_class, product_id")
    .eq("sale_id", saleId);

  const productIds = [
    ...new Set((items ?? []).map((i) => i.product_id as string | null).filter(Boolean)),
  ] as string[];
  const imageByProduct = new Map<string, string>();
  if (productIds.length) {
    const { data: productRows } = await sb
      .from("products")
      .select("id, image_url")
      .in("id", productIds);
    for (const row of productRows ?? []) {
      if (row.image_url) imageByProduct.set(row.id as string, row.image_url as string);
    }
  }

  const { data: invoice } = await sb
    .from("invoices")
    .select(
      "invoice_number, vat_16_amount, vat_0_amount, exempt_amount, subtotal, total_amount, mpesa_receipt_code, customer_name",
    )
    .eq("sale_id", saleId)
    .maybeSingle();

  const header = await fetchTenantHeader();
  let shopName = header?.legal_name || header?.name || "Shop";
  let location = header?.address_text || "";
  if (sale.shop_id) {
    const { data: shop } = await sb
      .from("shops")
      .select("name, address_text")
      .eq("id", sale.shop_id)
      .maybeSingle();
    if (shop?.name) shopName = shop.name as string;
    if (shop?.address_text) location = shop.address_text as string;
  }

  const lines: ReceiptLine[] = (items ?? []).map((i) => ({
    name: i.product_name as string,
    qty: Number(i.qty),
    price: Number(i.unit_price),
    taxClass: (i.tax_class as TaxClass) ?? "STANDARD_16",
    imageUrl: imageByProduct.get(i.product_id as string) ?? null,
  }));

  const created = new Date(sale.created_at as string);
  const phone = (sale.customer_phone as string | null) ?? null;
  const payerName = ((sale.mpesa_payer_name as string | null) ?? "").trim();
  const receipt: LastSale = {
    id: sale.id as string,
    ref: (invoice?.invoice_number as string | undefined) ?? `SL-${String(sale.id).slice(0, 8)}`,
    total: Number(invoice?.total_amount ?? sale.total),
    items: lines.length,
    channel: String(sale.payment_channel ?? "CASH"),
    customer:
      payerName ||
      (invoice?.customer_name as string) ||
      prettyKePhone((sale.customer_phone as string) ?? "") ||
      "Walk-in",
    shop: shopName,
    location,
    when: created.toLocaleString("en-KE"),
    footer: "Provisional Tax Document — Audit-Ready Record Generated via InuaBiz System.",
    lines,
  };
  if (phone) receipt.phone = phone;
  if (payerName) receipt.mpesaPayerName = payerName;
  const legal = header?.legal_name ?? header?.name;
  if (legal) receipt.legalName = legal;
  if (header?.kra_pin) receipt.kraPin = header.kra_pin;
  if (header?.email) receipt.email = header.email;
  if (header?.phone) receipt.merchantPhone = header.phone;
  if (header?.logo_url) receipt.logoUrl = header.logo_url;
  const saleCode = (sale.mpesa_receipt_code as string | null) ?? null;
  if (saleCode) receipt.mpesaReceipt = saleCode;
  else if (invoice?.mpesa_receipt_code) receipt.mpesaReceipt = invoice.mpesa_receipt_code as string;
  const saleStatus = String(sale.status);
  receipt.status =
    saleStatus === "PAID"
      ? "Complete"
      : saleStatus === "FAILED" || saleStatus === "VOID" || saleStatus === "CANCELLED"
        ? "Failed"
        : "Pending";
  if (invoice) {
    receipt.vat16 = Number(invoice.vat_16_amount);
    receipt.vat0 = Number(invoice.vat_0_amount);
    receipt.exempt = Number(invoice.exempt_amount);
    receipt.subtotalExVat = Number(invoice.subtotal);
  }
  return receipt;
}

let lastChimeAt = 0;
let chimeAudio: HTMLAudioElement | null = null;

function unlockChime(): void {
  if (typeof window === "undefined") return;
  if (!chimeAudio) {
    chimeAudio = new Audio("/sounds/till-chime.mp3");
    chimeAudio.preload = "auto";
  }
  const play = () => {
    void chimeAudio
      ?.play()
      .then(() => {
        chimeAudio?.pause();
        if (chimeAudio) chimeAudio.currentTime = 0;
      })
      .catch(() => undefined);
    window.removeEventListener("pointerdown", play);
  };
  window.addEventListener("pointerdown", play, { once: true });
}

if (typeof window !== "undefined") unlockChime();

export function playPosChime(): void {
  if (typeof window === "undefined") return;
  const now = Date.now();
  if (now - lastChimeAt < 1200) return;
  lastChimeAt = now;
  try {
    if (!chimeAudio) {
      chimeAudio = new Audio("/sounds/till-chime.mp3");
      chimeAudio.preload = "auto";
    }
    chimeAudio.currentTime = 0;
    const played = chimeAudio.play();
    if (played) void played.catch(() => playOscillatorFallback());
  } catch {
    playOscillatorFallback();
  }
}

function playOscillatorFallback(): void {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 1318;
    gain.gain.value = 0.08;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.frequency.setValueAtTime(1760, ctx.currentTime + 0.09);
    osc.stop(ctx.currentTime + 0.22);
  } catch {
    /* ignore */
  }
}

export function downloadCsv(filename: string, rows: string[][]): void {
  const csv = rows
    .map((r) => r.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export type FloorTable = {
  id: string;
  label: string;
  seats: number;
  status: "FREE" | "SEATED" | "BILLING";
};

export type ShopTicket = {
  id: string;
  kind: "KITCHEN" | "SERVICE";
  status: "NEW" | "PREP" | "READY" | "SERVED" | "DONE";
  title: string;
  items: { name: string; qty: number }[];
  duration_minutes: number | null;
  table_label: string | null;
  created_at: string;
};

async function activeShopContext(): Promise<{ tenantId: string; shopId: string } | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data: profile } = await sb
    .from("profiles")
    .select("tenant_id, active_shop_id")
    .maybeSingle();
  if (!profile?.tenant_id || !profile.active_shop_id) return null;
  return { tenantId: profile.tenant_id as string, shopId: profile.active_shop_id as string };
}

export async function fetchFloorTables(): Promise<FloorTable[]> {
  const sb = getSupabase();
  const ctx = await activeShopContext();
  if (!sb || !ctx) return [];
  const { data, error } = await sb
    .from("shop_floor_tables")
    .select("id, label, seats, status")
    .eq("shop_id", ctx.shopId)
    .order("label");
  if (error || !data) return [];
  return data.map((row) => ({
    id: row.id as string,
    label: row.label as string,
    seats: Number(row.seats),
    status: row.status as FloorTable["status"],
  }));
}

export async function addFloorTable(seats = 4): Promise<FloorTable | null> {
  const sb = getSupabase();
  const ctx = await activeShopContext();
  if (!sb || !ctx) return null;
  const existing = await fetchFloorTables();
  const next = existing.length + 1;
  const { data, error } = await sb
    .from("shop_floor_tables")
    .insert({
      tenant_id: ctx.tenantId,
      shop_id: ctx.shopId,
      label: `T${next}`,
      seats,
      status: "FREE",
    })
    .select("id, label, seats, status")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Could not add table");
  return {
    id: data.id as string,
    label: data.label as string,
    seats: Number(data.seats),
    status: data.status as FloorTable["status"],
  };
}

export async function setFloorTableStatus(
  tableId: string,
  status: FloorTable["status"],
): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.from("shop_floor_tables").update({ status }).eq("id", tableId);
  if (error) throw new Error(error.message);
}

export async function fetchShopTickets(kind?: "KITCHEN" | "SERVICE"): Promise<ShopTicket[]> {
  const sb = getSupabase();
  const ctx = await activeShopContext();
  if (!sb || !ctx) return [];
  let q = sb
    .from("shop_tickets")
    .select("id, kind, status, title, items, duration_minutes, created_at, table_id")
    .eq("shop_id", ctx.shopId)
    .order("created_at", { ascending: false })
    .limit(40);
  if (kind) q = q.eq("kind", kind);
  const { data, error } = await q;
  if (error || !data) return [];
  const { data: tables } = await sb
    .from("shop_floor_tables")
    .select("id, label")
    .eq("shop_id", ctx.shopId);
  const labels = new Map((tables ?? []).map((t) => [t.id as string, t.label as string]));
  return data.map((row) => ({
    id: row.id as string,
    kind: row.kind as ShopTicket["kind"],
    status: row.status as ShopTicket["status"],
    title: row.title as string,
    items: Array.isArray(row.items) ? (row.items as ShopTicket["items"]) : [],
    duration_minutes: row.duration_minutes == null ? null : Number(row.duration_minutes),
    table_label: row.table_id ? (labels.get(row.table_id as string) ?? null) : null,
    created_at: row.created_at as string,
  }));
}

export async function createShopTicket(input: {
  kind: "KITCHEN" | "SERVICE";
  title: string;
  items: { name: string; qty: number }[];
  tableId?: string | null;
  saleId?: string | null;
  durationMinutes?: number | null;
}): Promise<void> {
  const sb = getSupabase();
  const ctx = await activeShopContext();
  if (!sb || !ctx) return;
  const { error } = await sb.from("shop_tickets").insert({
    tenant_id: ctx.tenantId,
    shop_id: ctx.shopId,
    sale_id: input.saleId ?? null,
    table_id: input.tableId ?? null,
    kind: input.kind,
    title: input.title,
    items: input.items,
    duration_minutes: input.durationMinutes ?? null,
  });
  if (error) throw new Error(error.message);
  if (input.tableId) {
    await setFloorTableStatus(input.tableId, "SEATED");
  }
}

export async function setShopTicketStatus(id: string, status: ShopTicket["status"]): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.from("shop_tickets").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
}
