import { getServiceClient, handleOptions, jsonResponse } from "../_shared/cors.ts";
import { dispatchOutbound } from "../_shared/outbound.ts";

/**
 * Public contact form. Stores the lead, emails ops (WYA inbox pattern + Resend),
 * acks the visitor, and notifies SUPER_ADMIN in-app.
 */
Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const body = (await req.json().catch(() => ({}))) as {
      name?: string;
      phone?: string;
      email?: string;
      topic?: string;
      message?: string;
    };
    const name = String(body.name ?? "").trim().slice(0, 120);
    const message = String(body.message ?? "").trim().slice(0, 4000);
    const email = String(body.email ?? "").trim().toLowerCase();
    const phone = String(body.phone ?? "").trim().slice(0, 32);
    const topic = String(body.topic ?? "other").trim().slice(0, 40);
    if (name.length < 2 || message.length < 8) {
      return jsonResponse({ error: "Name and message are required" }, 400);
    }
    if (email && !email.includes("@")) {
      return jsonResponse({ error: "Enter a valid email" }, 400);
    }

    const service = getServiceClient();
    const { data: row, error } = await service
      .from("contact_messages")
      .insert({
        name,
        phone: phone || null,
        email: email.includes("@") ? email : null,
        topic,
        message,
        status: "new",
      })
      .select("id")
      .single();
    if (error) throw error;

    const { data: admins } = await service
      .from("profiles")
      .select("id")
      .eq("role", "SUPER_ADMIN")
      .limit(20);
    for (const admin of admins ?? []) {
      await service.from("notifications").insert({
        recipient_id: admin.id,
        recipient_role: "SUPER_ADMIN",
        title: `Contact: ${name}`,
        message: `${topic} — ${message.slice(0, 180)}`,
        type: "SYSTEM",
        priority: "NORMAL",
        metadata: { contact_id: row.id, email, phone, href: "/admin/inbox" },
      });
    }

    const topicLabel: Record<string, string> = {
      demo: "Book a demo",
      onboarding: "Onboarding / setup fee",
      mpesa: "M-Pesa / payment setup",
      etims: "Compliance / ETR",
      compliance: "Compliance / ETR",
      enterprise: "Enterprise license",
      billing: "Billing question",
      other: "Something else",
    };
    const topicText = topicLabel[topic] ?? topic;
    const ref = `TKT-${String(row.id).replace(/-/g, "").slice(0, 6).toUpperCase()}`;
    const note = escapeHtml(message).replace(/\n/g, "<br />");

    if (email.includes("@")) {
      await dispatchOutbound({
        template_id: "contact-ack",
        to: email,
        idempotency_key: `contact-ack/${row.id}`,
        vars: {
          customer_name: name,
          topic: topicText,
          ref,
        },
      });
    }

    const ops = await collectOpsEmails(service);
    for (const to of ops) {
      if (to === email) continue;
      await dispatchOutbound({
        template_id: "contact-inbound",
        to,
        reply_to: email.includes("@") ? email : undefined,
        idempotency_key: `contact-inbound/${row.id}/${to}`,
        vars: {
          customer_name: name,
          topic: topicText,
          visitor_email: email.includes("@") ? email : "not given",
          visitor_phone: phone || "not given",
          note,
          ref,
        },
      });
    }

    return jsonResponse({ ok: true, id: row.id });
  } catch (err) {
    console.error(err);
    return jsonResponse({ error: err instanceof Error ? err.message : "Could not send" }, 500);
  }
});

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function stripJson(value: unknown): string {
  if (typeof value === "string") return value.replace(/^"|"$/g, "");
  if (value == null) return "";
  return String(value).replace(/^"|"$/g, "");
}

async function collectOpsEmails(
  service: ReturnType<typeof getServiceClient>,
): Promise<string[]> {
  const emails = new Set<string>();
  const { data: settings } = await service
    .from("platform_settings")
    .select("key, value")
    .eq("key", "email.ops_inbox")
    .maybeSingle();
  const inbox = stripJson(settings?.value).trim().toLowerCase() || "hello@inuabiz.co.ke";
  if (inbox.includes("@")) emails.add(inbox);

  const { data: admins } = await service
    .from("profiles")
    .select("id")
    .eq("role", "SUPER_ADMIN")
    .limit(20);
  for (const admin of admins ?? []) {
    const { data } = await service.auth.admin.getUserById(admin.id);
    const em = data.user?.email?.trim().toLowerCase();
    if (em?.includes("@")) emails.add(em);
  }
  return [...emails];
}
