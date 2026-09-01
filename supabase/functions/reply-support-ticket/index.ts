import {
  getServiceClient,
  getUserClient,
  handleOptions,
  jsonResponse,
  requireAuthUser,
} from "../_shared/cors.ts";
import { notifySuperAdmins, notifyTenantProfiles } from "../_shared/support-ai.ts";

/**
 * Vendor or super-admin posts a reply on a support ticket thread.
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
    if (!profile) return jsonResponse({ error: "Profile not found" }, 404);

    const body = (await req.json().catch(() => ({}))) as {
      ticket_id?: string;
      message?: string;
    };
    const ticketId = String(body.ticket_id ?? "");
    const message = String(body.message ?? "").trim().slice(0, 4000);
    if (!ticketId || message.length < 1) {
      return jsonResponse({ error: "ticket_id and message required" }, 400);
    }

    const service = getServiceClient();
    const { data: ticket } = await service
      .from("support_tickets")
      .select("id, tenant_id, subject, status")
      .eq("id", ticketId)
      .single();
    if (!ticket) return jsonResponse({ error: "Ticket not found" }, 404);

    const isAdmin = profile.role === "SUPER_ADMIN";
    if (!isAdmin && ticket.tenant_id !== profile.tenant_id) {
      return jsonResponse({ error: "Forbidden" }, 403);
    }

    const senderType = isAdmin ? "admin" : "vendor";
    await service.from("support_ticket_messages").insert({
      ticket_id: ticketId,
      tenant_id: ticket.tenant_id,
      sender_type: senderType,
      sender_id: profile.id,
      message,
    });

    const nextStatus =
      senderType === "admin"
        ? ticket.status === "closed" ? "closed" : "in_progress"
        : ticket.status === "resolved" || ticket.status === "closed"
          ? "open"
          : ticket.status;

    await service
      .from("support_tickets")
      .update({ status: nextStatus, updated_at: new Date().toISOString() })
      .eq("id", ticketId);

    if (senderType === "admin") {
      await notifyTenantProfiles(
        service,
        ticket.tenant_id as string,
        "Support replied",
        message.slice(0, 120),
        ticketId,
      );
    } else {
      await notifySuperAdmins(
        service,
        `Reply: ${String(ticket.subject).slice(0, 50)}`,
        message.slice(0, 120),
        ticketId,
        "medium",
      );
    }

    return jsonResponse({ ok: true, status: nextStatus });
  } catch (err) {
    console.error(err);
    return jsonResponse(
      { error: err instanceof Error ? err.message : "Unexpected error" },
      500,
    );
  }
});
