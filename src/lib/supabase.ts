import {
  createClient,
  FunctionsHttpError,
  type SupabaseClient,
} from "@supabase/supabase-js";

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

/** Ensure a valid user session exists; refresh once if the JWT is stale. */
async function ensureFreshSession(sb: SupabaseClient): Promise<boolean> {
  let { data: userData, error: userError } = await sb.auth.getUser();
  if (!userError && userData.user) return true;

  const { data: refreshed, error: refreshError } = await sb.auth.refreshSession();
  if (refreshError || !refreshed.session) return false;

  ({ data: userData, error: userError } = await sb.auth.getUser());
  return !userError && Boolean(userData.user);
}

export async function invokeFunction<T>(
  name: string,
  body: Record<string, unknown> = {},
): Promise<{ data: T | null; error: string | null }> {
  const sb = getSupabase();
  if (!sb) return { data: null, error: "Supabase is not configured" };

  const signedIn = await ensureFreshSession(sb);
  if (!signedIn) {
    return {
      data: null,
      error: "Sign in required — sign out and sign in again, then retry.",
    };
  }

  // Let functionsFetch attach the live session JWT — do not override Authorization
  // with a possibly stale token from getSession().
  const { data, error } = await sb.functions.invoke(name, { body });

  if (error) {
    const is401 =
      error instanceof FunctionsHttpError && error.context.status === 401;

    let detail: string | null = null;
    if (error instanceof FunctionsHttpError) {
      try {
        const payload = await error.context.json();
        if (payload && typeof payload === "object" && "error" in payload) {
          detail = String((payload as { error: unknown }).error);
        }
      } catch {
        /* ignore body parse failures */
      }
    }

    const msg = is401
      ? "Session expired — sign out and sign in again, then retry."
      : detail ?? error.message;
    return { data: null, error: msg };
  }
  if (data && typeof data === "object" && "error" in data && data.error) {
    return { data: null, error: String((data as { error: unknown }).error) };
  }
  return { data: data as T, error: null };
}

/**
 * Invoke an Edge Function without requiring a signed-in session (contact form, etc.).
 * Target functions must have verify_jwt = false.
 */
export async function invokePublicFunction<T>(
  name: string,
  body: Record<string, unknown> = {},
): Promise<{ data: T | null; error: string | null }> {
  const sb = getSupabase();
  if (!sb) return { data: null, error: "Supabase is not configured" };

  const { data, error } = await sb.functions.invoke(name, { body });

  if (error) {
    let detail: string | null = null;
    if (error instanceof FunctionsHttpError) {
      try {
        const payload = await error.context.json();
        if (payload && typeof payload === "object" && "error" in payload) {
          detail = String((payload as { error: unknown }).error);
        }
      } catch {
        /* ignore */
      }
    }
    return { data: null, error: detail ?? error.message };
  }
  if (data && typeof data === "object" && "error" in data && data.error) {
    return { data: null, error: String((data as { error: unknown }).error) };
  }
  return { data: data as T, error: null };
}
