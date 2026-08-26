import { getServiceClient, getUserClient, handleOptions, jsonResponse } from "../_shared/cors.ts";
import { dispatchOutbound } from "../_shared/outbound.ts";
import { resolveSecret } from "../_shared/daraja.ts";

/**
 * Lifecycle mail: trial, onboarding drop-off, low-stock follow-up, credit,
 * overdue invoices, broadcasts, daily till summary.
 * Cron: x-cron-secret / service role. Super-admin JWT may trigger a broadcast.
 */
Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;
  if (req.method !== "POST" && req.method !== "GET") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const cronSecret = Deno.env.get("CRON_SECRET") ?? (await resolveSecret("CRON_SECRET"));
    const auth = req.headers.get("Authorization") ?? "";
    const headerSecret = req.headers.get("x-cron-secret");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const isCron = Boolean(cronSecret && headerSecret === cronSecret);
    const isService = auth === `Bearer ${serviceKey}`;
    let isAdmin = isCron || isService;
    if (!isAdmin && auth.startsWith("Bearer ")) {
      const userClient = getUserClient(auth);
      const { data: { user } } = await userClient.auth.getUser();
      if (user) {
        const service = getServiceClient();
        const { data: profile } = await service
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();
        isAdmin = profile?.role === "SUPER_ADMIN";
      }
    }
    if (!isAdmin) return jsonResponse({ error: "Unauthorized" }, 401);

    const service = getServiceClient();
    const body = req.method === "GET"
      ? {}
      : ((await req.json().catch(() => ({}))) as { job?: string; broadcast_id?: string });
    const today = new Date().toISOString().slice(0, 10);
    const sent: string[] = [];

    if (body.job === "broadcast" || body.broadcast_id) {
      sent.push(...await sendBroadcast(service, body.broadcast_id ?? null));
      return jsonResponse({ ok: true, sent: sent.length, items: sent });
    }

    if (body.job === "daily") {
      sent.push(...await sendDailySummaries(service, today));
      return jsonResponse({ ok: true, sent: sent.length, items: sent });
    }

    sent.push(...await sendTrialEnding(service, today));
    sent.push(...await sendOnboardingIncomplete(service, today));
    sent.push(...await sendLowStockFollowup(service, today));
    sent.push(...await sendCreditReminders(service, today));
    sent.push(...await sendOverdueInvoices(service, today));
    sent.push(...await sendBroadcast(service, null));

    return jsonResponse({ ok: true, sent: sent.length, items: sent });
  } catch (err) {
    console.error(err);
    return jsonResponse({ error: err instanceof Error ? err.message : "Unexpected error" }, 500);
  }
});

type Service = ReturnType<typeof getServiceClient>;

function kes(n: number): string {
  return `KES ${Number(n).toLocaleString("en-KE")}`;
}

async function wasSent(
  service: Service,
  templateId: string,
  key: string,
): Promise<boolean> {
  const { data } = await service
    .from("email_send_log")
    .select("id")
    .eq("template_id", templateId)
    .contains("metadata", { idempotency_key: `${key}/${templateId}` })
    .limit(1)
    .maybeSingle();
  return Boolean(data);
}

async function sendTrialEnding(service: Service, today: string): Promise<string[]> {
  const sent: string[] = [];
  const now = new Date();
  const in36h = new Date(now.getTime() + 36 * 60 * 60 * 1000).toISOString();
  const { data: trials } = await service
    .from("tenants")
    .select("id, email, trial_ends_at, status")
    .eq("status", "TRIAL")
    .lte("trial_ends_at", in36h)
    .gte("trial_ends_at", now.toISOString())
    .limit(80);
  for (const tenant of trials ?? []) {
    const key = `trial-ending/${tenant.id}/${today}`;
    if (await wasSent(service, "trial-ending", key)) continue;
    await dispatchOutbound({
      tenant_id: tenant.id,
      template_id: "trial-ending",
      to: tenant.email ?? undefined,
      idempotency_key: key,
    });
    sent.push(`trial-ending:${tenant.id}`);
  }
  return sent;
}

