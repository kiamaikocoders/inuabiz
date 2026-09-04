import { getServiceClient, getUserClient, handleOptions, jsonResponse } from "../_shared/cors.ts";
import { resolveSecret } from "../_shared/daraja.ts";

/**
 * Pull CBK foreign→KES rates from Frankfurter and upsert into fx_rates.
 * Also mirrors USD onto tenants.usd_kes_rate* and platform_settings (legacy).
 *
 * Auth: x-cron-secret / service role, OR authenticated vendor/admin.
 * Cron body: { "job": "daily" }.
 */

type FrankfurterRow = {
  date?: string;
  base?: string;
  quote?: string;
  rate?: number;
};

const OFFERED_CURRENCIES = new Set([
  "USD",
  "EUR",
  "GBP",
  "AUD",
  "AED",
  "CAD",
  "CHF",
  "CNY",
  "JPY",
  "UGX",
  "ZAR",
  "TZS",
]);

const CURRENCY_NAMES: Record<string, string> = {
  AED: "UAE Dirham",
  AUD: "Australian Dollar",
  CAD: "Canadian Dollar",
  CHF: "Swiss Franc",
  CNY: "Chinese Yuan",
  EUR: "Euro",
  GBP: "British Pound",
  JPY: "Japanese Yen",
  TZS: "Tanzanian Shilling",
  UGX: "Ugandan Shilling",
  USD: "US Dollar",
  ZAR: "South African Rand",
};

async function fetchCbkKesCrosses(): Promise<{
  date: string;
  rates: Array<{ currency: string; kesPerUnit: number }>;
}> {
  const res = await fetch("https://api.frankfurter.dev/v2/rates?base=KES&providers=CBK", {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`FX provider returned ${res.status}`);
  const rows = (await res.json()) as FrankfurterRow[];
  if (!Array.isArray(rows) || !rows.length) {
    throw new Error("FX provider returned no CBK rates");
  }
  const date = String(rows[0]?.date ?? new Date().toISOString().slice(0, 10));
  const rates: Array<{ currency: string; kesPerUnit: number }> = [];
  for (const row of rows) {
    const quote = String(row.quote ?? "").toUpperCase();
    const foreignPerKes = Number(row.rate);
    if (!quote || quote === "KES") continue;
    if (!OFFERED_CURRENCIES.has(quote)) continue;
    if (!Number.isFinite(foreignPerKes) || foreignPerKes <= 0) continue;
    // API: 1 KES = foreignPerKes units → KES per 1 foreign unit.
    const kesPerUnit = Math.round((1 / foreignPerKes) * 1_000_000) / 1_000_000;
    rates.push({ currency: quote, kesPerUnit });
  }
  if (!rates.length) throw new Error("FX provider returned no usable CBK crosses");
  return { date, rates };
}

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const cronSecret = Deno.env.get("CRON_SECRET") ?? (await resolveSecret("CRON_SECRET"));
    const headerSecret = req.headers.get("x-cron-secret");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const isCron = Boolean(cronSecret && headerSecret === cronSecret);
    const isService = Boolean(serviceKey && authHeader === `Bearer ${serviceKey}`);

    const body = (await req.json().catch(() => ({}))) as {
      job?: string;
      apply_to_tenant?: boolean;
    };

    const service = getServiceClient();
    let tenantId: string | null = null;
    let userId: string | null = null;
    let allowed = isCron || isService;
    let isAdmin = isCron || isService;

    if (!allowed && authHeader.startsWith("Bearer ")) {
      const userClient = getUserClient(authHeader);
      const {
        data: { user },
      } = await userClient.auth.getUser();
      if (!user) return jsonResponse({ error: "Unauthorized" }, 401);
      userId = user.id;
      const { data: profile } = await service
        .from("profiles")
        .select("tenant_id, role")
        .eq("id", user.id)
        .maybeSingle();
      const role = String(profile?.role ?? "");
      if (role === "SUPER_ADMIN") {
        allowed = true;
        isAdmin = true;
      } else if (role === "VENDOR_ADMIN" || role === "VENDOR_STAFF") {
        allowed = true;
        tenantId = (profile?.tenant_id as string | null) ?? null;
      }
    }

    if (!allowed) return jsonResponse({ error: "Unauthorized" }, 401);

    const { date, rates } = await fetchCbkKesCrosses();
    const fetchedAt = new Date().toISOString();
    const usd = rates.find((r) => r.currency === "USD");

    const upsertRows = rates.map((r) => ({
      currency: r.currency,
      kes_per_unit: r.kesPerUnit,
      rate_date: date,
      fetched_at: fetchedAt,
      source: "cbk",
      name: CURRENCY_NAMES[r.currency] ?? r.currency,
    }));

    const { error: fxErr } = await service.from("fx_rates").upsert(upsertRows, {
      onConflict: "currency",
    });
    if (fxErr) throw new Error(fxErr.message);

    if (usd) {
      const settingsRows = [
        { key: "fx.usd_kes", value: usd.kesPerUnit, updated_at: fetchedAt },
        { key: "fx.usd_kes_date", value: date, updated_at: fetchedAt },
        { key: "fx.usd_kes_fetched_at", value: fetchedAt, updated_at: fetchedAt },
        { key: "fx.usd_kes_source", value: "cbk", updated_at: fetchedAt },
      ];
      const { error: sErr } = await service.from("platform_settings").upsert(settingsRows, {
        onConflict: "key",
      });
      if (sErr) throw new Error(sErr.message);

      // Keep legacy tenant USD mirror in sync (CBK only — no manual).
      const { error: tErr } = await service
        .from("tenants")
        .update({
          usd_kes_rate: usd.kesPerUnit,
          usd_kes_rate_at: fetchedAt,
          usd_kes_rate_date: date,
          usd_kes_rate_source: "cbk",
        })
        .neq("id", "00000000-0000-0000-0000-000000000000");
      if (tErr) throw new Error(tErr.message);
    }

    return jsonResponse({
      ok: true,
      date,
      source: "cbk",
      fetched_at: fetchedAt,
      currencies: rates.length,
      rate: usd?.kesPerUnit ?? null,
      rates: Object.fromEntries(rates.map((r) => [r.currency, r.kesPerUnit])),
      tenant_id: tenantId,
      refreshed_by: userId,
      admin: isAdmin,
    });
  } catch (err) {
    console.error(err);
    return jsonResponse(
      { error: err instanceof Error ? err.message : "Could not refresh FX rate" },
      500,
    );
  }
});
