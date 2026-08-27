import { getServiceClient, getUserClient, handleOptions, jsonResponse } from "../_shared/cors.ts";
import { resolveSecret } from "../_shared/daraja.ts";

const DEFAULT_FROM = "InuaBiz <support@mail.inuabiz.co.ke>";
const DEFAULT_SITE = "https://www.inuabiz.co.ke";
const APP_URL = "https://app.inuabiz.co.ke";

type Body = {
  sale_id?: string;
  notification_id?: string;
  tenant_id?: string;
  template_id?: string;
  to?: string;
  reply_to?: string;
  vars?: Record<string, string>;
  idempotency_key?: string;
  email_receipt?: boolean;
};

/**
 * Outbound dispatcher: branded communication_templates via Resend.
 * Auth SMTP (invite / magic link / confirm) is configured in the Supabase dashboard
 * to the same sender: support@mail.inuabiz.co.ke.
 *
 * Body: { sale_id?, notification_id?, tenant_id?, template_id?, to?, vars?, idempotency_key?, email_receipt? }
 * Vendors may send to their own email. VENDOR_ADMIN may set `to` for invite-staff.
 */
Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const service = getServiceClient();
    const body = (await req.json().catch(() => ({}))) as Body;
    const authHeader = req.headers.get("Authorization") ?? "";
    const cronSecret = Deno.env.get("CRON_SECRET") ?? (await resolveSecret("CRON_SECRET"));
    const headerSecret = req.headers.get("x-cron-secret");
    const isCron = Boolean(cronSecret && headerSecret === cronSecret);
    const isService = isServiceRoleRequest(authHeader) || isCron;

    let callerId: string | null = null;
    let callerIsAdmin = isService;
    let callerRole: string | null = isService ? "service_role" : null;
    let callerEmail: string | null = null;
    if (!isService) {
      const userClient = getUserClient(authHeader);
      const {
        data: { user },
      } = await userClient.auth.getUser();
      if (!user) return jsonResponse({ error: "Unauthorized" }, 401);
      callerId = user.id;
      callerEmail = normalizeEmail(user.email);
      const { data: profile } = await service
        .from("profiles")
        .select("id, role")
        .eq("id", user.id)
        .maybeSingle();
      callerRole = (profile?.role as string | null) ?? null;
      callerIsAdmin = callerRole === "SUPER_ADMIN";
    }

    const requestedTo = normalizeEmail(body.to);
    const vendorTemplates = new Set([
      "welcome-trial",
      "onboarding-incomplete",
      "invite-staff",
      "sale-receipt",
      "fiscal-invoice",
      "extra-shop-paid",
      "extra-shop-failed",
      "subscription-paid",
      "payment-stk-failed",
      "trial-ending",
      "low-stock",
      "credit-reminder",
      "daily-summary",
      "wholesale-invoice",
      "invoice-overdue",
      "unclaimed-payment",
      "broadcast-maintenance",
      "contact-ack",
      "contact-inbound",
      "newsletter-welcome",
    ]);
    const buyerTemplates = new Set(["wholesale-invoice", "invoice-overdue", "invite-staff"]);
    if (
      requestedTo &&
      !callerIsAdmin &&
      requestedTo !== callerEmail &&
      !(body.template_id && buyerTemplates.has(body.template_id) && callerRole === "VENDOR_ADMIN")
    ) {
      return jsonResponse({ error: "Forbidden" }, 403);
    }
    if (requestedTo && !callerIsAdmin && body.template_id && !vendorTemplates.has(body.template_id)) {
      return jsonResponse({ error: "Forbidden" }, 403);
    }

    let tenantId = body.tenant_id ?? null;
    let saleId = body.sale_id ?? null;
    let toEmail: string | null = normalizeEmail(body.to);
    let profileId: string | null = callerId;

    if (body.notification_id) {
      const { data: note } = await service
        .from("notifications")
        .select("id, tenant_id, recipient_id, title, message")
        .eq("id", body.notification_id)
        .maybeSingle();
      if (note) {
        tenantId = (note.tenant_id as string | null) ?? tenantId;
        profileId = (note.recipient_id as string | null) ?? profileId;
      }
    }

    if (saleId) {
      const { data: sale } = await service
        .from("sales")
        .select("id, tenant_id, created_by")
        .eq("id", saleId)
        .maybeSingle();
      if (sale) {
        tenantId = (sale.tenant_id as string) ?? tenantId;
        profileId = (sale.created_by as string | null) ?? profileId;
      }
    }

    const { data: tenant } = tenantId
      ? await service
          .from("tenants")
          .select("id, name, legal_name, email")
          .eq("id", tenantId)
          .maybeSingle()
      : { data: null };

    if (!toEmail) toEmail = normalizeEmail(tenant?.email as string | null);

    if (!profileId && tenantId) {
      const { data: owner } = await service
        .from("profiles")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("role", "VENDOR_ADMIN")
        .limit(1)
        .maybeSingle();
      profileId = (owner?.id as string | null) ?? null;
    }

    if (!toEmail && profileId) {
      const { data: ownerUser } = await service.auth.admin.getUserById(profileId);
      toEmail = normalizeEmail(ownerUser.user?.email ?? null);
    }

    const { data: prefs } = profileId
      ? await service
          .from("notification_preferences")
          .select("channel_email, channel_sms, channel_whatsapp")
          .eq("profile_id", profileId)
          .maybeSingle()
      : { data: null };

    const emailOn = body.to ? true : prefs?.channel_email !== false;
    const smsOn = Boolean(prefs?.channel_sms);
    const waOn = Boolean(prefs?.channel_whatsapp);

    let invoice: {
      invoice_number?: string;
      total_amount?: number;
      vat_16_amount?: number;
      vat_0_amount?: number;
      exempt_amount?: number;
      customer_name?: string;
    } | null = null;
    if (saleId) {
      const { data } = await service
        .from("invoices")
        .select("invoice_number, total_amount, vat_16_amount, vat_0_amount, exempt_amount, customer_name")
        .eq("sale_id", saleId)
        .maybeSingle();
      invoice = data;
    }

    const skipped: string[] = [];
    if (smsOn) skipped.push("sms_no_gateway");
    if (waOn) skipped.push("whatsapp_no_gateway");

    const { data: settingsRows } = await service
      .from("platform_settings")
      .select("key, value")
      .in("key", ["email.from_email", "email.from_name", "email.notifications_enabled"]);
    const settings = Object.fromEntries((settingsRows ?? []).map((r) => [r.key, r.value]));
    const notificationsEnabled = settings["email.notifications_enabled"] !== false &&
      settings["email.notifications_enabled"] !== "false";

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!notificationsEnabled && !body.to) skipped.push("email_notifications_off");
    else if (!emailOn) skipped.push("email_pref_off");
    else if (!toEmail) skipped.push("no_tenant_email");
    else if (!resendKey) skipped.push("RESEND_API_KEY_unset");
    else {
      const shop = (tenant?.legal_name as string) || (tenant?.name as string) || "InuaBiz";
      const siteUrl = (Deno.env.get("PUBLIC_SITE_URL") ?? DEFAULT_SITE).replace(/\/$/, "");
      const confirmUrl = `${APP_URL}/verify`;
      const extraVars = body.vars ?? {};
      const fillVars: Record<string, string> = {
        SiteURL: siteUrl,
        ConfirmationURL: extraVars.ConfirmationURL || confirmUrl,
        shop: extraVars.shop || shop,
        amount: extraVars.amount || (invoice ? kes(invoice.total_amount) : ""),
        invoice_number: extraVars.invoice_number || invoice?.invoice_number || "",
        customer_name: extraVars.customer_name || invoice?.customer_name || "",
        Token: extraVars.Token || "",
        phone: extraVars.phone || "",
        reason: extraVars.reason || "",
        ...extraVars,
      };

      const fromName = stripJson(settings["email.from_name"]) || "InuaBiz";
      const fromEmail = stripJson(settings["email.from_email"]) || "support@mail.inuabiz.co.ke";
      const from = Deno.env.get("RESEND_FROM") ?? `${fromName} <${fromEmail}>` ?? DEFAULT_FROM;

      const wantReceipt = body.email_receipt === true;
      const templateIds: string[] = [];
      if (body.template_id) {
        templateIds.push(body.template_id);
      } else if (saleId && wantReceipt) {
        templateIds.push("sale-receipt");
        if (invoice?.invoice_number) templateIds.push("fiscal-invoice");
      } else if (saleId && !wantReceipt) {
        skipped.push("email_receipt_off");
      } else {
        templateIds.push("welcome-trial");
      }

      if (!templateIds.length) {
        return jsonResponse({ ok: true, skipped });
      }

      const sent: Array<{ id?: string; template_id: string }> = [];
      for (const templateId of templateIds) {
        const { data: tpl } = await service
          .from("communication_templates")
          .select("id, subject, html")
          .eq("id", templateId)
          .maybeSingle();

        if (!tpl?.html) {
          skipped.push(`template_missing:${templateId}`);
          continue;
        }

        const html = personalizeHtml(templateId, fillTemplate(tpl.html as string, fillVars), fillVars);
        const subject = subjectFor(
          templateId,
          (tpl.subject as string | undefined) ?? `InuaBiz — ${shop}`,
          fillVars,
          invoice?.invoice_number,
          shop,
        );

        const idempotencyKey = (
          body.idempotency_key
            ? `${body.idempotency_key}/${templateId}`
            : saleId
              ? `${templateId}/${saleId}`
              : `outbound/${templateId}/${toEmail}/${crypto.randomUUID()}`
        ).slice(0, 256);

        const replyTo = normalizeEmail(body.reply_to);
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendKey}`,
            "Content-Type": "application/json",
            "Idempotency-Key": idempotencyKey,
          },
          body: JSON.stringify({
            from,
            to: [toEmail],
            ...(replyTo ? { reply_to: replyTo } : {}),
            subject,
            html,
            text: htmlToText(html),
            tags: [
              { name: "template", value: templateId },
              { name: "app", value: "inuabiz" },
            ],
          }),
        });
        const payload = await res.json().catch(() => ({})) as { id?: string; message?: string };
        if (!res.ok) {
          console.error("Resend failed", res.status, payload);
          await service.from("email_send_log").insert({
            user_id: callerId,
            to_email: toEmail,
            template_id: templateId,
            subject,
            status: "error",
            error: String(payload.message ?? res.status),
            metadata: { source: body.to ? "admin-test" : "outbound" },
          });
          return jsonResponse({ ok: false, error: "resend_failed", skipped, sent }, 502);
        }

        await service.from("email_send_log").insert({
          user_id: callerId,
          to_email: toEmail,
          template_id: templateId,
          subject,
          status: "sent",
          provider_id: payload.id ?? null,
          metadata: {
            source: body.to ? "admin-test" : "outbound",
            sale_id: saleId,
            idempotency_key: idempotencyKey,
          },
        });
        sent.push({ id: payload.id, template_id: templateId });
      }

      if (!sent.length) {
        return jsonResponse({ ok: false, error: "template_missing", skipped }, 400);
      }
      return jsonResponse({
        ok: true,
        skipped,
        id: sent[0]?.id,
        template_id: sent[0]?.template_id,
        sent,
      });
    }

    return jsonResponse({ ok: true, skipped });
  } catch (err) {
    console.error(err);
    return jsonResponse({ error: err instanceof Error ? err.message : "Unexpected error" }, 500);
  }
});

function isServiceRoleRequest(authHeader: string): boolean {
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return false;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (serviceKey && token === serviceKey) return true;
  const parts = token.split(".");
  if (parts.length < 2) return false;
  try {
    const payload = JSON.parse(
      atob(parts[1].replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (parts[1].length % 4)) % 4)),
    );
    return payload.role === "service_role";
  } catch {
    return false;
  }
}

function normalizeEmail(value: string | null | undefined): string | null {
  const trimmed = value?.trim().toLowerCase() ?? "";
  return trimmed.includes("@") ? trimmed : null;
}

function stripJson(value: unknown): string {
  if (typeof value === "string") return value.replace(/^"|"$/g, "");
  if (value == null) return "";
  return String(value).replace(/^"|"$/g, "");
}

function kes(amount: number | undefined): string {
  if (amount == null || Number.isNaN(Number(amount))) return "";
  return `KES ${Number(amount).toLocaleString("en-KE")}`;
}

function subjectFor(
  templateId: string,
  fallback: string,
  vars: Record<string, string>,
  invoiceNumber: string | undefined,
  shop: string,
): string {
  if ((templateId === "sale-receipt" || templateId === "fiscal-invoice") && invoiceNumber) {
    return `${invoiceNumber} — ${shop}`;
  }
  if (templateId === "low-stock" && vars.product) return `${vars.product} is running out`;
  if (templateId === "credit-reminder" && vars.customer_name && vars.amount) {
    return `${vars.customer_name} still owes ${vars.amount}`;
  }
  if (templateId === "daily-summary" && vars.amount) {
    return `${vars.day || "Yesterday"} till: ${vars.amount} · ${vars.count || "0"} sales`;
  }
  if (templateId === "wholesale-invoice" && vars.invoice_number) {
    return `Invoice ${vars.invoice_number} from ${shop}`;
  }
  if (templateId === "invoice-overdue" && vars.invoice_number) {
    return `${vars.invoice_number} is overdue${vars.amount ? ` — ${vars.amount}` : ""}`;
  }
  if (templateId === "unclaimed-payment" && vars.amount) {
    return `${vars.amount} unmatched on your till`;
  }
  if (templateId === "broadcast-maintenance" && vars.headline) return vars.headline;
  if (templateId === "contact-ack") return "We got your note — InuaBiz";
  if (templateId === "contact-inbound") {
    return vars.customer_name ? `New contact: ${vars.customer_name}` : "New website contact";
  }
  if (templateId === "newsletter-welcome") return "You're on the InuaBiz list";
  return fallback;
}

function personalizeHtml(templateId: string, html: string, vars: Record<string, string>): string {
  const swaps: Array<[string, string]> = [];
  if (vars.product) swaps.push(["Blue Band 250g", vars.product]);
  if (vars.customer_name) {
    swaps.push(["Ali Hassan", vars.customer_name]);
    swaps.push(["Kariobangi Wholesalers", vars.customer_name]);
    swaps.push(["Peter O.", vars.customer_name]);
    swaps.push(["James Mwangi", vars.customer_name]);
    swaps.push(["Faith Wanjiku", vars.customer_name]);
  }
  if (vars.amount) {
    swaps.push(["KES 12,400", vars.amount]);
    swaps.push(["KES 18,600", vars.amount]);
    swaps.push(["KES 1,200", vars.amount]);
    swaps.push(["KES 905", vars.amount]);
    swaps.push(["KES 760", vars.amount]);
  }
  if (vars.invoice_number) {
    swaps.push(["INV-2041", vars.invoice_number]);
    swaps.push(["INB-2026-0042", vars.invoice_number]);
  }
  if (vars.shop) {
    swaps.push(["Mama Njoroge's Duka", vars.shop]);
    swaps.push(["Mama Njoroge&#39;s Duka", vars.shop.replace(/'/g, "&#39;")]);
  }
  if (vars.on_hand) swaps.push(["5 packs", `${vars.on_hand} left`]);
  if (vars.due) swaps.push(["12 Sep", vars.due]);
  if (vars.mpesa) swaps.push(["KES 9,800", vars.mpesa]);
  if (vars.topic) swaps.push(["Wholesale invoices", vars.topic]);
  if (vars.ref) swaps.push(["TKT-1184", vars.ref]);
  if (vars.visitor_email) swaps.push(["njoroge@example.com", vars.visitor_email]);
  if (vars.visitor_phone) swaps.push(["0712 345 678", vars.visitor_phone]);
  if (vars.count) swaps.push(["34 sales", `${vars.count} sales`]);
  if (vars.day) swaps.push(["Saturday", vars.day]);
  if (templateId === "broadcast-maintenance" && vars.body) {
    swaps.push([
      "We will take InuaBiz offline for a short database upgrade. You can still accept M-Pesa on the till number. Sales will sync when we are back.",
      vars.body,
    ]);
  }
  if (templateId === "broadcast-maintenance" && vars.headline) {
    swaps.push(["Till pause", vars.headline.split(" ")[0] ?? vars.headline]);
  }
  let out = html;
  for (const [from, to] of swaps) {
    if (from && to) out = out.replaceAll(from, to);
  }
  return out;
}

function fillTemplate(html: string, vars: Record<string, string>): string {
  let out = html;
  for (const [key, value] of Object.entries(vars)) {
    if (!value) continue;
    out = out.replaceAll(`{{ .${key} }}`, value);
    out = out.replaceAll(`{{.${key}}}`, value);
    out = out.replaceAll(`{{ ${key} }}`, value);
    out = out.replaceAll(`{{${key}}}`, value);
  }
  return out;
}

function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 4000);
}
