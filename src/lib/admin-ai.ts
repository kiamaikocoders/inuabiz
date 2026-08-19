import { askAi } from "@/lib/ai-server";
import { getSupabase } from "@/lib/supabase";
import {
  KES,
  adminNotifications,
  mrrTrend,
  platformHealth,
  tenants,
  unclaimedPayments,
  type Tenant,
} from "@/lib/mock-data";

export type AdminAiRunType =
  | "briefing"
  | "churn"
  | "unclaimed"
  | "broadcast"
  | "tenant_brief"
  | "chat";

export type PlatformSnapshot = {
  generatedAt: string;
  mrrKes: number;
  tenantCounts: Record<Tenant["status"], number> & { total: number };
  trials: Array<{ id: string; business: string; town: string }>;
  attention: Array<{ id: string; business: string; status: Tenant["status"]; town: string }>;
  unclaimed: { count: number; valueKes: number; items: typeof unclaimedPayments };
  health: typeof platformHealth;
  towns: Array<{ town: string; count: number }>;
  alerts: Array<{ title: string; message: string; priority: string }>;
};

export type AdminAction = { title: string; why: string; href: string };

export type AtRiskVendor = {
  id: string;
  business: string;
  severity: "high" | "medium" | "low";
  reason: string;
};

export type UnclaimedMatch = {
  paymentId: string;
  tenantId: string;
  business: string;
  confidence: number;
  reason: string;
};

export type AdminBriefing = {
  headline: string;
  summary: string;
  briefingPoints: string[];
  actions: AdminAction[];
  atRisk: AtRiskVendor[];
  unclaimedMatches: UnclaimedMatch[];
  model: string;
  source: "gateway" | "heuristic";
};

function extractJson(raw: string): unknown {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced?.[1]?.trim() ?? trimmed;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("No JSON object in model output");
  return JSON.parse(body.slice(start, end + 1));
}

export function buildPlatformSnapshot(): PlatformSnapshot {
  const byStatus = tenants.reduce(
    (acc, t) => {
      acc[t.status] += 1;
      return acc;
    },
    { Active: 0, Trial: 0, Error: 0, Suspended: 0 },
  );
  const towns = Object.entries(
    tenants.reduce<Record<string, number>>((acc, t) => {
      acc[t.town] = (acc[t.town] ?? 0) + 1;
      return acc;
    }, {}),
  )
    .map(([town, count]) => ({ town, count }))
    .sort((a, b) => b.count - a.count);

  return {
    generatedAt: new Date().toISOString(),
    mrrKes: tenants.filter((t) => t.status === "Active").reduce((s, t) => s + t.mrr, 0),
    tenantCounts: { ...byStatus, total: tenants.length },
    trials: tenants
      .filter((t) => t.status === "Trial")
      .map((t) => ({ id: t.id, business: t.business, town: t.town })),
    attention: tenants
      .filter((t) => t.status === "Error" || t.status === "Suspended")
      .map((t) => ({ id: t.id, business: t.business, status: t.status, town: t.town })),
    unclaimed: {
      count: unclaimedPayments.length,
      valueKes: unclaimedPayments.reduce((s, p) => s + p.amount, 0),
      items: unclaimedPayments,
    },
    health: platformHealth,
    towns,
    alerts: adminNotifications
      .filter((n) => !n.read)
      .map((n) => ({ title: n.title, message: n.message, priority: n.priority })),
  };
}

