import { isSupabaseConfigured, supabaseRestConfig } from "@/lib/supabase-env";
import {
  COMPLIANCE_PRICE,
  SETUP_FEE,
  SUBSCRIPTION_PRICE,
  TRIAL_DAYS,
} from "@/lib/mock-data";

export type PlanInterval = "month" | "one_time" | "quote";

export type SubscriptionPlan = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  amountKes: number;
  currency: string;
  billingInterval: PlanInterval;
  isActive: boolean;
  isPublic: boolean;
  displayOrder: number;
  updatedAt: string | null;
};

export type PublicPricing = {
  shopMonthly: number;
  compliance: number;
  setup: number;
  trialDays: number;
};

const DEFAULT_PLANS: SubscriptionPlan[] = [
  {
    id: "local-shop",
    code: "SHOP_MONTHLY",
    name: "Standard",
    description: "Self-serve POS per shop / month after trial. Extra shops use the same rate.",
    amountKes: SUBSCRIPTION_PRICE,
    currency: "KES",
    billingInterval: "month",
    isActive: true,
    isPublic: true,
    displayOrder: 10,
    updatedAt: null,
  },
  {
    id: "local-compliance",
    code: "COMPLIANCE",
    name: "Compliance (ETR)",
    description: "Standard plus ETR-format receipts for your KRA filing pack. Quoted — not self-serve PIN.",
    amountKes: COMPLIANCE_PRICE,
    currency: "KES",
    billingInterval: "month",
    isActive: true,
    isPublic: true,
    displayOrder: 20,
    updatedAt: null,
  },
  {
    id: "local-setup",
    code: "SETUP",
    name: "Assisted setup",
    description: "Optional one-time assisted onboarding.",
    amountKes: SETUP_FEE,
    currency: "KES",
    billingInterval: "one_time",
    isActive: true,
    isPublic: true,
    displayOrder: 30,
    updatedAt: null,
  },
];

const PLAN_SELECT =
  "id,code,name,description,amount_kes,currency,billing_interval,is_active,is_public,display_order,updated_at";

function mapRow(row: Record<string, unknown>): SubscriptionPlan {
  return {
    id: String(row["id"]),
    code: String(row["code"]),
    name: String(row["name"]),
    description: (row["description"] as string | null) ?? null,
    amountKes: Number(row["amount_kes"] ?? 0),
    currency: String(row["currency"] ?? "KES"),
    billingInterval: String(row["billing_interval"] ?? "month") as PlanInterval,
    isActive: Boolean(row["is_active"]),
    isPublic: Boolean(row["is_public"]),
    displayOrder: Number(row["display_order"] ?? 0),
    updatedAt: (row["updated_at"] as string | null) ?? null,
  };
}

function amountFor(plans: SubscriptionPlan[], code: string, fallback: number): number {
  const hit = plans.find((p) => p.code === code && p.isActive);
  return hit ? hit.amountKes : fallback;
}

function restHeaders(key: string): HeadersInit {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    Accept: "application/json",
  };
}

