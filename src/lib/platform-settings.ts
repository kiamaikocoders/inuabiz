import { getSupabase, invokeFunction } from "@/lib/supabase";

export type PlatformSettingsMap = Record<string, string | boolean | number>;

function stripJson(value: unknown): string {
  if (typeof value === "string") return value.replace(/^"|"$/g, "");
  if (value == null) return "";
  return String(value).replace(/^"|"$/g, "");
}

export async function fetchPlatformSettings(keys: string[]): Promise<Record<string, string>> {
  const sb = getSupabase();
  if (!sb) return {};
  const { data, error } = await sb.from("platform_settings").select("key, value").in("key", keys);
  if (error || !data) return {};
  const out: Record<string, string> = {};
  for (const row of data) {
    out[row.key as string] = stripJson(row.value);
  }
  return out;
}

export async function savePlatformSettings(
  patch: Record<string, string | boolean | number>,
): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase is not configured");
  const rows = Object.entries(patch).map(([key, value]) => ({
    key,
    value: typeof value === "string" ? JSON.stringify(value) : value,
    updated_at: new Date().toISOString(),
  }));
  const { error } = await sb.from("platform_settings").upsert(rows, { onConflict: "key" });
  if (error) throw new Error(error.message);
}

export type OperatorRow = {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  role: string;
};

export async function fetchOperators(): Promise<OperatorRow[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data: profiles, error } = await sb
    .from("profiles")
    .select("id, full_name, phone, role")
    .eq("role", "SUPER_ADMIN")
    .eq("is_active", true)
    .order("full_name");
  if (error || !profiles) return [];
  const rows: OperatorRow[] = [];
  for (const p of profiles) {
    let email: string | null = null;
    try {
      // Email is on auth.users — edge not required for display; leave blank if unavailable
      email = null;
    } catch {
      email = null;
    }
    rows.push({
      id: p.id as string,
      full_name: (p.full_name as string | null) ?? null,
      phone: (p.phone as string | null) ?? null,
      email,
      role: String(p.role),
    });
  }
  return rows;
}

export async function inviteVendorEmail(to: string, note?: string): Promise<void> {
  const { error } = await invokeFunction("dispatch-outbound", {
    template_id: "invite-vendor",
    to,
    vars: {
      cta_url: "https://inuabiz.co.ke/signup",
      note: note ?? "",
    },
  });
  if (error) throw new Error(error);
}
