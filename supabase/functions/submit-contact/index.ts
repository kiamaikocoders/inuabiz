import { getServiceClient, handleOptions, jsonResponse } from "../_shared/cors.ts";
import { dispatchOutbound } from "../_shared/outbound.ts";

/**
 * Public contact form. Sends contact-ack to the visitor and stores the lead.
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
        metadata: { contact_id: row.id, email, phone },
      });
    }

    if (email.includes("@")) {
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
      await dispatchOutbound({
        template_id: "contact-ack",
        to: email,
        idempotency_key: `contact-ack/${row.id}`,
        vars: {
          customer_name: name,
          topic: topicLabel[topic] ?? topic,
          ref: `TKT-${String(row.id).replace(/-/g, "").slice(0, 6).toUpperCase()}`,
        },
      });
    }

    return jsonResponse({ ok: true, id: row.id });
  } catch (err) {
    console.error(err);
    return jsonResponse({ error: err instanceof Error ? err.message : "Could not send" }, 500);
  }
});