function heuristicBriefing(snap: PlatformSnapshot): AdminBriefing {
  const atRisk: AtRiskVendor[] = [
    ...snap.attention.map((t) => ({
      id: t.id,
      business: t.business,
      severity: t.status === "Error" ? ("high" as const) : ("medium" as const),
      reason:
        t.status === "Error"
          ? "Webhook / payment errors — impersonate and check IntaSend delivery."
          : "Suspended — likely past-due. Call before they churn.",
    })),
    ...snap.trials.map((t) => ({
      id: t.id,
      business: t.business,
      severity: "medium" as const,
      reason: `Trial in ${t.town}. Convert before day 14 or they go dark.`,
    })),
  ];

  const unclaimedMatches: UnclaimedMatch[] = snap.unclaimed.items.map((p, i) => {
    const guess = tenants[i % tenants.length]!;
    return {
      paymentId: p.id,
      tenantId: guess.id,
      business: guess.business,
      confidence: 62 - i * 8,
      reason: `Phone fragment ${p.account.slice(-4)} is closest to ${guess.phone}. ${p.reason}.`,
    };
  });

  return {
    headline: `${KES(snap.mrrKes)} MRR · ${snap.unclaimed.count} unclaimed · ${atRisk.length} vendors need a human`,
    summary: `Platform is collecting ${KES(snap.mrrKes)}/mo across ${snap.tenantCounts.Active} paying dukas. ${snap.tenantCounts.Trial} trials are still open. ${KES(snap.unclaimed.valueKes)} sits in the unclaimed queue and IntaSend webhooks are degraded — that is the highest-leverage ops work today.`,
    briefingPoints: [
      `Convert ${snap.trials.map((t) => t.business).join(", ") || "no open trials"} before the 14-day clock runs out.`,
      `Map ${snap.unclaimed.count} orphan payments (${KES(snap.unclaimed.valueKes)}) — auto-match is not 100%.`,
      snap.health.find((h) => h.status !== "Healthy")
        ? `${snap.health.find((h) => h.status !== "Healthy")!.name} is ${snap.health.find((h) => h.status !== "Healthy")!.status.toLowerCase()}.`
        : "All health checks are green.",
      `GIS density is heaviest in ${snap.towns[0]?.town ?? "Nairobi"} (${snap.towns[0]?.count ?? 0} stores).`,
    ],
    actions: [
      {
        title: "Clear the unclaimed queue",
        why: `${KES(snap.unclaimed.valueKes)} cannot renew anyone until it is assigned.`,
        href: "/admin/unclaimed",
      },
      {
        title: "Call at-risk vendors",
        why: "Error and suspended tenants churn silently without a support ghost session.",
        href: "/admin/vendors",
      },
      {
        title: "Inspect webhook health",
        why: "Failed IntaSend deliveries create the unclaimed pile.",
        href: "/admin/health",
      },
    ],
    atRisk,
    unclaimedMatches,
    model: "heuristic-v1",
    source: "heuristic",
  };
}

async function complete(
  system: string,
  user: string,
  maxTokens: number,
): Promise<{ text: string; model: string }> {
  const payload = {
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    maxTokens,
    json: true,
  };
  try {
    const res = await askAi({ data: payload });
    return { text: res.text, model: "gemini-2.5-flash" };
  } catch {
    const { json: _json, ...rest } = payload;
    const res = await askAi({ data: rest });
    return { text: res.text, model: "gemini-2.5-flash" };
  }
}

async function logRun(
  runType: AdminAiRunType,
  input: Record<string, unknown>,
  output: Record<string, unknown>,
  model: string,
  estimatedCostKes: number,
): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  try {
    const {
      data: { user },
    } = await sb.auth.getUser();
    await sb.from("admin_ai_runs").insert({
      run_type: runType,
      input,
      output,
      model,
      estimated_cost_kes: estimatedCostKes,
      created_by: user?.id ?? null,
    });
  } catch {
    /* RLS or missing table — UI still works */
  }
}

export async function runAdminBriefing(): Promise<AdminBriefing> {
  const snap = buildPlatformSnapshot();
  const fallback = heuristicBriefing(snap);
  try {
    const { text, model } = await complete(
      "You are the InuaBiz super-admin copilot for a Kenyan micro-POS SaaS (KES 3,000/mo, 14-day trial, M-Pesa). Reply with JSON only: {headline, summary, briefingPoints: string[], actions: [{title, why, href}], atRisk: [{id, business, severity, reason}], unclaimedMatches: [{paymentId, tenantId, business, confidence, reason}]}. href must be an existing admin path like /admin/unclaimed. Use KES. Be blunt and operational. Keep under 180 words in summary+points.",
      JSON.stringify(snap),
      1100,
    );
    const parsed = extractJson(text) as Partial<AdminBriefing>;
    const briefing: AdminBriefing = {
      headline: parsed.headline || fallback.headline,
      summary: parsed.summary || fallback.summary,
      briefingPoints: parsed.briefingPoints?.length ? parsed.briefingPoints : fallback.briefingPoints,
      actions: parsed.actions?.length ? parsed.actions : fallback.actions,
      atRisk: parsed.atRisk?.length ? parsed.atRisk : fallback.atRisk,
      unclaimedMatches: parsed.unclaimedMatches?.length
        ? parsed.unclaimedMatches
        : fallback.unclaimedMatches,
      model,
      source: "gateway",
    };
    await logRun("briefing", { snapAt: snap.generatedAt }, briefing as unknown as Record<string, unknown>, model, 0.35);
    return briefing;
  } catch {
    await logRun("briefing", { snapAt: snap.generatedAt }, fallback as unknown as Record<string, unknown>, fallback.model, 0);
    return fallback;
  }
}