async function sendOnboardingIncomplete(service: Service, today: string): Promise<string[]> {
  const sent: string[] = [];
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
  const { data: dropoffs } = await service
    .from("profiles")
    .select("id, tenant_id, onboarding_completed_at, created_at, role")
    .is("onboarding_completed_at", null)
    .is("tenant_id", null)
    .neq("role", "SUPER_ADMIN")
    .lt("created_at", twoHoursAgo)
    .limit(50);
  for (const profile of dropoffs ?? []) {
    const { data: user } = await service.auth.admin.getUserById(profile.id as string);
    const email = user.user?.email;
    if (!email) continue;
    const key = `onboarding-incomplete/${profile.id}/${today}`;
    if (await wasSent(service, "onboarding-incomplete", key)) continue;
    await dispatchOutbound({
      template_id: "onboarding-incomplete",
      to: email,
      idempotency_key: key,
    });
    sent.push(`onboarding-incomplete:${profile.id}`);
  }
  return sent;
}

async function sendLowStockFollowup(service: Service, today: string): Promise<string[]> {
  const sent: string[] = [];
  const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const { data: notes } = await service
    .from("notifications")
    .select("id, tenant_id, metadata, title")
    .eq("type", "STOCK_LOW")
    .gte("created_at", since)
    .limit(40);
  const seen = new Set<string>();
  for (const note of notes ?? []) {
    const tenantId = note.tenant_id as string | null;
    const productId = String((note.metadata as { product_id?: string } | null)?.product_id ?? note.id);
    const dedupe = `${tenantId}/${productId}`;
    if (!tenantId || seen.has(dedupe)) continue;
    seen.add(dedupe);
    const key = `low-stock/${productId}/${today}`;
    if (await wasSent(service, "low-stock", key)) continue;
    const meta = (note.metadata ?? {}) as { stock_qty?: number };
    await dispatchOutbound({
      tenant_id: tenantId,
      notification_id: note.id,
      template_id: "low-stock",
      idempotency_key: key,
      vars: {
        product: String(note.title ?? "").replace(/^Low stock:\s*/i, ""),
        on_hand: meta.stock_qty != null ? String(meta.stock_qty) : "",
      },
    });
    sent.push(`low-stock:${productId}`);
  }
  return sent;
}

async function sendCreditReminders(service: Service, today: string): Promise<string[]> {
  const sent: string[] = [];
  const { data: rows } = await service
    .from("customer_loyalty_stats")
    .select("customer_id, tenant_id, name, phone, credit_balance")
    .gt("credit_balance", 0)
    .limit(80);
  for (const row of rows ?? []) {
    const tenantId = row.tenant_id as string | undefined;
    const customerId = row.customer_id as string;
    if (!tenantId) continue;
    const { data: oldest } = await service
      .from("credit_entries")
      .select("created_at, due_at")
      .eq("customer_id", customerId)
      .eq("entry_type", "CHARGE")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    const dueAt = oldest?.due_at
      ? new Date(oldest.due_at as string)
      : oldest?.created_at
        ? new Date(new Date(oldest.created_at as string).getTime() + 7 * 24 * 60 * 60 * 1000)
        : null;
    if (!dueAt || dueAt.getTime() > Date.now()) continue;
    const key = `credit-reminder/${customerId}/${today}`;
    if (await wasSent(service, "credit-reminder", key)) continue;
    await dispatchOutbound({
      tenant_id: tenantId,
      template_id: "credit-reminder",
      idempotency_key: key,
      vars: {
        customer_name: String(row.name ?? "Customer"),
        amount: kes(Number(row.credit_balance)),
        phone: String(row.phone ?? ""),
      },
    });
    sent.push(`credit-reminder:${customerId}`);
  }
  return sent;
}

async function sendOverdueInvoices(service: Service, today: string): Promise<string[]> {
  const sent: string[] = [];
  const { data: invoices } = await service
    .from("bill_invoices")
    .select("id, tenant_id, external_reference, billed_full_name, billed_email, amount, due_date, status")
    .eq("status", "SENT")
    .lt("due_date", new Date().toISOString())
    .limit(40);
  for (const inv of invoices ?? []) {
    const key = `invoice-overdue/${inv.id}/${today}`;
    if (await wasSent(service, "invoice-overdue", key)) continue;
    const to = typeof inv.billed_email === "string" && inv.billed_email.includes("@")
      ? inv.billed_email
      : undefined;
    await dispatchOutbound({
      tenant_id: inv.tenant_id,
      template_id: "invoice-overdue",
      to,
      idempotency_key: key,
      vars: {
        invoice_number: String(inv.external_reference ?? ""),
        customer_name: String(inv.billed_full_name ?? "Buyer"),
        amount: kes(Number(inv.amount)),
        due: inv.due_date ? new Date(inv.due_date as string).toLocaleDateString("en-KE") : "",
      },
    });
    sent.push(`invoice-overdue:${inv.id}`);
  }
  return sent;
}

