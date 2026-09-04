import { getSupabase, invokeFunction, isSupabaseConfigured } from "@/lib/supabase";

/** Currencies offered as foreign cash tenders (CBK via Frankfurter). USD is primary. */
export const CBK_CURRENCIES: ReadonlyArray<{ code: string; name: string }> = [
  { code: "USD", name: "US Dollar" },
  { code: "EUR", name: "Euro" },
  { code: "GBP", name: "British Pound" },
  { code: "AUD", name: "Australian Dollar" },
  { code: "AED", name: "UAE Dirham" },
  { code: "CAD", name: "Canadian Dollar" },
  { code: "CHF", name: "Swiss Franc" },
  { code: "CNY", name: "Chinese Yuan" },
  { code: "JPY", name: "Japanese Yen" },
  { code: "UGX", name: "Ugandan Shilling" },
  { code: "ZAR", name: "South African Rand" },
  { code: "TZS", name: "Tanzanian Shilling" },
];

export const CBK_CURRENCY_CODES = CBK_CURRENCIES.map((c) => c.code);

export function cbkCurrencyName(code: string): string {
  return CBK_CURRENCIES.find((c) => c.code === code.toUpperCase())?.name ?? code.toUpperCase();
}

export type FxQuote = {
  currency: string;
  rate: number;
  date: string | null;
  source: "cbk" | "none";
  fetchedAt: string | null;
  name?: string;
};

export type CurrencyRequestRow = {
  id: string;
  tenantId: string;
  tenantName?: string;
  currency: string;
  message: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  reviewedAt?: string | null;
  adminNote?: string | null;
};

function round6(n: number) {
  return Math.round(n * 1_000_000) / 1_000_000;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function foreignToKes(amount: number, rate: number): number {
  return round2(amount * rate);
}

export function kesToForeign(kes: number, rate: number): number {
  if (rate <= 0) return 0;
  return round2(kes / rate);
}

/** Suggest foreign amount to cover a KES total (rounds up to the cent). */
export function suggestForeignForKes(kes: number, rate: number): number {
  if (rate <= 0) return 0;
  return Math.ceil((kes / rate) * 100) / 100;
}

/** @deprecated use foreignToKes */
export const usdToKes = foreignToKes;
/** @deprecated use kesToForeign */
export const kesToUsd = kesToForeign;
/** @deprecated use suggestForeignForKes */
export const suggestUsdForKes = suggestForeignForKes;

export async function fetchFxQuote(currency = "USD"): Promise<FxQuote> {
  const code = currency.toUpperCase();
  const empty: FxQuote = { currency: code, rate: 0, date: null, source: "none", fetchedAt: null };
  const sb = getSupabase();
  if (!sb || !isSupabaseConfigured()) return empty;

  const { data } = await sb
    .from("fx_rates")
    .select("currency, kes_per_unit, rate_date, fetched_at, name")
    .eq("currency", code)
    .maybeSingle();
  const rate = Number(data?.kes_per_unit ?? 0);
  if (rate > 0) {
    return {
      currency: code,
      rate: round6(rate),
      date: (data?.rate_date as string | null) ?? null,
      source: "cbk",
      fetchedAt: (data?.fetched_at as string | null) ?? null,
      name: (data?.name as string | undefined) ?? undefined,
    };
  }

  // Legacy fallback for USD before fx_rates backfill.
  if (code === "USD") {
    const { data: rows } = await sb
      .from("platform_settings")
      .select("key, value")
      .in("key", ["fx.usd_kes", "fx.usd_kes_date", "fx.usd_kes_fetched_at"]);
    const map = new Map<string, unknown>();
    for (const row of rows ?? []) map.set(String(row.key), row.value);
    const legacy = Number(map.get("fx.usd_kes") ?? 0);
    if (!(legacy > 0)) return empty;
    const asText = (v: unknown) => {
      if (typeof v === "string") return v.replace(/^"|"$/g, "") || null;
      if (v == null) return null;
      return String(v).replace(/^"|"$/g, "") || null;
    };
    return {
      currency: "USD",
      rate: round6(legacy),
      date: asText(map.get("fx.usd_kes_date")),
      source: "cbk",
      fetchedAt: asText(map.get("fx.usd_kes_fetched_at")),
      name: "US Dollar",
    };
  }
  return empty;
}

export async function fetchAllFxRates(): Promise<FxQuote[]> {
  const sb = getSupabase();
  if (!sb || !isSupabaseConfigured()) return [];
  const { data, error } = await sb
    .from("fx_rates")
    .select("currency, kes_per_unit, rate_date, fetched_at, name")
    .order("currency");
  if (error) throw new Error(error.message);
  return (data ?? [])
    .map((row) => ({
      currency: String(row.currency),
      rate: round6(Number(row.kes_per_unit ?? 0)),
      date: (row.rate_date as string | null) ?? null,
      source: "cbk" as const,
      fetchedAt: (row.fetched_at as string | null) ?? null,
      name: (row.name as string | undefined) ?? undefined,
    }))
    .filter((r) => r.rate > 0);
}

export async function fetchEnabledCurrencies(): Promise<string[]> {
  const sb = getSupabase();
  if (!sb || !isSupabaseConfigured()) return ["USD"];
  const { data: sessionData } = await sb.auth.getSession();
  const userId = sessionData.session?.user?.id;
  if (!userId) return ["USD"];
  const { data: profile } = await sb
    .from("profiles")
    .select("tenant_id")
    .eq("id", userId)
    .maybeSingle();
  if (!profile?.tenant_id) return ["USD"];
  const { data } = await sb
    .from("tenant_currencies")
    .select("currency")
    .eq("tenant_id", profile.tenant_id)
    .eq("enabled", true);
  const codes = (data ?? []).map((r) => String(r.currency).toUpperCase());
  if (!codes.includes("USD")) codes.unshift("USD");
  return codes.sort((a, b) => (a === "USD" ? -1 : b === "USD" ? 1 : a.localeCompare(b)));
}

export async function refreshFxFromCbk(): Promise<{
  date: string | null;
  currencies: number;
  rates: Record<string, number>;
}> {
  const { data, error } = await invokeFunction<{
    ok?: boolean;
    date?: string;
    currencies?: number;
    rates?: Record<string, number>;
    error?: string;
  }>("refresh-fx-rates", {});
  if (error || !data?.ok) {
    throw new Error(error ?? data?.error ?? "Could not refresh CBK rates");
  }
  return {
    date: data.date ?? null,
    currencies: data.currencies ?? 0,
    rates: data.rates ?? {},
  };
}

export async function requestCurrencyAccess(input: {
  currency: string;
  message: string;
}): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error("Sign in to request a currency");
  const code = input.currency.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(code) || code === "KES" || code === "USD") {
    throw new Error("Pick a 3-letter currency code other than KES or USD");
  }
  const message = input.message.trim();
  if (message.length < 8) throw new Error("Tell admin why you need this currency (a short note)");

  const { data: sessionData } = await sb.auth.getSession();
  const userId = sessionData.session?.user?.id;
  if (!userId) throw new Error("Sign in to request a currency");
  const { data: profile } = await sb
    .from("profiles")
    .select("tenant_id")
    .eq("id", userId)
    .maybeSingle();
  if (!profile?.tenant_id) throw new Error("Complete onboarding first");

  const { error } = await sb.from("currency_requests").insert({
    tenant_id: profile.tenant_id,
    currency: code,
    message,
    status: "pending",
    created_by: userId,
  });
  if (error) {
    if (error.code === "23505") {
      throw new Error(`You already have a pending request for ${code}`);
    }
    throw new Error(error.message);
  }
}

