import { getSupabase, invokeFunction, isSupabaseConfigured } from "@/lib/supabase";
import { toE164Ke, to254 } from "@/lib/phone";
import { redirect } from "@tanstack/react-router";

export type VendorProfile = {
  id: string;
  tenant_id: string | null;
  role: string;
  full_name: string | null;
  phone: string | null;
  active_shop_id?: string | null;
  pending_shop_name?: string | null;
  onboarding_completed_at?: string | null;
};

function appOrigin(): string {
  return typeof window !== "undefined" ? window.location.origin : "https://app.inuabiz.co.ke";
}

function emailRedirectTo(path: string): string {
  return `${appOrigin()}${path}`;
}

export async function signUpWithEmail(input: {
  fullName: string;
  shopName: string;
  email: string;
  password: string;
}): Promise<{ demo: boolean; needsOtp: boolean }> {
  const sb = getSupabase();
  if (!sb) {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("inuabiz:signup", JSON.stringify(input));
    }
    return { demo: true, needsOtp: true };
  }
  const { data, error } = await sb.auth.signUp({
    email: input.email.trim(),
    password: input.password,
    options: {
      emailRedirectTo: emailRedirectTo("/signup"),
      data: {
        full_name: input.fullName.trim(),
        shop_name: input.shopName.trim(),
      },
    },
  });
  if (error) throw new Error(error.message);
  return { demo: false, needsOtp: !data.session };
}

export async function resendSignupOtp(email: string): Promise<{ demo: boolean }> {
  const sb = getSupabase();
  if (!sb) return { demo: true };
  const { error } = await sb.auth.resend({
    type: "signup",
    email: email.trim(),
    options: { emailRedirectTo: emailRedirectTo("/signup") },
  });
  if (error) throw new Error(error.message);
  return { demo: false };
}

export async function verifyEmailOtp(email: string, token: string): Promise<{ demo: boolean }> {
  const sb = getSupabase();
  if (!sb) return { demo: true };
  const first = await sb.auth.verifyOtp({
    email: email.trim(),
    token: token.trim(),
    type: "signup",
  });
  if (!first.error) return { demo: false };
  const second = await sb.auth.verifyOtp({
    email: email.trim(),
    token: token.trim(),
    type: "email",
  });
  if (second.error) throw new Error(second.error.message);
  return { demo: false };
}

export async function signInWithEmail(email: string, password: string): Promise<{ demo: boolean }> {
  const sb = getSupabase();
  if (!sb) return { demo: true };
  const { error } = await sb.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error) throw new Error(error.message);
  return { demo: false };
}

export async function sendPhoneOtp(phone: string): Promise<{ demo: boolean }> {
  const sb = getSupabase();
  if (!sb) return { demo: true };
  const { error } = await sb.auth.signInWithOtp({ phone: toE164Ke(phone) });
  if (error) throw new Error(error.message);
  return { demo: false };
}

export async function verifyPhoneOtp(phone: string, token: string): Promise<{ demo: boolean }> {
  const sb = getSupabase();
  if (!sb) return { demo: true };
  const { error } = await sb.auth.verifyOtp({
    phone: toE164Ke(phone),
    token,
    type: "sms",
  });
  if (error) throw new Error(error.message);
  return { demo: false };
}

export async function fetchProfile(): Promise<VendorProfile | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;
  const { data } = await sb
    .from("profiles")
    .select("id, tenant_id, role, full_name, phone, active_shop_id, pending_shop_name, onboarding_completed_at")
    .eq("id", user.id)
    .maybeSingle();
  return (data as VendorProfile | null) ?? null;
}

export async function completeOnboarding(input: {
  businessName: string;
  category: string;
  phone: string;
  destinationType: "PERSONAL_MPESA" | "TILL" | "PAYBILL";
  accountNumber: string;
  destinations?: Array<{
    type: "PERSONAL_MPESA" | "TILL" | "PAYBILL" | "POCHI";
    accountNumber: string;
    accountName?: string | null;
    isPrimary?: boolean;
  }>;
  lat?: number;
  lng?: number;
  fullName?: string;
  planCode?: "SHOP_MONTHLY" | "COMPLIANCE";
}): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const destinations = (input.destinations ?? []).map((d) => ({
    type: d.type,
    account_number: d.accountNumber,
    account_name: d.accountName ?? null,
    is_primary: Boolean(d.isPrimary),
  }));
  const primary =
    destinations.find((d) => d.is_primary) ??
    destinations[0] ?? {
      type: input.destinationType,
      account_number:
        input.destinationType === "PERSONAL_MPESA"
          ? to254(input.accountNumber)
          : input.accountNumber.replace(/\s/g, ""),
      account_name: null,
      is_primary: true,
    };

  const { error } = await sb.rpc("complete_vendor_onboarding", {
    p_business_name: input.businessName,
    p_category: input.category.toUpperCase(),
    p_phone: to254(input.phone),
    p_destination_type: primary.type as "PERSONAL_MPESA" | "TILL" | "PAYBILL" | "POCHI",
    p_account_number: String(primary.account_number),
    p_location_lat: input.lat ?? -1.2921,
    p_location_lng: input.lng ?? 36.8219,
    p_full_name: input.fullName ?? null,
    p_plan_code: input.planCode ?? "SHOP_MONTHLY",
    p_destinations: destinations.length
      ? destinations
      : [
          {
            type: input.destinationType,
            account_number:
              input.destinationType === "PERSONAL_MPESA"
                ? to254(input.accountNumber)
                : input.accountNumber.replace(/\s/g, ""),
            account_name: null,
            is_primary: true,
          },
        ],
  });
  if (error) throw new Error(error.message);
  const profile = await fetchProfile();
  if (profile?.tenant_id) {
    void invokeFunction("dispatch-outbound", {
      tenant_id: profile.tenant_id,
      template_id: "welcome-trial",
      idempotency_key: `welcome/${profile.tenant_id}`,
    });
  }
}

export async function updateProfile(patch: {
  full_name?: string;
  phone?: string;
}): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return;
  const { error } = await sb.from("profiles").update(patch).eq("id", user.id);
  if (error) throw new Error(error.message);
}

export async function signOut(): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  await sb.auth.signOut();
}

export async function sendPasswordReset(email: string): Promise<{ demo: boolean }> {
  const sb = getSupabase();
  if (!sb) return { demo: true };
  const { error } = await sb.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: emailRedirectTo("/login"),
  });
  if (error) throw new Error(error.message);
  return { demo: false };
}

export async function updatePassword(password: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.auth.updateUser({ password });
  if (error) throw new Error(error.message);
}

/** Redirect to login when Supabase is configured but there is no session. */
export async function requireAuthSession(): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const sb = getSupabase();
  if (!sb) return;
  const { data } = await sb.auth.getSession();
  if (!data.session) {
    throw redirect({ to: "/login" });
  }
}

/** Vendors must finish shop onboarding before using POS and the rest of the app. */
export async function requireVendorWorkspace(): Promise<void> {
  await requireAuthSession();
  if (!isSupabaseConfigured()) return;
  const profile = await fetchProfile();
  if (!profile) throw redirect({ to: "/login" });
  if (profile.role === "SUPER_ADMIN") return;
  if (!profile.tenant_id || !profile.onboarding_completed_at) {
    throw redirect({ to: "/onboarding" });
  }
}

export async function requireSuperAdmin(): Promise<void> {
  await requireAuthSession();
  if (!isSupabaseConfigured()) return;
  const profile = await fetchProfile();
  if (profile?.role !== "SUPER_ADMIN") {
    throw redirect({ to: "/403" });
  }
}
