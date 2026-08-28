import { getSupabase } from "@/lib/supabase";

export type OpsCronJob = {
  jobid: number;
  jobname: string;
  schedule: string;
  active: boolean;
  command: string;
  last_status: string | null;
  last_run: string | null;
  last_end: string | null;
  last_message: string | null;
  runs_24h: number;
  fail_24h: number;
};

export type OpsStorageBucket = {
  bucket: string;
  files: number;
  bytes: number;
};

export type OpsEvent = {
  at: string;
  kind: string;
  title: string;
  detail: string | null;
  tenant_id: string | null;
  href: string | null;
};

export type OpsAuditRow = {
  id: string;
  at: string;
  kind: string;
  action: string;
  label: string | null;
  tenant_id: string | null;
  admin_id: string | null;
  ended_at?: string | null;
};

export type OpsFlag = {
  id: string;
  key: string;
  tenant_id: string | null;
  enabled: boolean;
  description: string | null;
  updated_at: string;
};

export type OpsDlqEmail = {
  id: number;
  to_email: string;
  template_id: string;
  subject: string;
  error: string | null;
  created_at: string;
};

export type OpsDlqPayment = {
  id: string;
  purpose: string;
  status: string;
  amount: number;
  invoice_id: string;
  tenant_id: string | null;
  created_at: string;
};

export type OpsTrialEnding = {
  id: string;
  name: string;
  phone: string;
  trial_ends_at: string;
  hours_left: number;
};

export type OpsPulse = {
  generated_at: string;
  revenue: {
    mrr_kes: number;
    arr_kes: number;
    arpu_kes: number;
    active_tenants: number;
    trial_tenants: number;
    past_due_tenants: number;
    suspended_tenants: number;
    conversions_this_month: number;
  };
  db: {
    size_bytes: number;
    connections: number;
    max_connections: number;
    long_queries: number;
  };
  storage: OpsStorageBucket[];
  cron: OpsCronJob[];
  usage: {
    email_sent_24h: number;
    email_failed_24h: number;
    pending_payments: number;
    unclaimed: number;
    ai_spend_month_kes: number;
    ai_runs_month: number;
    edge_http_fail_24h: number;
  };
  trials_ending: OpsTrialEnding[];
  events: OpsEvent[];
  dlq: {
    emails: OpsDlqEmail[];
    payments: OpsDlqPayment[];
    unclaimed: Array<{ id: string; invoice_id: string; amount: number; created_at: string }>;
  };
  audit: OpsAuditRow[];
  ghost: OpsAuditRow[];
  flags: OpsFlag[];
};

export type TenantBilling = {
  trialEndsAt: string | null;
  accessUntil: string | null;
  status: string;
  amount: number;
  planCode: string;
  periodEnd: string | null;
  autoDebit: boolean;
};

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function num(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export async function fetchOpsPulse(): Promise<OpsPulse | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb.rpc("admin_ops_pulse");
  if (error || !data || typeof data !== "object") return null;
  const row = data as Record<string, unknown>;
  const revenue = bag(row["revenue"]);
  const db = bag(row["db"]);
  const usage = bag(row["usage"]);
  const dlq = bag(row["dlq"]);
  return {
    generated_at: String(row["generated_at"] ?? ""),
    revenue: {
      mrr_kes: num(revenue["mrr_kes"]),
      arr_kes: num(revenue["arr_kes"]),
      arpu_kes: num(revenue["arpu_kes"]),
      active_tenants: num(revenue["active_tenants"]),
      trial_tenants: num(revenue["trial_tenants"]),
      past_due_tenants: num(revenue["past_due_tenants"]),
      suspended_tenants: num(revenue["suspended_tenants"]),
      conversions_this_month: num(revenue["conversions_this_month"]),
    },
    db: {
      size_bytes: num(db["size_bytes"]),
      connections: num(db["connections"]),
      max_connections: num(db["max_connections"]),
      long_queries: num(db["long_queries"]),
    },
    storage: asArray<OpsStorageBucket>(row["storage"]),
    cron: asArray<OpsCronJob>(row["cron"]),
    usage: {
      email_sent_24h: num(usage["email_sent_24h"]),
      email_failed_24h: num(usage["email_failed_24h"]),
      pending_payments: num(usage["pending_payments"]),
      unclaimed: num(usage["unclaimed"]),
      ai_spend_month_kes: num(usage["ai_spend_month_kes"]),
      ai_runs_month: num(usage["ai_runs_month"]),
      edge_http_fail_24h: num(usage["edge_http_fail_24h"]),
    },
    trials_ending: asArray<OpsTrialEnding>(row["trials_ending"]),
    events: asArray<OpsEvent>(row["events"]),
    dlq: {
      emails: asArray<OpsDlqEmail>(dlq["emails"]),
      payments: asArray<OpsDlqPayment>(dlq["payments"]),
      unclaimed: asArray(dlq["unclaimed"]),
    },
    audit: asArray<OpsAuditRow>(row["audit"]),
    ghost: asArray<OpsAuditRow>(row["ghost"]),
    flags: asArray<OpsFlag>(row["flags"]),
  };
}