export async function fetchMyCurrencyRequests(): Promise<CurrencyRequestRow[]> {
  const sb = getSupabase();
  if (!sb || !isSupabaseConfigured()) return [];
  const { data, error } = await sb
    .from("currency_requests")
    .select("id, tenant_id, currency, message, status, created_at, reviewed_at, admin_note")
    .order("created_at", { ascending: false })
    .limit(40);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    id: String(row.id),
    tenantId: String(row.tenant_id),
    currency: String(row.currency),
    message: String(row.message ?? ""),
    status: row.status as CurrencyRequestRow["status"],
    createdAt: String(row.created_at),
    reviewedAt: (row.reviewed_at as string | null) ?? null,
    adminNote: (row.admin_note as string | null) ?? null,
  }));
}

export async function fetchAdminCurrencyRequests(): Promise<CurrencyRequestRow[]> {
  const sb = getSupabase();
  if (!sb) throw new Error("Sign in as admin");
  const { data, error } = await sb
    .from("currency_requests")
    .select(
      "id, tenant_id, currency, message, status, created_at, reviewed_at, admin_note, tenants(name)",
    )
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => {
    const tenants = row.tenants as { name?: string } | { name?: string }[] | null;
    const tenantName = Array.isArray(tenants) ? tenants[0]?.name : tenants?.name;
    return {
      id: String(row.id),
      tenantId: String(row.tenant_id),
      tenantName: tenantName ?? undefined,
      currency: String(row.currency),
      message: String(row.message ?? ""),
      status: row.status as CurrencyRequestRow["status"],
      createdAt: String(row.created_at),
      reviewedAt: (row.reviewed_at as string | null) ?? null,
      adminNote: (row.admin_note as string | null) ?? null,
    };
  });
}

export async function reviewCurrencyRequest(input: {
  id: string;
  status: "approved" | "rejected";
  adminNote?: string;
}): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error("Sign in as admin");
  const { data: sessionData } = await sb.auth.getSession();
  const userId = sessionData.session?.user?.id;
  if (!userId) throw new Error("Sign in as admin");

  const { data: req, error: rErr } = await sb
    .from("currency_requests")
    .select("id, tenant_id, currency, status")
    .eq("id", input.id)
    .maybeSingle();
  if (rErr) throw new Error(rErr.message);
  if (!req) throw new Error("Request not found");
  if (req.status !== "pending") throw new Error("Request already reviewed");

  const now = new Date().toISOString();
  const { error: uErr } = await sb
    .from("currency_requests")
    .update({
      status: input.status,
      reviewed_by: userId,
      reviewed_at: now,
      admin_note: input.adminNote?.trim() || null,
    })
    .eq("id", input.id);
  if (uErr) throw new Error(uErr.message);

  if (input.status === "approved") {
    const { error: eErr } = await sb.from("tenant_currencies").upsert(
      {
        tenant_id: req.tenant_id,
        currency: req.currency,
        enabled: true,
        enabled_at: now,
        enabled_by: userId,
      },
      { onConflict: "tenant_id,currency" },
    );
    if (eErr) throw new Error(eErr.message);
  }
}

export async function adminEnableCurrency(input: {
  tenantId: string;
  currency: string;
}): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error("Sign in as admin");
  const { data: sessionData } = await sb.auth.getSession();
  const userId = sessionData.session?.user?.id;
  const code = input.currency.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(code) || code === "KES") throw new Error("Invalid currency");
  const { error } = await sb.from("tenant_currencies").upsert(
    {
      tenant_id: input.tenantId,
      currency: code,
      enabled: true,
      enabled_at: new Date().toISOString(),
      enabled_by: userId,
    },
    { onConflict: "tenant_id,currency" },
  );
  if (error) throw new Error(error.message);
}

export type ForeignTenderInput = {
  currency: string;
  fxRate: number;
  foreignAmount: number;
};