async function sendBroadcast(service: Service, broadcastId: string | null): Promise<string[]> {
  const sent: string[] = [];
  let query = service
    .from("platform_broadcasts")
    .select("id, title, body, audience, channel, status, email_dispatched_at")
    .in("channel", ["banner_email", "all"])
    .eq("status", "published")
    .is("email_dispatched_at", null);
  if (broadcastId) query = query.eq("id", broadcastId);
  const { data: broadcasts } = await query.limit(5);
  for (const b of broadcasts ?? []) {
    const audience = String(b.audience ?? "all");
    let tenantsQuery = service.from("tenants").select("id, email, status").not("email", "is", null).limit(200);
    if (audience === "active") tenantsQuery = tenantsQuery.eq("status", "ACTIVE");
    else if (audience === "trial") tenantsQuery = tenantsQuery.eq("status", "TRIAL");
    else if (audience === "lapsed") tenantsQuery = tenantsQuery.in("status", ["PAST_DUE", "SUSPENDED", "CANCELLED"]);
    const { data: tenants } = await tenantsQuery;
    let count = 0;
    for (const tenant of tenants ?? []) {
      const email = String(tenant.email ?? "");
      if (!email.includes("@")) continue;
      const key = `broadcast/${b.id}/${tenant.id}`;
      if (await wasSent(service, "broadcast-maintenance", key)) continue;
      await dispatchOutbound({
        tenant_id: tenant.id,
        template_id: "broadcast-maintenance",
        to: email,
        idempotency_key: key,
        vars: {
          headline: String(b.title ?? "InuaBiz notice"),
          body: String(b.body ?? ""),
        },
      });
      count += 1;
    }
    await service
      .from("platform_broadcasts")
      .update({
        email_dispatched_at: new Date().toISOString(),
        recipient_count: count,
      })
      .eq("id", b.id);
    sent.push(`broadcast:${b.id}:${count}`);
  }
  return sent;
}

async function sendDailySummaries(service: Service, today: string): Promise<string[]> {
  const sent: string[] = [];
  const eatOffsetMs = 3 * 60 * 60 * 1000;
  const eatNow = new Date(Date.now() + eatOffsetMs);
  const y = new Date(Date.UTC(eatNow.getUTCFullYear(), eatNow.getUTCMonth(), eatNow.getUTCDate()));
  y.setUTCDate(y.getUTCDate() - 1);
  const dayStart = new Date(y.getTime() - eatOffsetMs);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
  const dayLabel = y.toLocaleDateString("en-KE", { weekday: "long" });

  const { data: tenants } = await service
    .from("tenants")
    .select("id, email, name, status")
    .in("status", ["TRIAL", "ACTIVE"])
    .not("email", "is", null)
    .limit(120);

  for (const tenant of tenants ?? []) {
    const key = `daily-summary/${tenant.id}/${today}`;
    if (await wasSent(service, "daily-summary", key)) continue;
    const { data: sales } = await service
      .from("sales")
      .select("id, total, payment_channel, status")
      .eq("tenant_id", tenant.id)
      .in("status", ["PAID", "CREDIT"])
      .gte("created_at", dayStart.toISOString())
      .lt("created_at", dayEnd.toISOString());
    const rows = sales ?? [];
    const total = rows.reduce((s, r) => s + Number(r.total ?? 0), 0);
    const mpesa = rows
      .filter((r) => String(r.payment_channel).includes("MPESA") || String(r.payment_channel) === "PAYBILL")
      .reduce((s, r) => s + Number(r.total ?? 0), 0);
    await dispatchOutbound({
      tenant_id: tenant.id,
      template_id: "daily-summary",
      to: tenant.email ?? undefined,
      idempotency_key: key,
      vars: {
        shop: String(tenant.name ?? ""),
        amount: kes(total),
        count: String(rows.length),
        day: dayLabel,
        mpesa: kes(mpesa),
      },
    });
    sent.push(`daily-summary:${tenant.id}`);
  }
  return sent;
}