function bag(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

async function rpcOk(name: string, args: Record<string, unknown>): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error("Sign in required");
  const { error } = await sb.rpc(name, args);
  if (error) throw new Error(error.message);
}

export async function retryCronJob(jobname: string): Promise<void> {
  await rpcOk("admin_retry_cron", { p_jobname: jobname });
}

export async function retryFailedEmail(logId: number): Promise<void> {
  await rpcOk("admin_retry_email", { p_log_id: logId });
}

export async function extendTrial(tenantId: string, days: number, reason: string): Promise<void> {
  await rpcOk("admin_extend_trial", {
    p_tenant_id: tenantId,
    p_days: days,
    p_reason: reason,
  });
}

export async function overrideSubscription(input: {
  tenantId: string;
  amount: number;
  planCode: string;
  status: "TRIAL" | "ACTIVE" | "PAST_DUE" | "SUSPENDED" | "CANCELLED";
  periodDays: number | null;
  reason: string;
}): Promise<void> {
  await rpcOk("admin_override_subscription", {
    p_tenant_id: input.tenantId,
    p_amount: input.amount,
    p_plan_code: input.planCode,
    p_status: input.status,
    p_period_days: input.periodDays,
    p_reason: input.reason,
  });
}

export async function setFeatureFlag(
  key: string,
  enabled: boolean,
  tenantId?: string | null,
): Promise<void> {
  await rpcOk("admin_set_feature_flag", {
    p_key: key,
    p_enabled: enabled,
    p_tenant_id: tenantId ?? null,
  });
}

export async function purgeTenant(
  tenantId: string,
  confirmName: string,
  reason: string,
): Promise<void> {
  await rpcOk("admin_purge_tenant", {
    p_tenant_id: tenantId,
    p_confirm_name: confirmName,
    p_reason: reason,
  });
}

export async function fetchTenantBilling(tenantId: string): Promise<TenantBilling | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data: tenant } = await sb
    .from("tenants")
    .select("status, trial_ends_at, access_until")
    .eq("id", tenantId)
    .maybeSingle();
  const { data: sub } = await sb
    .from("subscriptions")
    .select("amount, plan_code, status, current_period_end, auto_debit_enabled")
    .eq("tenant_id", tenantId)
    .maybeSingle();
  if (!tenant) return null;
  return {
    trialEndsAt: (tenant.trial_ends_at as string | null) ?? null,
    accessUntil: (tenant.access_until as string | null) ?? null,
    status: String(sub?.status ?? tenant.status),
    amount: Number(sub?.amount ?? 0),
    planCode: String(sub?.plan_code ?? "FLAT_3000"),
    periodEnd: (sub?.current_period_end as string | null) ?? null,
    autoDebit: Boolean(sub?.auto_debit_enabled),
  };
}

export function cronLabel(schedule: string): string {
  if (schedule === "*/3 * * * *") return "Every 3 min";
  if (schedule === "0 3 * * *") return "06:00 EAT daily";
  return schedule;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function formatWhen(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-KE", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Nairobi",
  });
}

export function cronTone(job: OpsCronJob): "Healthy" | "Degraded" | "Critical" {
  if (!job.active) return "Degraded";
  if (job.fail_24h > 0 || (job.last_status && job.last_status !== "succeeded")) return "Critical";
  return "Healthy";
}
