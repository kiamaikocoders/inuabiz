import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";

export type ContactStatus = "new" | "read" | "archived";

export type ContactMessage = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  topic: string;
  message: string;
  status: ContactStatus;
  created_at: string;
};

export type NewsletterSubscriber = {
  id: string;
  email: string;
  source: string;
  confirmed: boolean;
  unsubscribed_at: string | null;
  created_at: string;
};

const TOPIC_LABEL: Record<string, string> = {
  demo: "Book a demo",
  onboarding: "Onboarding / setup fee",
  mpesa: "M-Pesa / payment setup",
  etims: "Compliance / ETR",
  compliance: "Compliance / ETR",
  enterprise: "Enterprise license",
  billing: "Billing question",
  other: "Something else",
};

export function contactTopicLabel(topic: string): string {
  return TOPIC_LABEL[topic] ?? topic;
}

export async function listContactMessages(status?: ContactStatus | "all"): Promise<ContactMessage[]> {
  const sb = getSupabase();
  if (!sb) return [];
  let q = sb.from("contact_messages").select("*").order("created_at", { ascending: false });
  if (status && status !== "all") q = q.eq("status", status);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as ContactMessage[];
}

export async function countNewContactMessages(): Promise<number> {
  const sb = getSupabase();
  if (!sb) return 0;
  const { count, error } = await sb
    .from("contact_messages")
    .select("id", { count: "exact", head: true })
    .eq("status", "new");
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function updateContactStatus(id: string, status: ContactStatus): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase is not configured");
  const { error } = await sb
    .from("contact_messages")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function listNewsletterSubscribers(): Promise<NewsletterSubscriber[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from("newsletter_subscribers")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as NewsletterSubscriber[];
}

export async function setNewsletterUnsubscribed(id: string, unsubscribed: boolean): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase is not configured");
  const { error } = await sb
    .from("newsletter_subscribers")
    .update({ unsubscribed_at: unsubscribed ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export { isSupabaseConfigured };
