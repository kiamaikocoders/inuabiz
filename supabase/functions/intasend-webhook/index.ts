import {
  getServiceClient,
  handleOptions,
  jsonResponse,
  mapIntaSendState,
} from "../_shared/cors.ts";
import { subscriptionAmountKes } from "../_shared/daraja.ts";

type WebhookPayload = {
  invoice_id?: string;
  state?: string;
  provider?: string;
  charges?: string;
  net_amount?: string;
  amount?: string | number;
  currency?: string;
  account?: string;
  api_ref?: string;
  host?: string;
  challenge?: string;
  tracking_id?: string;
  [k: string]: unknown;
};

function parseUuidFromApiRef(apiRef: string | undefined): {
  kind: "saas" | "sale" | "unknown";
  id: string | null;
} {
  if (!apiRef) return { kind: "unknown", id: null };
  if (apiRef.startsWith("saas_")) {
    const parts = apiRef.split("_");
    // saas_<uuid>_<timestamp>
    const id = parts.slice(1, -1).join("_") || parts[1] || null;
    return { kind: "saas", id };
  }
  if (apiRef.startsWith("sale_")) {
    return { kind: "sale", id: apiRef.slice("sale_".length) };
  }
  // bare uuid
  if (/^[0-9a-f-]{36}$/i.test(apiRef)) {
    return { kind: "saas", id: apiRef };
  }
  return { kind: "unknown", id: null };
}

async function notifyAdmins(
  service: ReturnType<typeof getServiceClient>,
  title: string,
  message: string,
  type: string,
  priority: string,
  metadata: Record<string, unknown>,
) {
  const { data: admins } = await service
    .from("profiles")
    .select("id")
    .eq("role", "SUPER_ADMIN")
    .eq("is_active", true);

  if (!admins?.length) return;

  await service.from("notifications").insert(
    admins.map((a) => ({
      recipient_id: a.id,
      recipient_role: "SUPER_ADMIN",
      title,
      message,
      type,
      priority,
      metadata,
    })),
  );
}

async function applyCompleteSubscription(
  service: ReturnType<typeof getServiceClient>,
  tenantId: string,
  invoiceId: string,
) {
  const periodEnd = new Date();
  periodEnd.setDate(periodEnd.getDate() + 30);
  const amountKes = await subscriptionAmountKes(tenantId);

  await service
    .from("tenants")
    .update({
      status: "ACTIVE",
      access_until: periodEnd.toISOString(),
    })
    .eq("id", tenantId);

  await service
    .from("subscriptions")
    .update({
      status: "ACTIVE",
      current_period_start: new Date().toISOString(),
      current_period_end: periodEnd.toISOString(),
      last_invoice_id: invoiceId,
    })
    .eq("tenant_id", tenantId);

  await notifyAdmins(
    service,
    "SaaS subscription paid",
    `Tenant ${tenantId} paid KES ${amountKes.toLocaleString("en-KE")}. Access extended 30 days.`,
    "SUBSCRIPTION",
    "NORMAL",
    { tenant_id: tenantId, invoice_id: invoiceId },
  );

  const { data: vendors } = await service
    .from("profiles")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("role", "VENDOR_ADMIN");

  if (vendors?.length) {
    await service.from("notifications").insert(
      vendors.map((v) => ({
        tenant_id: tenantId,
        recipient_id: v.id,
        recipient_role: "VENDOR_ADMIN",
        title: "Subscription active",
        message: "Your InuaBiz plan is active for 30 more days. Asante!",
        type: "SUBSCRIPTION",
        priority: "HIGH",
        metadata: { invoice_id: invoiceId },
      })),
    );
  }
}

