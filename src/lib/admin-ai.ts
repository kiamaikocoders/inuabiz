import { askAi } from "@/lib/ai-server";
import { fetchTenants } from "@/lib/data";
import { fetchMrrSnapshot, fetchNotifications, fetchUnclaimedPayments } from "@/lib/ops";
import { getSupabase } from "@/lib/supabase";
import { KES, type Tenant } from "@/lib/mock-data";

export type AdminAiRunType =
  | "briefing"
  | "churn"
  | "unclaimed"
  | "broadcast"
  | "tenant_brief"
  | "chat"
  | "support_summarize"
  | "support_improve_tone";

export type HealthRow = {
  name: string;
  detail: string;
  status: string;
  value: number;
};

export type SnapshotVendor = {
  id: string;
  business: string;
  phone: string;
  town: string;
  status: Tenant["status"];
};

export type SnapshotUnclaimed = {
  id: string;
  amount: number;
  account: string;
  apiRef: string;
  reason: string;
};

export type PlatformSnapshot = {
  generatedAt: string;
  mrrKes: number;
  tenantCounts: Record<Tenant["status"], number> & { total: number };
  trials: Array<{ id: string; business: string; town: string }>;
  attention: Array<{ id: string; business: string; status: Tenant["status"]; town: string }>;
  vendors: SnapshotVendor[];
  unclaimed: { count: number; valueKes: number; items: SnapshotUnclaimed[] };
  health: HealthRow[];
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

function digits(value: string): string {
  return value.replace(/\D/g, "");
}

function matchUnclaimed(
  items: SnapshotUnclaimed[],
  vendors: SnapshotVendor[],
): UnclaimedMatch[] {
  const matches: UnclaimedMatch[] = [];
  for (const p of items) {
    const needle = digits(p.account).slice(-9);
    if (needle.length < 6) continue;
    let best: { vendor: SnapshotVendor; score: number } | null = null;
    for (const v of vendors) {
      const hay = digits(v.phone);
      if (!hay) continue;
      const score =
        hay.includes(needle) || needle.includes(hay.slice(-9))
          ? 88
          : hay.slice(-4) === needle.slice(-4)
            ? 54
            : 0;
      if (score && (!best || score > best.score)) best = { vendor: v, score };
    }
    if (!best) continue;
    matches.push({
      paymentId: p.id,
      tenantId: best.vendor.id,
      business: best.vendor.business,
      confidence: best.score,
      reason:
        best.score >= 80
          ? `Phone ${p.account} matches ${best.vendor.business} (${best.vendor.phone}).`
          : `Last four ${needle.slice(-4)} is closest to ${best.vendor.phone}. ${p.reason}.`,
    });
  }
  return matches;
}

export async function buildPlatformSnapshot(): Promise<PlatformSnapshot> {
  const [tenants, unclaimed, mrr, notes, spend] = await Promise.all([
    fetchTenants(),
    fetchUnclaimedPayments(),
    fetchMrrSnapshot(),
    fetchNotifications(),
    fetchAiSpendThisMonth(),
  ]);

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

  const health: HealthRow[] = [
    {
      name: "Paying tenants",
      detail: `${mrr?.active_tenants ?? byStatus.Active} active · ${KES(mrr?.mrr_kes ?? tenants.filter((t) => t.status === "Active").reduce((s, t) => s + t.mrr, 0))} MRR`,
      status: (mrr?.active_tenants ?? byStatus.Active) > 0 ? "Healthy" : "Degraded",
      value: Math.min(100, (mrr?.active_tenants ?? byStatus.Active) * 8),
    },
    {
      name: "Unclaimed queue",
      detail: `${unclaimed.length} unmatched · ${KES(unclaimed.reduce((s, p) => s + p.amount, 0))}`,
      status: unclaimed.length === 0 ? "Healthy" : unclaimed.length > 5 ? "Critical" : "Degraded",
      value: Math.min(100, unclaimed.length * 15),
    },
    {
      name: "Trials",
      detail: `${mrr?.trial_tenants ?? byStatus.Trial} open trials`,
      status: "Healthy",
      value: Math.min(100, (mrr?.trial_tenants ?? byStatus.Trial) * 12),
    },
    {
      name: "Admin AI",
      detail: `${spend.runs} runs · ${KES(Math.round(spend.costKes))} this month`,
      status: "Healthy",
      value: Math.min(100, spend.runs * 6),
    },
  ];

  return {
    generatedAt: new Date().toISOString(),
    mrrKes:
      mrr?.mrr_kes ?? tenants.filter((t) => t.status === "Active").reduce((s, t) => s + t.mrr, 0),
    tenantCounts: { ...byStatus, total: tenants.length },
    trials: tenants
      .filter((t) => t.status === "Trial")
      .map((t) => ({ id: t.id, business: t.business, town: t.town })),
    attention: tenants
      .filter((t) => t.status === "Error" || t.status === "Suspended")
      .map((t) => ({ id: t.id, business: t.business, status: t.status, town: t.town })),
    vendors: tenants.map((t) => ({
      id: t.id,
      business: t.business,
      phone: t.phone,
      town: t.town,
      status: t.status,
    })),
    unclaimed: {
      count: unclaimed.length,
      valueKes: unclaimed.reduce((s, p) => s + p.amount, 0),
      items: unclaimed.map((p) => ({
        id: p.id,
        amount: p.amount,
        account: p.account,
        apiRef: p.apiRef,
        reason: p.reason,
      })),
    },
    health,
    towns,
    alerts: notes
      .filter((n) => !n.read)
      .slice(0, 8)
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
          ? "Webhook / payment errors — impersonate and check Daraja STK and C2B matching."
          : "Suspended — likely past-due. Call before they churn.",
    })),
    ...snap.trials.map((t) => ({
      id: t.id,
      business: t.business,
      severity: "medium" as const,
      reason: `Trial in ${t.town}. Convert before day 3 or they go dark.`,
    })),
  ];

  const unclaimedMatches = matchUnclaimed(snap.unclaimed.items, snap.vendors);
  const trialNames = snap.trials.map((t) => t.business).join(", ") || "no open trials";

  return {
    headline: `${KES(snap.mrrKes)} MRR · ${snap.unclaimed.count} unclaimed · ${atRisk.length} vendors need a human`,
    summary: `Platform is collecting ${KES(snap.mrrKes)}/mo across ${snap.tenantCounts.Active} paying dukas. ${snap.tenantCounts.Trial} trials are still open. ${KES(snap.unclaimed.valueKes)} sits in the unclaimed queue.`,
    briefingPoints: [
      `Convert ${trialNames} before the 3-day clock runs out.`,
      `Map ${snap.unclaimed.count} orphan payments (${KES(snap.unclaimed.valueKes)}).`,
      snap.health.find((h) => h.status !== "Healthy")
        ? `${snap.health.find((h) => h.status !== "Healthy")!.name} is ${snap.health.find((h) => h.status !== "Healthy")!.status.toLowerCase()}.`
        : "Live health checks that we measure are green.",
      `GIS density is heaviest in ${snap.towns[0]?.town ?? "—"} (${snap.towns[0]?.count ?? 0} stores).`,
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
        title: "Inspect shop categories",
        why: "Chemist expiry, eatery tickets and service queues live on /admin/categories — not the org label.",
        href: "/admin/categories",
      },
      {
        title: "Inspect webhook health",
        why: "Unmatched C2B or Paybill hits create the unclaimed pile.",
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
  const snap = await buildPlatformSnapshot();
  const fallback = heuristicBriefing(snap);
  try {
    const { text, model } = await complete(
      "You are the InuaBiz super-admin copilot for a Kenyan micro-POS SaaS (plan amounts live in /admin/plans — do not invent a fixed KES price; use MRR and tenant amounts from the snapshot). Short free trial, Daraja M-Pesa STK. Shop category (Duka, Boutique, Chemist, Hardware, Eatery, Electronics, Agritech, Services, Other) drives till modules — expiry, kitchen tickets, floor tables, serials. Point operators to /admin/categories for that desk. Reply with JSON only: {headline, summary, briefingPoints: string[], actions: [{title, why, href}], atRisk: [{id, business, severity, reason}], unclaimedMatches: [{paymentId, tenantId, business, confidence, reason}]}. href must be an existing admin path like /admin/unclaimed or /admin/categories. Use KES. Be blunt and operational. Keep under 180 words in summary+points. Never invent tenants, payments or phone numbers that are not in the snapshot.",
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
  const snap = await buildPlatformSnapshot();
  try {
    const { text, model } = await complete(
      "Write one short in-app banner for Kenyan duka owners. JSON only: {message}. Max 160 characters. No hashtags. Kiswahili mix is OK if natural. Audience and intent are given. Do not invent MRR or trial counts.",
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
      "You brief an InuaBiz support agent before they impersonate a Kenyan vendor. JSON only: {summary, nextSteps: string[]}. 80 words max. Practical. Mention the shop category till they will see (chemist expiry, eatery floor, tickets, serials) when the category is not Duka. Do not invent sales figures.",
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
  const snap = await buildPlatformSnapshot();
  const messages = [
    {
      role: "system",
      content: `You are the InuaBiz operator copilot. Answer only from the snapshot. If the snapshot does not contain the answer, say you do not have that figure. Money in KES. Point to /admin/* routes including /admin/communications and /admin/categories (shop-level category, expiry, tickets, floor). Snapshot: ${JSON.stringify(snap)}.`,
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

export type SupportThreadInput = {
  ticketId: string;
  subject: string;
  category: string;
  priority: string;
  tenantName: string;
  aiSummary: string | null;
  messages: Array<{ sender: string; text: string; at: string }>;
};

/** Condense a support thread into bullet points for admin triage. */
export async function summarizeSupportThread(
  thread: SupportThreadInput,
): Promise<{ bullets: string[]; model: string; source: "gateway" | "heuristic" }> {
  const fallback = {
    bullets: [
      thread.aiSummary ?? thread.subject,
      ...thread.messages.slice(-3).map((m) => `${m.sender}: ${m.text.slice(0, 120)}`),
    ].slice(0, 4),
    model: "heuristic-v1",
    source: "heuristic" as const,
  };

  try {
    const { text, model } = await complete(
      "Summarize this InuaBiz merchant support ticket for a super-admin. JSON only: {bullets: string[]}. Max 4 bullets, each under 120 chars. Include M-Pesa amounts/receipt codes if mentioned. British English.",
      JSON.stringify(thread),
      350,
    );
    const parsed = extractJson(text) as { bullets?: string[] };
    const bullets = parsed.bullets?.filter(Boolean).slice(0, 4) ?? fallback.bullets;
    const out = { bullets, model, source: "gateway" as const };
    await logRun("support_summarize", { ticketId: thread.ticketId }, out, model, 0.1);
    return out;
  } catch {
    await logRun(
      "support_summarize",
      { ticketId: thread.ticketId },
      fallback,
      fallback.model,
      0,
    );
    return fallback;
  }
}

/** Polish a draft admin reply for a Kenyan duka owner. */
export async function improveSupportReply(input: {
  ticketId: string;
  subject: string;
  tenantName: string;
  draft: string;
}): Promise<{ message: string; model: string; source: "gateway" | "heuristic" }> {
  const draft = input.draft.trim();
  if (!draft) throw new Error("Write a draft reply first");

  const fallback = {
    message: draft.endsWith(".") ? draft : `${draft}.`,
    model: "heuristic-v1",
    source: "heuristic" as const,
  };

  try {
    const { text, model } = await complete(
      "Rewrite this InuaBiz support reply for a Kenyan small-business owner (duka/chemist/eatery). JSON only: {message: string}. Warm, clear, under 280 chars. British English. Kiswahili mix OK if natural. Do not invent refunds or policy you were not told.",
      JSON.stringify(input),
      280,
    );
    const parsed = extractJson(text) as { message?: string };
    const message = parsed.message?.trim() || fallback.message;
    const out = { message, model, source: "gateway" as const };
    await logRun("support_improve_tone", { ticketId: input.ticketId }, out, model, 0.08);
    return out;
  } catch {
    await logRun(
      "support_improve_tone",
      { ticketId: input.ticketId },
      fallback,
      fallback.model,
      0,
    );
    return fallback;
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
