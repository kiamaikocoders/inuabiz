import { getSupabase } from "@/lib/supabase";

export type FunnelStage = {
  id: string;
  label: string;
  count: number;
};

export type FunnelDropoff = {
  from: string;
  to: string;
  lost: number;
  rate_pct: number;
};

export type ProductIntelligence = {
  generated_at: string;
  window_days: number;
  kpis: {
    final_conversion_pct: number;
    successful_signups: number;
    lost_to_issues: number;
    stuck_in_onboarding: number;
    signed_up: number;
  };
  funnel: FunnelStage[];
  dropoffs: FunnelDropoff[];
  pages: Array<{ path: string; views: number }>;
  events: Array<{ name: string; count: number }>;
  cohorts: Array<{
    week_start: string;
    signed_up: number;
    completed: number;
    activated: number;
    retained: number;
  }>;
  issues: Array<{
    at: string;
    kind: string;
    title: string;
    detail: string | null;
    href: string | null;
  }>;
  issue_counts: {
    email_failures: number;
    payment_failures: number;
  };
};

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export async function fetchProductIntelligence(days = 30): Promise<ProductIntelligence> {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase is not configured");

  const { data, error } = await sb.rpc("admin_product_intelligence", { p_days: days });
  if (error) throw new Error(error.message);

  const raw = (data ?? {}) as Record<string, unknown>;
  const kpis = (raw["kpis"] ?? {}) as Record<string, unknown>;
  const issueCounts = (raw["issue_counts"] ?? {}) as Record<string, unknown>;

  return {
    generated_at: String(raw["generated_at"] ?? new Date().toISOString()),
    window_days: num(raw["window_days"]) || days,
    kpis: {
      final_conversion_pct: num(kpis["final_conversion_pct"]),
      successful_signups: num(kpis["successful_signups"]),
      lost_to_issues: num(kpis["lost_to_issues"]),
      stuck_in_onboarding: num(kpis["stuck_in_onboarding"]),
      signed_up: num(kpis["signed_up"]),
    },
    funnel: Array.isArray(raw["funnel"])
      ? (raw["funnel"] as FunnelStage[]).map((s) => ({
          id: String(s.id),
          label: String(s.label),
          count: num(s.count),
        }))
      : [],
    dropoffs: Array.isArray(raw["dropoffs"])
      ? (raw["dropoffs"] as FunnelDropoff[]).map((d) => ({
          from: String(d.from),
          to: String(d.to),
          lost: num(d.lost),
          rate_pct: num(d.rate_pct),
        }))
      : [],
    pages: Array.isArray(raw["pages"])
      ? (raw["pages"] as Array<{ path: string; views: number }>).map((p) => ({
          path: String(p.path),
          views: num(p.views),
        }))
      : [],
    events: Array.isArray(raw["events"])
      ? (raw["events"] as Array<{ name: string; count: number }>).map((e) => ({
          name: String(e.name),
          count: num(e.count),
        }))
      : [],
    cohorts: Array.isArray(raw["cohorts"])
      ? (raw["cohorts"] as ProductIntelligence["cohorts"]).map((c) => ({
          week_start: String(c.week_start),
          signed_up: num(c.signed_up),
          completed: num(c.completed),
          activated: num(c.activated),
          retained: num(c.retained),
        }))
      : [],
    issues: Array.isArray(raw["issues"])
      ? (raw["issues"] as ProductIntelligence["issues"]).map((i) => ({
          at: String(i.at),
          kind: String(i.kind),
          title: String(i.title),
          detail: i.detail != null ? String(i.detail) : null,
          href: i.href != null ? String(i.href) : null,
        }))
      : [],
    issue_counts: {
      email_failures: num(issueCounts["email_failures"]),
      payment_failures: num(issueCounts["payment_failures"]),
    },
  };
}

export type ScenarioId = "healthy" | "form_outage" | "sms_drop";

export type ScenarioOverlay = {
  id: ScenarioId;
  label: string;
  formErrorPct: number;
  verifyFailPct: number;
  badge: string | null;
};

export const SCENARIOS: ScenarioOverlay[] = [
  { id: "healthy", label: "Healthy growth", formErrorPct: 2, verifyFailPct: 1, badge: null },
  {
    id: "form_outage",
    label: "Form API outage",
    formErrorPct: 45,
    verifyFailPct: 3,
    badge: "Form errors spiking",
  },
  {
    id: "sms_drop",
    label: "SMS verify drop",
    formErrorPct: 4,
    verifyFailPct: 35,
    badge: "Verification issue",
  },
];

/** Apply what-if error rates on top of the live signed-up baseline. */
export function simulateFunnel(
  signedUp: number,
  landingConvPct: number,
  formConvPct: number,
  verifyConvPct: number,
  formErrorPct: number,
  verifyFailPct: number,
) {
  const traffic = Math.max(0, Math.round(signedUp));
  const landing = Math.round(traffic * (landingConvPct / 100));
  const afterFormNatural = Math.round(landing * (formConvPct / 100));
  const formLost = Math.round(landing * (formErrorPct / 100));
  const formSubmit = Math.max(0, afterFormNatural - formLost);
  const afterVerifyNatural = Math.round(formSubmit * (verifyConvPct / 100));
  const verifyLost = Math.round(formSubmit * (verifyFailPct / 100));
  const converted = Math.max(0, afterVerifyNatural - verifyLost);
  const lostToIssues = formLost + verifyLost;
  const finalPct = traffic > 0 ? Math.round((converted / traffic) * 1000) / 10 : 0;
  return {
    stages: [
      { id: "traffic", label: "Traffic source", count: traffic },
      { id: "landing", label: "Landing view", count: landing },
      { id: "form", label: "Form submit", count: formSubmit },
      { id: "converted", label: "Converted", count: converted },
    ],
    finalPct,
    converted,
    lostToIssues,
  };
}

/** Week-over-week % change from the last two cohort rows, or null if unavailable. */
export function cohortWowDelta(
  cohorts: ProductIntelligence["cohorts"],
  key: "signed_up" | "completed" | "activated" | "retained",
): number | null {
  if (cohorts.length < 2) return null;
  const last = cohorts[cohorts.length - 1]![key];
  const prev = cohorts[cohorts.length - 2]![key];
  if (prev <= 0) return last > 0 ? 100 : null;
  return Math.round(((last - prev) / prev) * 1000) / 10;
}

/** Last N cohort weeks as sparkline points (oldest → newest). */
export function cohortSparkline(
  cohorts: ProductIntelligence["cohorts"],
  key: "signed_up" | "completed" | "activated" | "retained",
  limit = 8,
): Array<{ i: number; v: number }> {
  return cohorts.slice(-limit).map((c, i) => ({ i, v: c[key] }));
}

export function shortWeekLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(5, 10);
  return d.toLocaleDateString("en-KE", { month: "short", day: "numeric" });
}
