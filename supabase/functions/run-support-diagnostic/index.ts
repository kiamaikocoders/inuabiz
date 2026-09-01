import {
  getServiceClient,
  getUserClient,
  handleOptions,
  jsonResponse,
  requireAuthUser,
} from "../_shared/cors.ts";
import {
  darajaRegisterC2bUrls,
  functionsPublicBase,
} from "../_shared/daraja.ts";
import {
  mapPayHeroStatus,
  payheroTransactionStatus,
} from "../_shared/payhero.ts";
import {
  applyCompleteSubscription,
  applyShopAddon,
} from "../_shared/subscription-billing.ts";

export type SupportDiagnosticAction =
  | "poll_pending_payments"
  | "verify_mpesa_setup"
  | "register_c2b_webhooks";

/**
 * Super-admin one-click diagnostics from the support ticket desk.
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
      .select("id, role")
      .eq("id", auth.user.id)
      .single();
    if (profile?.role !== "SUPER_ADMIN") {
      return jsonResponse({ error: "Super admin only" }, 403);
    }

    const body = (await req.json().catch(() => ({}))) as {
      ticket_id?: string;
      action?: SupportDiagnosticAction;
    };
    const ticketId = String(body.ticket_id ?? "");
    const action = body.action;
    if (!ticketId || !action) {
      return jsonResponse({ error: "ticket_id and action required" }, 400);
    }

    const service = getServiceClient();
    const { data: ticket } = await service
      .from("support_tickets")
      .select("id, tenant_id, subject, category")
      .eq("id", ticketId)
      .single();
    if (!ticket) return jsonResponse({ error: "Ticket not found" }, 404);

    const tenantId = ticket.tenant_id as string;
    let summary = "";
    let details: unknown = null;

    if (action === "register_c2b_webhooks") {
      const base = functionsPublicBase();
      const result = await darajaRegisterC2bUrls({
        confirmationUrl: `${base}/daraja-c2b-confirmation`,
        validationUrl: `${base}/daraja-c2b-validation`,
      });
      summary = "Re-registered Safaricom C2B confirmation + validation URLs.";
      details = result;
    } else if (action === "verify_mpesa_setup") {
      const [{ data: destinations }, { data: devices }, { data: recentPayments }, { data: tenant }, { data: sub }] =
        await Promise.all([
          service
            .from("tenant_payment_destinations")
            .select("destination_type, account_number, account_name, is_primary")
            .eq("tenant_id", tenantId)
            .order("is_primary", { ascending: false }),
          service
            .from("companion_devices")
            .select("id, label, last_seen_at, revoked_at, expected_msisdn")
            .eq("tenant_id", tenantId)
            .is("revoked_at", null)
            .order("created_at", { ascending: false })
            .limit(5),
          service
            .from("payment_transactions")
            .select("id, invoice_id, status, purpose, payment_channel, amount, created_at, sale_id")
            .eq("tenant_id", tenantId)
            .order("created_at", { ascending: false })
            .limit(8),
          service.from("tenants").select("name, status, access_until").eq("id", tenantId).single(),
          service
            .from("subscriptions")
            .select("status, amount, current_period_end")
            .eq("tenant_id", tenantId)
            .maybeSingle(),
        ]);

      const destCount = destinations?.length ?? 0;
      const pending = (recentPayments ?? []).filter((p) => p.status === "PENDING").length;
      const failed = (recentPayments ?? []).filter((p) => p.status === "FAILED").length;
      summary =
        destCount === 0
          ? `${tenant?.name ?? "Vendor"} has no M-Pesa destination on file — onboarding may be incomplete.`
          : `${tenant?.name ?? "Vendor"}: ${destCount} destination(s), ${devices?.length ?? 0} companion device(s), ${pending} pending / ${failed} failed recent payments. Subscription ${sub?.status ?? tenant?.status ?? "—"}.`;
      details = {
        tenant,
        subscription: sub,
        destinations,
        companion_devices: devices,
        recent_payments: recentPayments,
      };
    } else if (action === "poll_pending_payments") {
      const { data: pending } = await service
        .from("payment_transactions")
        .select("id, invoice_id, purpose, tenant_id, sale_id, api_ref, payment_channel, tracking_id, metadata, status")
        .eq("tenant_id", tenantId)
        .eq("status", "PENDING")
        .order("created_at", { ascending: false })
        .limit(10);

      const results: Array<{ invoice_id: string; state: string }> = [];

      for (const row of pending ?? []) {
        try {
          const channel = String(row.payment_channel ?? "");
          let mapped: "PENDING" | "COMPLETE" | "FAILED" | "CANCELLED" = "PENDING";
          let payload: unknown = null;

          if (channel === "PAYHERO") {
            const statusPayload = await payheroTransactionStatus(String(row.invoice_id));
            payload = statusPayload;
            mapped = mapPayHeroStatus(statusPayload.status);
          } else if (channel === "MPESA_STK") {
            const { darajaStkQuery } = await import("../_shared/daraja.ts");
            const checkoutId = String(row.tracking_id ?? row.invoice_id);
            const queried = await darajaStkQuery(checkoutId);
            payload = queried.raw;
            mapped =
              queried.outcome === "COMPLETE"
                ? "COMPLETE"
                : queried.outcome === "FAILED"
                  ? "FAILED"
                  : "PENDING";
          } else {
            results.push({ invoice_id: row.invoice_id as string, state: "SKIP" });
            continue;
          }

          if (mapped !== "PENDING") {
            await service
              .from("payment_transactions")
              .update({ status: mapped, raw_webhook_payload: payload })
              .eq("id", row.id);

            if (mapped === "COMPLETE" && row.purpose === "SAAS_SUBSCRIPTION" && row.tenant_id) {
              const meta = row.metadata as Record<string, unknown> | null;
              await applyCompleteSubscription(
                service,
                row.tenant_id as string,
                row.invoice_id as string,
                null,
                {
                  id: row.id as string,
                  purpose: row.purpose as string,
                  amount: null,
                  account: null,
                  api_ref: (row.api_ref as string | null) ?? null,
                  metadata: meta,
                },
              );
              if (meta?.kind === "SHOP_ADDON") {
                await applyShopAddon(service, row.tenant_id as string, meta);
              }
              await service
                .from("subscription_payments")
                .update({ status: "SUCCESS" })
                .eq("payhero_reference", row.invoice_id);
            }
          }

          results.push({ invoice_id: row.invoice_id as string, state: mapped });
        } catch (e) {
          console.error("poll tenant payment", row.invoice_id, e);
          results.push({ invoice_id: row.invoice_id as string, state: "ERROR" });
        }
      }

      const completed = results.filter((r) => r.state === "COMPLETE").length;
      summary =
        results.length === 0
          ? "No pending payments to poll for this vendor."
          : `Polled ${results.length} pending payment(s): ${completed} completed, ${results.filter((r) => r.state === "FAILED").length} failed.`;
      details = results;
    } else {
      return jsonResponse({ error: "Unknown action" }, 400);
    }

    const note = `[Diagnostic: ${action}]\n${summary}${details ? `\n${JSON.stringify(details, null, 2).slice(0, 1500)}` : ""}`;
    await service.from("support_ticket_internal_notes").insert({
      ticket_id: ticketId,
      admin_id: profile!.id,
      note,
    });

    return jsonResponse({ ok: true, action, summary, details });
  } catch (err) {
    console.error(err);
    return jsonResponse(
      { error: err instanceof Error ? err.message : "Unexpected error" },
      500,
    );
  }
});