async function applyCompleteSale(
  service: ReturnType<typeof getServiceClient>,
  saleId: string,
) {
  await service
    .from("sales")
    .update({
      status: "PAID",
      paid_at: new Date().toISOString(),
      payment_channel: "MPESA_STK",
    })
    .eq("id", saleId);
}

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const challengeSecret = Deno.env.get("INTASEND_WEBHOOK_SECRET");
    const payload = (await req.json()) as WebhookPayload;

    // Challenge token verification (IntaSend shared secret)
    if (challengeSecret) {
      if (!payload.challenge || payload.challenge !== challengeSecret) {
        return jsonResponse({ error: "Invalid challenge" }, 401);
      }
    }

    const invoiceId = payload.invoice_id;
    if (!invoiceId) {
      return jsonResponse({ error: "invoice_id required" }, 400);
    }

    const status = mapIntaSendState(payload.state);
    const service = getServiceClient();
    const amount = Number(payload.net_amount ?? payload.amount ?? 0);

    // Idempotent upsert by invoice_id
    const { data: existing } = await service
      .from("payment_transactions")
      .select("*")
      .eq("invoice_id", invoiceId)
      .maybeSingle();

    if (existing?.status === "COMPLETE" && status === "COMPLETE") {
      return jsonResponse({ ok: true, deduped: true });
    }

    let tenantId = existing?.tenant_id as string | null;
    let saleId = existing?.sale_id as string | null;
    let purpose = (existing?.purpose as string | null) ?? "OTHER";

    const parsed = parseUuidFromApiRef(
      (payload.api_ref as string | undefined) ?? existing?.api_ref ?? undefined,
    );

    if (!tenantId && parsed.kind === "saas" && parsed.id) {
      const { data: t } = await service
        .from("tenants")
        .select("id")
        .eq("id", parsed.id)
        .maybeSingle();
      tenantId = t?.id ?? null;
      purpose = "SAAS_SUBSCRIPTION";
    }

    if (!saleId && parsed.kind === "sale" && parsed.id) {
      const { data: s } = await service
        .from("sales")
        .select("id, tenant_id")
        .eq("id", parsed.id)
        .maybeSingle();
      saleId = s?.id ?? null;
      tenantId = s?.tenant_id ?? tenantId;
      purpose = "VENDOR_SALE";
    }

    const txRow = {
      tenant_id: tenantId,
      sale_id: saleId,
      purpose,
      invoice_id: invoiceId,
      tracking_id: (payload.tracking_id as string | undefined) ?? existing?.tracking_id,
      amount: amount || existing?.amount || 0,
      currency: payload.currency ?? "KES",
      payment_channel: "MPESA_STK" as const,
      status,
      account: payload.account ?? existing?.account,
      api_ref: payload.api_ref ?? existing?.api_ref,
      raw_webhook_payload: payload,
    };

    let paymentTransactionId = existing?.id as string | undefined;

    if (existing) {
      const { error } = await service
        .from("payment_transactions")
        .update(txRow)
        .eq("id", existing.id);
      if (error) throw error;
    } else {
      const { data: inserted, error } = await service
        .from("payment_transactions")
        .insert(txRow)
        .select("id")
        .single();
      if (error) throw error;
      paymentTransactionId = inserted.id;
    }

    if (status === "COMPLETE") {
      if (purpose === "SAAS_SUBSCRIPTION" && tenantId) {
        await applyCompleteSubscription(service, tenantId, invoiceId);
      } else if (purpose === "VENDOR_SALE" && saleId) {
        await applyCompleteSale(service, saleId);
      } else if (!tenantId) {
        // Unclaimed queue
        await service.from("unclaimed_payments").insert({
          payment_transaction_id: paymentTransactionId,
          invoice_id: invoiceId,
          amount: amount || 0,
          raw_webhook_payload: payload,
        });

        await notifyAdmins(
          service,
          "Unclaimed payment",
          `Invoice ${invoiceId} completed but could not be matched to a tenant.`,
          "PAYMENT",
          "CRITICAL",
          { invoice_id: invoiceId, amount },
        );
      }
    }

    if (status === "FAILED" || status === "CANCELLED") {
      if (saleId) {
        await service
          .from("sales")
          .update({ status: "DRAFT" })
          .eq("id", saleId)
          .eq("status", "PENDING_PAYMENT");
      }
    }

    return jsonResponse({ ok: true, status, invoice_id: invoiceId });
  } catch (err) {
    console.error(err);
    return jsonResponse(
      { error: err instanceof Error ? err.message : "Unexpected error" },
      500,
    );
  }
});