/** Public catalog via PostgREST — no supabase-js (keeps marketing JS light). */
async function fetchPlansViaRest(opts?: {
  includeInactive?: boolean;
}): Promise<SubscriptionPlan[] | null> {
  const cfg = supabaseRestConfig();
  if (!cfg) return null;

  const params = new URLSearchParams({
    select: PLAN_SELECT,
    order: "display_order.asc",
  });
  if (!opts?.includeInactive) {
    params.set("is_active", "eq.true");
    params.set("is_public", "eq.true");
  }

  try {
    const res = await fetch(`${cfg.url}/rest/v1/subscription_plans?${params}`, {
      headers: restHeaders(cfg.key),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Record<string, unknown>[];
    if (!Array.isArray(data) || !data.length) return null;
    return data.map(mapRow);
  } catch {
    return null;
  }
}

async function fetchTrialDaysViaRest(): Promise<number | null> {
  const cfg = supabaseRestConfig();
  if (!cfg) return null;
  const params = new URLSearchParams({
    select: "value",
    key: "eq.billing.trial_days",
    limit: "1",
  });
  try {
    const res = await fetch(`${cfg.url}/rest/v1/platform_settings?${params}`, {
      headers: restHeaders(cfg.key),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{ value?: unknown }>;
    const raw = data[0]?.value;
    if (raw == null) return null;
    const n = Number(typeof raw === "string" ? raw.replace(/^"|"$/g, "") : raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

/** Public + admin catalog. Admin sees inactive rows when live. */
export async function fetchSubscriptionPlans(opts?: {
  includeInactive?: boolean;
}): Promise<SubscriptionPlan[]> {
  if (opts?.includeInactive) {
    const { getSupabase } = await import("@/lib/supabase");
    const sb = getSupabase();
    if (!sb) return DEFAULT_PLANS;

    const { data, error } = await sb
      .from("subscription_plans")
      .select(PLAN_SELECT.replace(/,/g, ", "))
      .order("display_order", { ascending: true });

    if (error || !data?.length) return DEFAULT_PLANS;
    return data.map((row) => mapRow(row as Record<string, unknown>));
  }

  return (await fetchPlansViaRest()) ?? DEFAULT_PLANS;
}

export async function fetchPublicPricing(): Promise<PublicPricing> {
  const [plans, trialFromRest] = await Promise.all([
    fetchPlansViaRest(),
    fetchTrialDaysViaRest(),
  ]);
  const list = plans ?? DEFAULT_PLANS;
  return {
    shopMonthly: amountFor(list, "SHOP_MONTHLY", SUBSCRIPTION_PRICE),
    compliance: amountFor(list, "COMPLIANCE", COMPLIANCE_PRICE),
    setup: amountFor(list, "SETUP", SETUP_FEE),
    trialDays: trialFromRest ?? TRIAL_DAYS,
  };
}

export type PlanUpsertInput = {
  code: string;
  name: string;
  description?: string | null;
  amountKes: number;
  billingInterval: PlanInterval;
  isActive: boolean;
  isPublic: boolean;
  displayOrder: number;
};

export async function createSubscriptionPlan(input: PlanUpsertInput): Promise<SubscriptionPlan> {
  const { getSupabase } = await import("@/lib/supabase");
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase is not configured");

  const { data, error } = await sb
    .from("subscription_plans")
    .insert({
      code: input.code.trim().toUpperCase(),
      name: input.name.trim(),
      description: input.description?.trim() || null,
      amount_kes: input.amountKes,
      billing_interval: input.billingInterval,
      is_active: input.isActive,
      is_public: input.isPublic,
      display_order: input.displayOrder,
    })
    .select(
      "id, code, name, description, amount_kes, currency, billing_interval, is_active, is_public, display_order, updated_at",
    )
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to create plan");
  return mapRow(data as Record<string, unknown>);
}

export async function updateSubscriptionPlan(
  id: string,
  input: Partial<PlanUpsertInput>,
): Promise<SubscriptionPlan> {
  const { getSupabase } = await import("@/lib/supabase");
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase is not configured");

  const patch: Record<string, unknown> = {};
  if (input.code != null) patch["code"] = input.code.trim().toUpperCase();
  if (input.name != null) patch["name"] = input.name.trim();
  if (input.description !== undefined) patch["description"] = input.description?.trim() || null;
  if (input.amountKes != null) patch["amount_kes"] = input.amountKes;
  if (input.billingInterval != null) patch["billing_interval"] = input.billingInterval;
  if (input.isActive != null) patch["is_active"] = input.isActive;
  if (input.isPublic != null) patch["is_public"] = input.isPublic;
  if (input.displayOrder != null) patch["display_order"] = input.displayOrder;

  const { data, error } = await sb
    .from("subscription_plans")
    .update(patch)
    .eq("id", id)
    .select(
      "id, code, name, description, amount_kes, currency, billing_interval, is_active, is_public, display_order, updated_at",
    )
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to update plan");
  return mapRow(data as Record<string, unknown>);
}

export async function deleteSubscriptionPlan(id: string): Promise<void> {
  const { getSupabase } = await import("@/lib/supabase");
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase is not configured");
  const { error } = await sb.from("subscription_plans").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function saveTrialDays(days: number): Promise<void> {
  const { getSupabase } = await import("@/lib/supabase");
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase is not configured");
  const { error } = await sb.from("platform_settings").upsert(
    {
      key: "billing.trial_days",
      value: days,
      description: "Self-serve trial length in days for the first shop.",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" },
  );
  if (error) throw new Error(error.message);
}

export function plansLive(): boolean {
  return isSupabaseConfigured();
}
