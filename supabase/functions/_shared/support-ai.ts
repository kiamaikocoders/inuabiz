import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { dispatchOutbound } from "./outbound.ts";

export type SupportCategory =
  | "payment"
  | "pos_hardware"
  | "inventory"
  | "billing"
  | "other";

export type SupportPriority = "low" | "medium" | "high" | "urgent";

export type SupportStatus =
  | "open"
  | "in_progress"
  | "ai_handling"
  | "resolved"
  | "closed";

export type TriageResult = {
  category: SupportCategory;
  priority: SupportPriority;
  status: SupportStatus;
  ai_summary: string;
  auto_reply: string | null;
  internal_note: string;
  escalated: boolean;
};

type Service = SupabaseClient;

function stripJson(value: unknown): string {
  if (typeof value === "string") return value.replace(/^"|"$/g, "");
  if (value == null) return "";
  return String(value).replace(/^"|"$/g, "");
}

async function opsInbox(service: Service): Promise<string> {
  const { data } = await service
    .from("platform_settings")
    .select("value")
    .eq("key", "email.ops_inbox")
    .maybeSingle();
  const inbox = stripJson(data?.value).trim();
  return inbox.includes("@") ? inbox : "hello@inuabiz.co.ke";
}

const KB: Array<{
  match: RegExp;
  category: SupportCategory;
  reply: string;
}> = [
  {
    match: /x-?report|daily report|end of day|z-?report/i,
    category: "pos_hardware",
    reply:
      "Open Sales → pick today’s date → Export ledger (CSV). For a quick till read, Dashboard shows today’s paid total. Need a printed receipt? Complete a sale and tap Print on the receipt screen.",
  },
  {
    match: /add product|new product|inventory|stock/i,
    category: "inventory",
    reply:
      "Inventory → Add product. Enter name, cost, selling price and reorder level. Barcode scanning is on the POS search bar when your device camera is allowed.",
  },
  {
    match: /trial|subscribe|billing|3000|subscription/i,
    category: "billing",
    reply:
      "Billing → Subscribe for KES 3,000 per shop per month. Trials last 3 days. PayHero STK charges your M-Pesa; the till stays active once payment is COMPLETE.",
  },
];

function heuristicTriage(subject: string, message: string): TriageResult {
  const text = `${subject} ${message}`.toLowerCase();
  let category: SupportCategory = "other";
  let priority: SupportPriority = "medium";

  if (/mpesa|payment|stk|paybill|till|pochi|c2b|webhook|didn.t reflect|not green/i.test(text)) {
    category = "payment";
    priority = "high";
  } else if (/printer|barcode|scan|hardware|tablet|phone|crash|slow/i.test(text)) {
    category = "pos_hardware";
    priority = "medium";
  } else if (/stock|inventory|product|reorder|expiry/i.test(text)) {
    category = "inventory";
    priority = "medium";
  } else if (/bill|invoice|subscription|trial|3000/i.test(text)) {
    category = "billing";
    priority = "medium";
  }

  if (/urgent|down|cannot sell|blocked|lost money|fraud/i.test(text)) {
    priority = "urgent";
  }

  for (const entry of KB) {
    if (entry.match.test(text)) {
      return {
        category: entry.category,
        priority: "low",
        status: "ai_handling",
        ai_summary: `How-to request: ${subject.slice(0, 120)}`,
        auto_reply: entry.reply,
        internal_note: "Auto-answered from knowledge base heuristic.",
        escalated: false,
      };
    }
  }

  const escalated = priority === "high" || priority === "urgent" || category === "payment";
  return {
    category,
    priority,
    status: escalated ? "open" : "ai_handling",
    ai_summary: `${category} issue: ${message.slice(0, 200)}`,
    auto_reply: escalated
      ? null
      : "Thanks — we received your message. A human from InuaBiz will follow up shortly if this needs more than a quick fix.",
    internal_note: escalated
      ? `Escalate: ${priority} ${category}. Review M-Pesa logs and tenant payment destination.`
      : "Low-complexity ticket — AI sent holding reply.",
    escalated,
  };
}

import { vercelAiChat } from "./vercel-ai.ts";

