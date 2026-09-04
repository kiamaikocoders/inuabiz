import { getSupabase, invokeFunction, isSupabaseConfigured } from "@/lib/supabase";
import { toE164Ke, to254 } from "@/lib/phone";
import { redirect } from "@tanstack/react-router";
import { cacheProfile, clearVendorReplica, ensureReplicaOwner, readCachedProfile } from "@/lib/offline/db";
import { isBrowserOffline, probeOnline } from "@/lib/offline/connectivity";

export type VendorProfile = {
  id: string;
  tenant_id: string | null;
  role: string;
  full_name: string | null;
  phone: string | null;
  avatar_url?: string | null;
  active_shop_id?: string | null;
  pending_shop_name?: string | null;
  onboarding_completed_at?: string | null;
};

function appOrigin(): string {
  return typeof window !== "undefined" ? window.location.origin : "https://inuabiz.co.ke";
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
      emailRedirectTo: emailRedirectTo("/onboarding"),
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
    options: { emailRedirectTo: emailRedirectTo("/onboarding") },
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
  if (!sb) return readCachedProfile();

  // Offline / flaky network: never call getUser() (hits Auth server).
  if (isBrowserOffline()) {
    const online = await probeOnline();
    if (!online) return readCachedProfile();
  }

  try {
    const { data: sessionData } = await sb.auth.getSession();
    const userId = sessionData.session?.user?.id;
    if (!userId) {
      // Last resort online validation — only when we have no local session.
      const {
        data: { user },
      } = await sb.auth.getUser();
      if (!user) return null;
      const { data } = await sb
        .from("profiles")
        .select(
          "id, tenant_id, role, full_name, phone, avatar_url, active_shop_id, pending_shop_name, onboarding_completed_at",
        )
        .eq("id", user.id)
        .maybeSingle();
      if (data) {
        const profile = data as VendorProfile;
        await ensureReplicaOwner({ userId: profile.id, tenantId: profile.tenant_id });
        await cacheProfile(profile);
        return profile;
      }
      return null;
    }

    const { data, error } = await sb
      .from("profiles")
      .select(
        "id, tenant_id, role, full_name, phone, avatar_url, active_shop_id, pending_shop_name, onboarding_completed_at",
      )
      .eq("id", userId)
      .maybeSingle();
    if (error || !data) {
      const cached = await readCachedProfile();
      if (cached?.id === userId) return cached;
      return null;
    }
    const profile = data as VendorProfile;
    await ensureReplicaOwner({ userId: profile.id, tenantId: profile.tenant_id });
    await cacheProfile(profile);
    return profile;
  } catch {
    try {
      const cached = await readCachedProfile();
      const { data: sessionData } = await sb.auth.getSession();
      if (cached && sessionData.session?.user?.id === cached.id) return cached;
    } catch {
      // Prefer empty over another account's profile.
    }
    return null;
  }
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
  addressText?: string;
  fullName?: string;
  planCode?: "SHOP_MONTHLY" | "COMPLIANCE";
  kraPin?: string | null;
}): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const destinations = (input.destinations ?? []).map((d) => ({
    type: d.type,
    account_number: d.accountNumber,
    account_name: d.accountName ?? null,
    is_primary: Boolean(d.isPrimary),
  }));
  const primary = destinations.find((d) => d.is_primary) ??
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
    p_address_text: input.addressText ?? null,
    p_full_name: input.fullName ?? null,
    p_plan_code: input.planCode ?? "SHOP_MONTHLY",
    p_kra_pin: input.kraPin ?? null,
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
  avatar_url?: string | null;
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
  try {
    await clearVendorReplica();
  } catch {
    // IndexedDB may be unavailable; still sign out of Auth.
  }
  if (typeof window !== "undefined") {
    sessionStorage.removeItem("inuabiz:lastSale");
  }
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

export function friendlyMfaError(message: string): string {
  if (/mfa|not enabled|disabled|unsupported|enroll/i.test(message)) {
    return "Authenticator codes are not available on this account yet. Try again later, or email hello@inuabiz.co.ke.";
  }
  return message;
}

/** Re-auth with the current password, then set a new one. TOTP is required if MFA is enrolled. */
export async function changePassword(
  current: string,
  next: string,
  totpCode?: string,
): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { data } = await sb.auth.getUser();
  const email = data.user?.email?.trim();
  if (!email) throw new Error("This account has no email to confirm the change");
  const { error: reauth } = await sb.auth.signInWithPassword({ email, password: current });
  if (reauth) throw new Error("Current password is incorrect");
  if (await mfaNeedsChallenge()) {
    if (!totpCode?.trim()) throw new Error("Enter the 6-digit code from your authenticator app");
    await challengeAndVerifyTotp(totpCode);
  }
  const { error } = await sb.auth.updateUser({ password: next });
  if (error) throw new Error(error.message);
}

export type AuthAccount = {
  email: string;
  lastSignInAt: string | null;
};

export async function fetchAuthAccount(): Promise<AuthAccount | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb.auth.getUser();
  const user = data.user;
  if (!user) return null;
  return {
    email: user.email ?? "",
    lastSignInAt: user.last_sign_in_at ?? null,
  };
}

