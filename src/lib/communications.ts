import { toast } from "sonner";
import { getSupabase, invokeFunction, isSupabaseConfigured } from "@/lib/supabase";
import {
  BUNDLED_COMMUNICATION_TEMPLATES,
  buildCommunicationTemplates,
  type BundledTemplate,
  type EmailCategory,
} from "@/lib/email/templates";

export type { EmailCategory };

export type CommunicationTemplate = BundledTemplate & { updated_at?: string };

export type BroadcastAudience = "all" | "active" | "trial" | "lapsed";
export type BroadcastChannel = "banner" | "banner_email" | "all";
export type BroadcastStatus = "draft" | "published" | "scheduled";

export type PlatformBroadcast = {
  id: string;
  title: string;
  body: string;
  audience: BroadcastAudience;
  channel: BroadcastChannel;
  status: BroadcastStatus;
  recipient_count: number;
  created_at: string;
  published_at?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
};

export type EmailSendLogRow = {
  id: string;
  to_email: string;
  template_id: string;
  subject: string;
  status: string;
  error?: string | null;
  created_at: string;
};

export type EmailProviderSettings = {
  fromEmail: string;
  fromName: string;
  notificationsEnabled: boolean;
  opsInbox: string;
  opsDigest: string;
};

const TPL_OVERRIDE_KEY = "inuabiz-email-template-overrides";
const LOG_KEY = "inuabiz-email-send-log";
const SETTINGS_KEY = "inuabiz-email-provider";
const BROADCAST_KEY = "inuabiz-broadcast-drafts";

export type TemplateListResult = {
  templates: CommunicationTemplate[];
  source: "database" | "bundle";
};

function isMissingRelation(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  return /does not exist|schema cache|relation/i.test(msg);
}

function siteOrigin(): string {
  if (typeof window !== "undefined") return window.location.origin;
  return "https://inuabiz.co.ke";
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

function bundled(): CommunicationTemplate[] {
  return buildCommunicationTemplates(siteOrigin());
}

function withOverrides(list: CommunicationTemplate[]): CommunicationTemplate[] {
  const overrides = readJson<Record<string, { subject?: string; html?: string }>>(
    TPL_OVERRIDE_KEY,
    {},
  );
  return list.map((t) => {
    const o = overrides[t.id];
    return o ? { ...t, ...o, updated_at: new Date().toISOString() } : t;
  });
}

/**
 * Fill preview placeholders so iframe HTML looks like a real send.
 */
export function withPreviewVars(html: string): string {
  const origin = siteOrigin();
  const pairs: Array<[RegExp, string]> = [
    [/\{\{\s*\.ConfirmationURL\s*\}\}/g, `${origin}/verify`],
    [/\{\{\s*\.SiteURL\s*\}\}/g, origin],
    [/\{\{\s*userName\s*\}\}/g, "Mama Njoroge"],
    [/\{\{\s*shop\s*\}\}/g, "Mama Njoroge's Duka"],
    [/\{\{\s*amount\s*\}\}/g, "KES 905"],
  ];
  return pairs.reduce((acc, [re, v]) => acc.replace(re, v), html);
}

function mapBroadcastRow(row: Record<string, unknown>): PlatformBroadcast {
  return {
    id: String(row["id"]),
    title: String(row["title"] ?? ""),
    body: String(row["body"] ?? row["title"] ?? ""),
    audience: (row["audience"] as BroadcastAudience) || "all",
    channel: (row["channel"] as BroadcastChannel) || "banner",
    status: (row["status"] as BroadcastStatus) || (row["is_active"] ? "published" : "draft"),
    recipient_count: Number(row["recipient_count"] ?? 0),
    created_at: String(row["created_at"] ?? new Date().toISOString()),
    published_at: (row["published_at"] as string | null) ?? null,
    starts_at: (row["starts_at"] as string | null) ?? null,
    ends_at: (row["ends_at"] as string | null) ?? null,
  };
}

function mockBroadcastRows(): PlatformBroadcast[] {
  return readJson<PlatformBroadcast[]>(BROADCAST_KEY, []);
}

/**
 * List Figma email templates: database first, bundled catalog as fallback.
 */
export async function listCommunicationTemplates(): Promise<TemplateListResult> {
  const catalog = bundled();
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb
      .from("communication_templates")
      .select("*")
      .order("category")
      .order("name");
    if (!error && data && data.length > 0) {
      return {
        templates: withOverrides(data as CommunicationTemplate[]),
        source: "database",
      };
    }
    if (error && !isMissingRelation(error)) throw error;
  }
  return {
    templates: withOverrides(catalog.length ? catalog : BUNDLED_COMMUNICATION_TEMPLATES),
    source: "bundle",
  };
}