export async function triageSupportTicket(input: {
  subject: string;
  message: string;
  context: Record<string, unknown>;
}): Promise<TriageResult> {
  try {
    const llm = await vercelAiChat({
      json: true,
      maxTokens: 500,
      messages: [
        {
          role: "system",
          content:
            "You triage InuaBiz POS support tickets for Kenyan dukas (M-Pesa STK, inventory, billing KES 3,000/shop). Reply JSON only: {category: payment|pos_hardware|inventory|billing|other, priority: low|medium|high|urgent, ai_summary: string, auto_reply: string|null, internal_note: string, escalated: boolean}. auto_reply is a short helpful answer if the issue is FAQ/how-to; null if human must handle (payment failures, money missing, account locked). escalated true when financial or urgent.",
        },
        {
          role: "user",
          content: JSON.stringify({
            subject: input.subject,
            message: input.message,
            context: input.context,
          }),
        },
      ],
    });
    if (!llm) return heuristicTriage(input.subject, input.message);

    const parsed = JSON.parse(llm.text) as Partial<TriageResult>;
    const category = (parsed.category ?? "other") as SupportCategory;
    const priority = (parsed.priority ?? "medium") as SupportPriority;
    const escalated = Boolean(parsed.escalated) || priority === "urgent" || priority === "high";
    return {
      category,
      priority,
      status: escalated && !parsed.auto_reply ? "open" : "ai_handling",
      ai_summary: String(parsed.ai_summary ?? input.message.slice(0, 200)),
      auto_reply: parsed.auto_reply?.trim() || null,
      internal_note: String(parsed.internal_note ?? "AI triage complete."),
      escalated,
    };
  } catch (e) {
    console.error("triageSupportTicket LLM fallback", e);
    return heuristicTriage(input.subject, input.message);
  }
}

async function notifySuperAdmins(
  service: Service,
  title: string,
  message: string,
  ticketId: string,
  priority: string,
  extras?: { subject?: string; shop?: string },
): Promise<void> {
  const { data: admins } = await service
    .from("profiles")
    .select("id")
    .eq("role", "SUPER_ADMIN")
    .limit(20);
  const notePriority = priority === "urgent" || priority === "high" ? "HIGH" : "NORMAL";
  const url = `/admin/tickets?ticket=${ticketId}`;
  for (const admin of admins ?? []) {
    await service.from("notifications").insert({
      recipient_id: admin.id,
      recipient_role: "SUPER_ADMIN",
      title,
      message: message.slice(0, 240),
      type: "SYSTEM",
      priority: notePriority,
      metadata: { ticket_id: ticketId, href: url, url },
    });
  }

  const to = await opsInbox(service);
  await dispatchOutbound({
    template_id: "support-ticket-opened",
    to,
    idempotency_key: `support-opened/${ticketId}/${Date.now()}`,
    vars: {
      ticket_id: ticketId,
      subject: extras?.subject ?? title,
      shop: extras?.shop ?? "Vendor",
      priority,
      message: message.slice(0, 800),
      cta_url: `https://inuabiz.co.ke${url}`,
    },
  });
}

async function notifyTenantProfiles(
  service: Service,
  tenantId: string,
  title: string,
  message: string,
  ticketId: string,
): Promise<void> {
  const { data: profiles } = await service
    .from("profiles")
    .select("id")
    .eq("tenant_id", tenantId)
    .neq("role", "SUPER_ADMIN")
    .limit(10);
  const url = `/app/support?ticket=${ticketId}`;
  for (const p of profiles ?? []) {
    await service.from("notifications").insert({
      tenant_id: tenantId,
      recipient_id: p.id,
      recipient_role: "VENDOR_ADMIN",
      title,
      message: message.slice(0, 240),
      type: "SYSTEM",
      priority: "NORMAL",
      metadata: { ticket_id: ticketId, href: url, url },
    });
  }

  const { data: tenant } = await service
    .from("tenants")
    .select("email, name")
    .eq("id", tenantId)
    .maybeSingle();
  const to = (tenant?.email as string | null) ?? undefined;
  if (to?.includes("@")) {
    await dispatchOutbound({
      tenant_id: tenantId,
      template_id: "support-ticket-reply",
      to,
      idempotency_key: `support-reply/${ticketId}/${Date.now()}`,
      vars: {
        ticket_id: ticketId,
        message: message.slice(0, 800),
        shop: String(tenant?.name ?? ""),
        cta_url: `https://inuabiz.co.ke${url}`,
      },
    });
  }
}

export { notifySuperAdmins, notifyTenantProfiles };
