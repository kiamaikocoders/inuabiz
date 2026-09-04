import {
  getServiceClient,
  getUserClient,
  handleOptions,
  jsonResponse,
  requireAuthUser,
} from "../_shared/cors.ts";
import {
  notifySuperAdmins,
  triageSupportTicket,
  type SupportCategory,
} from "../_shared/support-ai.ts";

/**
 * Vendor opens a support ticket. Inserts thread + runs AI triage (OpenAI or heuristic).
 */
Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const auth = await requireAuthUser(req);
  if (auth instanceof Response) return auth;

  try {
    const userClient = getUserClient(req.headers.get("Authorization")!);
    const { data: profile } = await userClient
      .from("profiles")
      .select("id, tenant_id, role")
      .eq("id", auth.user.id)
      .single();

    if (!profile?.tenant_id) {
      return jsonResponse({ error: "Complete onboarding before opening a ticket" }, 400);
    }
    if (profile.role === "SUPER_ADMIN") {
      return jsonResponse({ error: "Use the admin ticket desk" }, 403);
    }

    const body = (await req.json().catch(() => ({}))) as {
      subject?: string;
      message?: string;
      category?: string;
      context?: Record<string, unknown>;
    };
    const subject = String(body.subject ?? "").trim().slice(0, 200);
    const message = String(body.message ?? "").trim().slice(0, 4000);
    if (subject.length < 3 || message.length < 8) {
      return jsonResponse({ error: "Subject and message are required" }, 400);
    }

    const vendorCategory = body.category as SupportCategory | undefined;
    const context = {
      ...(body.context ?? {}),
      page: body.context?.page ?? null,
      user_agent: req.headers.get("user-agent"),
    };

    const service = getServiceClient();
    const { data: ticket, error: tErr } = await service
      .from("support_tickets")
      .insert({
        tenant_id: profile.tenant_id,
        created_by: profile.id,
        subject,
        category: vendorCategory ?? "other",
        status: "open",
      })
      .select("id")
      .single();
    if (tErr || !ticket) throw tErr ?? new Error("Could not create ticket");

    await service.from("support_ticket_messages").insert({
      ticket_id: ticket.id,
      tenant_id: profile.tenant_id,
      sender_type: "vendor",
      sender_id: profile.id,
      message,
      attachments: body.context?.attachments ?? [],
    });

    const triage = await triageSupportTicket({ subject, message, context });

    const finalCategory = vendorCategory ?? triage.category;
    const status = triage.auto_reply && !triage.escalated ? "ai_handling" : triage.status;

    await service
      .from("support_tickets")
      .update({
        category: finalCategory,
        priority: triage.priority,
        status,
        ai_summary: triage.ai_summary,
        context,
      })
      .eq("id", ticket.id);

    if (triage.internal_note) {
      await service.from("support_ticket_internal_notes").insert({
        ticket_id: ticket.id,
        admin_id: null,
        note: triage.internal_note,
      });
    }

    if (triage.auto_reply) {
      await service.from("support_ticket_messages").insert({
        ticket_id: ticket.id,
        tenant_id: profile.tenant_id,
        sender_type: "ai_assistant",
        sender_id: null,
        message: triage.auto_reply,
      });
    }

    if (triage.escalated || !triage.auto_reply) {
      const { data: tenant } = await service
        .from("tenants")
        .select("name")
        .eq("id", profile.tenant_id)
        .maybeSingle();
      await notifySuperAdmins(
        service,
        `Support: ${subject.slice(0, 60)}`,
        `${tenant?.name ?? "Vendor"} — ${message.slice(0, 120)}`,
        ticket.id,
        triage.priority,
        { subject, shop: String(tenant?.name ?? "Vendor") },
      );
    }

    return jsonResponse({
      ok: true,
      ticket_id: ticket.id,
      status,
      ai_reply: triage.auto_reply,
      escalated: triage.escalated,
    });
  } catch (err) {
    console.error(err);
    return jsonResponse(
      { error: err instanceof Error ? err.message : "Unexpected error" },
      500,
    );
  }
});