function saveTemplateLocally(payload: { id: string; subject: string; html: string }): void {
  const overrides = readJson<Record<string, { subject: string; html: string }>>(
    TPL_OVERRIDE_KEY,
    {},
  );
  overrides[payload.id] = { subject: payload.subject, html: payload.html };
  writeJson(TPL_OVERRIDE_KEY, overrides);
}

/**
 * Persist subject + HTML for a template (Supabase or local override).
 */
export async function saveCommunicationTemplate(payload: {
  id: string;
  subject: string;
  html: string;
}): Promise<void> {
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb
      .from("communication_templates")
      .update({
        subject: payload.subject,
        html: payload.html,
        updated_at: new Date().toISOString(),
      })
      .eq("id", payload.id)
      .select("id");
    if (!error && data && data.length > 0) {
      toast.success("Template saved");
      return;
    }
    if (error && !isMissingRelation(error) && !/row-level security|permission denied/i.test(error.message)) {
      throw error;
    }
  }
  saveTemplateLocally(payload);
  toast.success("Template saved on this device");
}

/**
 * Send a branded template via dispatch-outbound (Resend).
 */
export async function testCommunicationTemplate(opts: {
  templateId: string;
  to: string;
  subject: string;
}): Promise<void> {
  const to = opts.to.trim();
  if (!to.includes("@")) throw new Error("Enter a valid email address");

  const { data, error } = await invokeFunction<{ ok?: boolean; id?: string; error?: string }>(
    "dispatch-outbound",
    { template_id: opts.templateId, to },
  );
  if (!error && data?.ok) {
    toast.success(`Sent ${opts.templateId} to ${to}`, {
      description: data.id ? `Resend ${data.id}` : "Branded template via support@mail.inuabiz.co.ke",
    });
    return;
  }

  const sb = getSupabase();
  const row = {
    to_email: to,
    template_id: opts.templateId,
    subject: opts.subject,
    status: "error",
    error: error ?? "dispatch-outbound failed",
    metadata: { source: "admin-test" },
  };
  if (sb) {
    const { error: logErr } = await sb.from("email_send_log").insert(row);
    if (logErr && !isMissingRelation(logErr)) throw logErr;
  } else {
    const logs = readJson<EmailSendLogRow[]>(LOG_KEY, []);
    logs.unshift({
      id: crypto.randomUUID(),
      to_email: to,
      template_id: opts.templateId,
      subject: opts.subject,
      status: "error",
      error: error ?? "No mail provider",
      created_at: new Date().toISOString(),
    });
    writeJson(LOG_KEY, logs.slice(0, 100));
  }
  throw new Error(error ?? "Could not send via Resend");
}

/**
 * Recent Resend / test sends.
 */
export async function listEmailSendLog(limit = 80): Promise<EmailSendLogRow[]> {
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb
      .from("email_send_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (!error && data) {
      return (data as EmailSendLogRow[]).map((r) => ({ ...r, id: String(r.id) }));
    }
    if (error && !isMissingRelation(error)) throw error;
  }
  const local = readJson<EmailSendLogRow[]>(LOG_KEY, []);
  return local.slice(0, limit);
}

/**
 * Broadcast history from platform_broadcasts, then local drafts.
 */
export async function listBroadcasts(): Promise<PlatformBroadcast[]> {
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb
      .from("platform_broadcasts")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) {
      return data.map((row) => mapBroadcastRow(row as Record<string, unknown>));
    }
    if (error && !isMissingRelation(error)) throw error;
  }
  return mockBroadcastRows();
}

/**
 * Active vendor banners (published + in window).
 */
export async function fetchActiveBroadcasts(): Promise<PlatformBroadcast[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from("platform_broadcasts")
    .select("*")
    .eq("is_active", true)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(8);
  if (error || !data) return [];
  return data.map((row) => mapBroadcastRow(row as Record<string, unknown>));
}

/**
 * Save a draft or publish a vendor broadcast.
 */
