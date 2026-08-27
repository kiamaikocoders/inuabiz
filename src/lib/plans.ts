import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
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
    description: "Standard plus ETR / KRA-ready invoicing. Quoted — not self-serve PIN.",
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

function mapRow(row: Record<string, unknown>): SubscriptionPlan {
  return {
    id: String(row["id"]),
    code: String(row["code"]),
    name: String(row["name"]),
    description: (row["description"] as string | null) ?? null,
    amountKes: Number(row["amount_kes"] ?? 0),
    currency: String(row["currency"] ?? "KES"),
    billingInterval: (String(row["billing_interval"] ?? "month") as PlanInterval),
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

/** Public + admin catalog. Admin sees inactive rows when live. */
export async function fetchSubscriptionPlans(opts?: {
  includeInactive?: boolean;
}): Promise<SubscriptionPlan[]> {
  const sb = getSupabase();
  if (!sb) return DEFAULT_PLANS;

  let q = sb
    .from("subscription_plans")
    .select(
      "id, code, name, description, amount_kes, currency, billing_interval, is_active, is_public, display_order, updated_at",
    )
    .order("display_order", { ascending: true });

  if (!opts?.includeInactive) {
    q = q.eq("is_active", true).eq("is_public", true);
  }

  const { data, error } = await q;
  if (error || !data?.length) return DEFAULT_PLANS;
  return data.map((row) => mapRow(row as Record<string, unknown>));
}

export async function fetchPublicPricing(): Promise<PublicPricing> {
  const plans = await fetchSubscriptionPlans();
  let trialDays = TRIAL_DAYS;

  const sb = getSupabase();
  if (sb) {
    const { data } = await sb
      .from("platform_settings")
      .select("value")
      .eq("key", "billing.trial_days")
      .maybeSingle();
    if (data?.value != null) {
      const n = Number(
        typeof data.value === "string" ? data.value.replace(/^"|"$/g, "") : data.value,
      );
      if (Number.isFinite(n) && n > 0) trialDays = n;
    }
  }

  return {
    shopMonthly: amountFor(plans, "SHOP_MONTHLY", SUBSCRIPTION_PRICE),
    compliance: amountFor(plans, "COMPLIANCE", COMPLIANCE_PRICE),
    setup: amountFor(plans, "SETUP", SETUP_FEE),
    trialDays,
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
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase is not configured");
  const { error } = await sb.from("subscription_plans").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function saveTrialDays(days: number): Promise<void> {
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