export async function totpFactorEnabled(): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  const { data, error } = await sb.auth.mfa.listFactors();
  if (error) return false;
  return (data.totp ?? []).some((factor) => factor.status === "verified");
}

export async function enrollTotp(): Promise<{ factorId: string; qr: string; secret: string }> {
  const sb = getSupabase();
  if (!sb) throw new Error("Sign in is offline in this demo.");
  const listed = await sb.auth.mfa.listFactors();
  for (const factor of listed.data?.all ?? []) {
    if (factor.factor_type === "totp" && factor.status === "unverified") {
      await sb.auth.mfa.unenroll({ factorId: factor.id });
    }
  }
  const { data, error } = await sb.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: "InuaBiz",
  });
  if (error || !data)
    throw new Error(friendlyMfaError(error?.message ?? "Could not start two-factor setup"));
  if (data.type !== "totp" || !data.totp) throw new Error("Authenticator setup is not available");
  return { factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret };
}

export async function verifyTotpEnrollment(factorId: string, code: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const challenge = await sb.auth.mfa.challenge({ factorId });
  if (challenge.error || !challenge.data) {
    throw new Error(challenge.error?.message ?? "Could not start verification");
  }
  const verified = await sb.auth.mfa.verify({
    factorId,
    challengeId: challenge.data.id,
    code: code.trim(),
  });
  if (verified.error) throw new Error(verified.error.message);
  await sb.auth.refreshSession();
}

export async function disableTotp(code?: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  if (!code?.trim()) throw new Error("Enter the 6-digit code from your authenticator app");
  await challengeAndVerifyTotp(code);
  const { data, error } = await sb.auth.mfa.listFactors();
  if (error) throw new Error(error.message);
  const factor = (data.totp ?? []).find((item) => item.status === "verified");
  if (!factor) return;
  const { error: unenrollError } = await sb.auth.mfa.unenroll({ factorId: factor.id });
  if (unenrollError) throw new Error(unenrollError.message);
  await sb.auth.refreshSession();
}

export async function mfaNeedsChallenge(): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  const { data, error } = await sb.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error || !data) return false;
  return data.nextLevel === "aal2" && data.currentLevel !== "aal2";
}

export async function challengeAndVerifyTotp(code: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const factors = await sb.auth.mfa.listFactors();
  if (factors.error) throw new Error(factors.error.message);
  const factor = (factors.data.totp ?? []).find((item) => item.status === "verified");
  if (!factor) throw new Error("No authenticator is set up on this account");
  const challenge = await sb.auth.mfa.challenge({ factorId: factor.id });
  if (challenge.error || !challenge.data) {
    throw new Error(challenge.error?.message ?? "Could not start verification");
  }
  const verified = await sb.auth.mfa.verify({
    factorId: factor.id,
    challengeId: challenge.data.id,
    code: code.trim(),
  });
  if (verified.error) throw new Error(verified.error.message);
}

export async function signOutOtherSessions(): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.auth.signOut({ scope: "others" });
  if (error) throw new Error(error.message);
}

export function describeThisDevice(): { title: string; detail: string } {
  if (typeof navigator === "undefined") {
    return { title: "This device", detail: "Current session" };
  }
  const ua = navigator.userAgent;
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /Chrome\//.test(ua)
      ? "Chrome"
      : /Firefox\//.test(ua)
        ? "Firefox"
        : /Safari\//.test(ua)
          ? "Safari"
          : "Browser";
  const os = /Windows NT/.test(ua)
    ? "Windows"
    : /Mac OS X/.test(ua)
      ? "macOS"
      : /Android/.test(ua)
        ? "Android"
        : /iPhone|iPad/.test(ua)
          ? "iOS"
          : /Linux/.test(ua)
            ? "Linux"
            : "This device";
  return { title: `${os} · ${browser}`, detail: "This device · Active now" };
}

/** Redirect to login when Supabase is configured but there is no session. */
export async function requireAuthSession(): Promise<void> {
  if (!isSupabaseConfigured()) return;
  // Auth tokens live in the browser. SSR has no localStorage, so a reload
  // would look logged-out and bounce to /login if we checked on the server.
  if (typeof window === "undefined") return;
  const sb = getSupabase();
  if (!sb) return;
  const { data } = await sb.auth.getSession();
  if (!data.session) {
    // Offline with a previously hydrated profile: stay in the shop.
    const cached = await readCachedProfile();
    if (cached && isBrowserOffline()) return;
    throw redirect({ to: "/login" });
  }
}

/** Vendors must finish shop onboarding before using POS and the rest of the app. */
export async function requireVendorWorkspace(): Promise<void> {
  await requireAuthSession();
  if (!isSupabaseConfigured()) return;
  const profile = await fetchProfile();
  if (!profile) {
    const cached = await readCachedProfile();
    if (cached?.tenant_id && cached.onboarding_completed_at) return;
    throw redirect({ to: "/login" });
  }
  if (profile.role === "SUPER_ADMIN") return;
  if (!profile.tenant_id || !profile.onboarding_completed_at) {
    // Do not bounce to onboarding when offline with a known completed shop.
    if (isBrowserOffline()) {
      const cached = await readCachedProfile();
      if (cached?.tenant_id && cached.onboarding_completed_at) return;
    }
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