export async function saveBroadcast(input: {
  title?: string;
  body: string;
  audience: BroadcastAudience;
  channel: BroadcastChannel;
  publish: boolean;
}): Promise<void> {
  const title = (input.title || input.body).slice(0, 80);
  const sb = getSupabase();
  const payload = {
    title,
    body: input.body,
    audience: input.audience,
    channel: input.channel,
    status: input.publish ? "published" : "draft",
    is_active: input.publish,
    published_at: input.publish ? new Date().toISOString() : null,
    recipient_count: 0,
  };
  if (sb) {
    const { data, error } = await sb.from("platform_broadcasts").insert(payload).select("id").maybeSingle();
    if (!error) {
      if (input.publish && (input.channel === "banner_email" || input.channel === "all") && data?.id) {
        void invokeFunction("dispatch-lifecycle", { job: "broadcast", broadcast_id: data.id });
      }
      toast.success(input.publish ? "Broadcast queued" : "Draft saved");
      return;
    }
    if (!isMissingRelation(error) && !/audience|channel|status|recipient/i.test(error.message)) {
      const { error: basicErr } = await sb.from("platform_broadcasts").insert({
        title,
        body: input.body,
        is_active: input.publish,
      });
      if (!basicErr) {
        toast.success(input.publish ? "Broadcast queued" : "Draft saved");
        return;
      }
      throw basicErr;
    }
    if (!isMissingRelation(error)) throw error;
  }
  const local = readJson<PlatformBroadcast[]>(BROADCAST_KEY, []);
  local.unshift({
    id: crypto.randomUUID(),
    title,
    body: input.body,
    audience: input.audience,
    channel: input.channel,
    status: input.publish ? "published" : "draft",
    recipient_count: input.publish ? 34 : 0,
    created_at: new Date().toISOString(),
    published_at: input.publish ? new Date().toISOString() : null,
  });
  writeJson(BROADCAST_KEY, local);
  toast.success(input.publish ? "Broadcast queued" : "Draft saved");
}

const DEFAULT_PROVIDER: EmailProviderSettings = {
  fromEmail: "support@mail.inuabiz.co.ke",
  fromName: "InuaBiz",
  notificationsEnabled: true,
  opsInbox: "hello@inuabiz.co.ke",
  opsDigest: "komuzack@gmail.com",
};

/**
 * From-address and notification toggle.
 */
export async function getEmailProviderSettings(): Promise<EmailProviderSettings> {
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb.from("platform_settings").select("key, value");
    if (!error && data) {
      const map = Object.fromEntries(data.map((r) => [r.key, r.value]));
      return {
        fromEmail: String(map["email.from_email"] ?? DEFAULT_PROVIDER.fromEmail).replace(/^"|"$/g, ""),
        fromName: String(map["email.from_name"] ?? DEFAULT_PROVIDER.fromName).replace(/^"|"$/g, ""),
        notificationsEnabled:
          map["email.notifications_enabled"] === false ||
          map["email.notifications_enabled"] === "false"
            ? false
            : Boolean(map["email.notifications_enabled"] ?? DEFAULT_PROVIDER.notificationsEnabled),
        opsInbox: String(map["email.ops_inbox"] ?? "hello@inuabiz.co.ke").replace(/^"|"$/g, ""),
        opsDigest: String(map["email.ops_digest"] ?? "komuzack@gmail.com").replace(/^"|"$/g, ""),
      };
    }
  }
  return { ...DEFAULT_PROVIDER, ...readJson(SETTINGS_KEY, DEFAULT_PROVIDER) };
}

/**
 * Persist one provider setting.
 */
export async function saveEmailProviderSetting(
  key: keyof EmailProviderSettings,
  value: string | boolean,
): Promise<void> {
  const dbKey =
    key === "fromEmail"
      ? "email.from_email"
      : key === "fromName"
        ? "email.from_name"
        : key === "opsInbox"
          ? "email.ops_inbox"
          : key === "opsDigest"
            ? "email.ops_digest"
            : "email.notifications_enabled";
  const sb = getSupabase();
  if (sb) {
    const { error } = await sb.from("platform_settings").upsert(
      {
        key: dbKey,
        value,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" },
    );
    if (!error) {
      toast.success("Saved");
      return;
    }
    if (!isMissingRelation(error)) throw error;
  }
  const current = readJson(SETTINGS_KEY, DEFAULT_PROVIDER);
  writeJson(SETTINGS_KEY, { ...current, [key]: value });
  toast.success("Saved locally");
}

/** Whether Supabase is wired (used for provider status pills). */
export function emailInfraStatus(): { supabase: boolean; resend: boolean } {
  return {
    supabase: isSupabaseConfigured(),
    // Resend lives on the Edge Function / Auth SMTP — never a Vite key.
    resend: isSupabaseConfigured(),
  };
}

export function audienceLabel(aud: BroadcastAudience): string {
  if (aud === "active") return "Active subscribers";
  if (aud === "trial") return "Trial vendors";
  if (aud === "lapsed") return "Lapsed / suspended";
  return "All vendors";
}

export function channelLabel(ch: BroadcastChannel): string {
  if (ch === "banner_email") return "Banner + email";
  if (ch === "all") return "Banner + email + SMS";
  return "In-app banner only";
}
