import { getSupabase, invokeFunction, isSupabaseConfigured } from "@/lib/supabase";

export type SupportCategory =
  | "payment"
  | "pos_hardware"
  | "inventory"
  | "billing"
  | "other";

export type SupportPriority = "low" | "medium" | "high" | "urgent";

export type SupportStatus =
  | "open"
  | "in_progress"
  | "ai_handling"
  | "resolved"
  | "closed";

export type SupportTicket = {
  id: string;
  tenant_id: string;
  created_by: string | null;
  subject: string;
  category: SupportCategory;
  priority: SupportPriority;
  status: SupportStatus;
  ai_summary: string | null;
  context: Record<string, unknown>;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  tenant_name?: string;
};

export type SupportMessage = {
  id: string;
  ticket_id: string;
  tenant_id: string;
  sender_type: "vendor" | "admin" | "ai_assistant";
  sender_id: string | null;
  message: string;
  attachments: unknown[];
  created_at: string;
};

export type SupportInternalNote = {
  id: string;
  ticket_id: string;
  admin_id: string | null;
  note: string;
  created_at: string;
};

const CATEGORY_LABEL: Record<SupportCategory, string> = {
  payment: "M-Pesa / payments",
  pos_hardware: "POS & hardware",
  inventory: "Inventory",
  billing: "Billing & subscription",
  other: "Other",
};

const STATUS_LABEL: Record<SupportStatus, string> = {
  open: "Open",
  in_progress: "In progress",
  ai_handling: "AI assisting",
  resolved: "Resolved",
  closed: "Closed",
};

export function supportCategoryLabel(c: string): string {
  return CATEGORY_LABEL[c as SupportCategory] ?? c;
}

export function supportStatusLabel(s: string): string {
  return STATUS_LABEL[s as SupportStatus] ?? s;
}

export function captureSupportContext(extra?: Record<string, unknown>): Record<string, unknown> {
  if (typeof window === "undefined") return extra ?? {};
  return {
    page: window.location.pathname,
    user_agent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    online: navigator.onLine,
    captured_at: new Date().toISOString(),
    ...extra,
  };
}

export async function createSupportTicket(input: {
  subject: string;
  message: string;
  category?: SupportCategory;
  context?: Record<string, unknown>;
}): Promise<{ ticketId: string; aiReply: string | null }> {
  const { data, error } = await invokeFunction<{
    ok?: boolean;
    ticket_id?: string;
    ai_reply?: string | null;
    error?: string;
  }>("create-support-ticket", {
    subject: input.subject,
    message: input.message,
    category: input.category,
    context: input.context ?? captureSupportContext(),
  });
  if (error) throw new Error(error);
  if (!data?.ticket_id) throw new Error(data?.error ?? "Could not create ticket");
  return { ticketId: data.ticket_id, aiReply: data.ai_reply ?? null };
}

export async function replySupportTicket(ticketId: string, message: string): Promise<void> {
  const { error } = await invokeFunction("reply-support-ticket", {
    ticket_id: ticketId,
    message,
  });
  if (error) throw new Error(error);
}

export async function listVendorSupportTickets(): Promise<SupportTicket[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from("support_tickets")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as SupportTicket[];
}

export async function listAdminSupportTickets(
  status?: SupportStatus | "all",
): Promise<SupportTicket[]> {
  const sb = getSupabase();
  if (!sb) return [];
  let q = sb.from("support_tickets").select("*").order("updated_at", { ascending: false });
  if (status && status !== "all") q = q.eq("status", status);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as SupportTicket[];
  const tenantIds = [...new Set(rows.map((r) => r.tenant_id))];
  if (!tenantIds.length) return rows;
  const { data: tenants } = await sb.from("tenants").select("id, name").in("id", tenantIds);
  const names = new Map((tenants ?? []).map((t) => [t.id as string, t.name as string]));
  return rows.map((r) => ({ ...r, tenant_name: names.get(r.tenant_id) ?? "—" }));
}

export async function countOpenSupportTickets(): Promise<number> {
  const sb = getSupabase();
  if (!sb) return 0;
  const { count, error } = await sb
    .from("support_tickets")
    .select("id", { count: "exact", head: true })
    .in("status", ["open", "in_progress", "ai_handling"]);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function fetchSupportMessages(ticketId: string): Promise<SupportMessage[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from("support_ticket_messages")
    .select("*")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as SupportMessage[];
}

export async function fetchInternalNotes(ticketId: string): Promise<SupportInternalNote[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from("support_ticket_internal_notes")
    .select("*")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as SupportInternalNote[];
}

export async function updateSupportTicketStatus(
  ticketId: string,
  status: SupportStatus,
): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase not configured");
  const { error } = await sb
    .from("support_tickets")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", ticketId);
  if (error) throw new Error(error.message);
}

export async function addInternalNote(ticketId: string, note: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase not configured");
  const {
    data: { user },
  } = await sb.auth.getUser();
  const { error } = await sb.from("support_ticket_internal_notes").insert({
    ticket_id: ticketId,
    admin_id: user?.id ?? null,
    note: note.trim(),
  });
  if (error) throw new Error(error.message);
}

export type SupportDiagnosticAction =
  | "poll_pending_payments"
  | "verify_mpesa_setup"
  | "register_c2b_webhooks";

export async function runSupportDiagnostic(
  ticketId: string,
  action: SupportDiagnosticAction,
): Promise<{ summary: string; details: unknown }> {
  const { data, error } = await invokeFunction<{
    ok?: boolean;
    summary?: string;
    details?: unknown;
    error?: string;
  }>("run-support-diagnostic", { ticket_id: ticketId, action });
  if (error) throw new Error(error);
  if (!data?.summary) throw new Error(data?.error ?? "Diagnostic failed");
  return { summary: data.summary, details: data.details ?? null };
}

export { isSupabaseConfigured };