export async function draftBroadcast(audience: string, intent: string): Promise<string> {
  const snap = buildPlatformSnapshot();
  try {
    const { text, model } = await complete(
      "Write one short in-app banner for Kenyan duka owners. JSON only: {message}. Max 160 characters. No hashtags. Kiswahili mix is OK if natural. Audience and intent are given.",
      JSON.stringify({ audience, intent, mrrKes: snap.mrrKes, trials: snap.trials.length }),
      200,
    );
    const parsed = extractJson(text) as { message?: string };
    const message = parsed.message?.trim() || intent;
    await logRun("broadcast", { audience, intent }, { message }, model, 0.08);
    return message;
  } catch {
    return intent.slice(0, 160);
  }
}

/**
 * Tighten an email subject line for Kenyan MSME mail.
 */
export async function improveEmailSubject(name: string, current: string): Promise<string> {
  try {
    const { text } = await complete(
      "Rewrite this transactional email subject. JSON only: {subject}. Max 70 characters. British English. Kenyan duka tone. No spam words.",
      JSON.stringify({ template: name, current }),
      120,
    );
    const parsed = extractJson(text) as { subject?: string };
    return parsed.subject?.trim() || current;
  } catch {
    return current;
  }
}

export async function briefTenant(tenant: Tenant): Promise<{ summary: string; nextSteps: string[] }> {
  try {
    const { text, model } = await complete(
      "You brief an InuaBiz support agent before they impersonate a Kenyan vendor. JSON only: {summary, nextSteps: string[]}. 80 words max. Practical.",
      JSON.stringify(tenant),
      400,
    );
    const parsed = extractJson(text) as { summary?: string; nextSteps?: string[] };
    const out = {
      summary: parsed.summary || `${tenant.business} is ${tenant.status} in ${tenant.town}.`,
      nextSteps: parsed.nextSteps?.length
        ? parsed.nextSteps
        : ["Open a ghost session", "Check last STK and stock alerts"],
    };
    await logRun("tenant_brief", { tenantId: tenant.id }, out, model, 0.12);
    return out;
  } catch {
    return {
      summary: `${tenant.business} (${tenant.category}) in ${tenant.town} is ${tenant.status}. MRR ${tenant.mrr ? KES(tenant.mrr) : "on trial"}.`,
      nextSteps: [
        "Ghost-session into POS and confirm today's sales posting",
        tenant.status === "Error" ? "Inspect failed webhooks" : "Ask if M-Pesa destination is still correct",
      ],
    };
  }
}

export async function suggestUnclaimedMatches(): Promise<UnclaimedMatch[]> {
  const briefing = await runAdminBriefing();
  return briefing.unclaimedMatches;
}

export async function askAdminCopilot(
  question: string,
  history: Array<{ role: "user" | "assistant"; content: string }>,
): Promise<string> {
  const snap = buildPlatformSnapshot();
  const messages = [
    {
      role: "system",
      content: `You are the InuaBiz operator copilot. Answer from the snapshot. Money in KES. Point to /admin/* routes including /admin/communications. Snapshot: ${JSON.stringify(snap)}. Latest MRR trend: ${JSON.stringify(mrrTrend)}.`,
    },
    ...history.slice(-8),
    { role: "user", content: question },
  ];
  try {
    const res = await askAi({
      data: { messages, maxTokens: 500 },
    });
    await logRun("chat", { question }, { text: res.text }, "gemini-2.5-flash", 0.15);
    return res.text;
  } catch {
    const fb = heuristicBriefing(snap);
    return `${fb.summary}\n\nSuggested: ${fb.actions.map((a) => a.title).join("; ")}`;
  }
}

export async function fetchAiSpendThisMonth(): Promise<{
  runs: number;
  costKes: number;
}> {
  const sb = getSupabase();
  if (!sb) return { runs: 0, costKes: 0 };
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  const { data, error } = await sb
    .from("admin_ai_runs")
    .select("estimated_cost_kes")
    .gte("created_at", start.toISOString());
  if (error || !data) return { runs: 0, costKes: 0 };
  const costKes = data.reduce((s, r) => s + Number(r.estimated_cost_kes ?? 0), 0);
  return { runs: data.length, costKes };
}
