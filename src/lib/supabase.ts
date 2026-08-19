import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null | undefined;

export function isSupabaseConfigured(): boolean {
  return Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
}

export function getSupabase(): SupabaseClient | null {
  if (client !== undefined) return client;

  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) {
    client = null;
    return null;
  }

  const browser = typeof window !== "undefined";
  client = createClient(url, key, {
    auth: {
      persistSession: browser,
      autoRefreshToken: browser,
      detectSessionInUrl: browser,
    },
  });
  return client;
}

export async function getAccessToken(): Promise<string | null> {
  const sb = getSupabase();
  if (!sb) return null;

  const { data: sessionData } = await sb.auth.getSession();
  let session = sessionData.session;
  if (!session) return null;

  const expiresAt = session.expires_at ?? 0;
  const expiresSoon = expiresAt * 1000 < Date.now() + 60_000;
  if (expiresSoon) {
    const { data: refreshed, error } = await sb.auth.refreshSession();
    if (error) {
      console.warn("session refresh failed", error.message);
      return null;
    }
    session = refreshed.session ?? session;
  }

  return session.access_token ?? null;
}

export async function invokeFunction<T>(
  name: string,
  body: Record<string, unknown> = {},
): Promise<{ data: T | null; error: string | null }> {
  const sb = getSupabase();
  if (!sb) return { data: null, error: "Supabase is not configured" };

  const token = await getAccessToken();
  if (!token) {
    return { data: null, error: "Sign in required — open Subscription after logging in with your phone." };
  }

  const { data, error } = await sb.functions.invoke(name, {
    body,
    headers: { Authorization: `Bearer ${token}` },
  });
  if (error) {
    const msg = error.message.includes("401")
      ? "Session expired — sign out and sign in again, then retry."
      : error.message;
    return { data: null, error: msg };
  }
  if (data && typeof data === "object" && "error" in data && data.error) {
    return { data: null, error: String((data as { error: unknown }).error) };
  }
  return { data: data as T, error: null };
}
