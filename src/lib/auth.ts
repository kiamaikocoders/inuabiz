import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { toE164Ke, to254 } from "@/lib/phone";
import { redirect } from "@tanstack/react-router";

export type VendorProfile = {
  id: string;
  tenant_id: string | null;
  role: string;
  full_name: string | null;
  phone: string | null;
};

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
    .select("id, tenant_id, role, full_name, phone")
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
  lat?: number;
  lng?: number;
}): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.rpc("complete_vendor_onboarding", {
    p_business_name: input.businessName,
    p_category: input.category.toUpperCase(),
    p_phone: to254(input.phone),
    p_destination_type: input.destinationType,
    p_account_number:
      input.destinationType === "PERSONAL_MPESA"
        ? to254(input.accountNumber)
        : input.accountNumber.replace(/\s/g, ""),
    p_location_lat: input.lat ?? -1.2921,
    p_location_lng: input.lng ?? 36.8219,
  });
  if (error) throw new Error(error.message);
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
