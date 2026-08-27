import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchAuthAccount, fetchProfile } from "@/lib/auth";
import { fetchShops, fetchTenantHeader } from "@/lib/ops";

export type AppIdentity = {
  fullName: string;
  phone: string;
  role: string;
  shop: string;
  email: string;
  avatarUrl: string;
};

const EMPTY: AppIdentity = {
  fullName: "",
  phone: "",
  role: "",
  shop: "",
  email: "",
  avatarUrl: "",
};

/** Two-letter initials from a display name. */
export function initials(name: string): string {
  const letters = name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return letters || "IB";
}

/** Human-readable role for the header and profile. */
export function roleLabel(role: string): string {
  if (role === "SUPER_ADMIN") return "Super admin";
  if (role === "VENDOR_ADMIN") return "Owner";
  if (role === "VENDOR_STAFF") return "Staff";
  if (role === "ATTENDANT") return "Attendant";
  return role.replaceAll("_", " ") || "Signed in";
}

/** True when the vendor session can edit shop, till and staff. */
export function isVendorOwner(role: string): boolean {
  return role === "VENDOR_ADMIN" || role === "OWNER";
}

function storageKey(kind: "vendor" | "admin"): string {
  return `inuabiz.identity.${kind}`;
}

function readStored(kind: "vendor" | "admin"): Partial<AppIdentity> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(storageKey(kind));
    return raw ? (JSON.parse(raw) as Partial<AppIdentity>) : null;
  } catch {
    return null;
  }
}

/**
 * Saves profile edits for the current session so the header menu updates immediately.
 */
export function persistIdentity(kind: "vendor" | "admin", patch: Partial<AppIdentity>): void {
  const next = { ...readStored(kind), ...patch };
  sessionStorage.setItem(storageKey(kind), JSON.stringify(next));
  window.dispatchEvent(new Event("inuabiz-identity"));
}

/** Clears demo/session profile overlay on sign-out. */
export function clearStoredIdentity(): void {
  sessionStorage.removeItem(storageKey("vendor"));
  sessionStorage.removeItem(storageKey("admin"));
  window.dispatchEvent(new Event("inuabiz-identity"));
}

function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/).filter(Boolean)[0] ?? "";
}

export function greetingFor(fullName: string): string {
  const hour = new Date().getHours();
  const hello = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const name = firstName(fullName);
  return name ? `${hello}, ${name}` : hello;
}

const LOCALE_KEY = "inuabiz:locale";

export type AppLocale = "en-KE" | "sw";

export function readAppLocale(): AppLocale {
  if (typeof window === "undefined") return "en-KE";
  return window.localStorage.getItem(LOCALE_KEY) === "sw" ? "sw" : "en-KE";
}

export function persistAppLocale(locale: AppLocale): void {
  window.localStorage.setItem(LOCALE_KEY, locale);
}

/**
 * Resolves the signed-in person for vendor or admin chrome.
 * Prefers a live Supabase profile, then session edits. Never invents a shop or person.
 */
export function useIdentity(kind: "vendor" | "admin"): AppIdentity {
  const [, setTick] = useState(0);
  const { data } = useQuery({
    queryKey: ["identity"],
    queryFn: fetchProfile,
  });
  const { data: account } = useQuery({
    queryKey: ["auth-account"],
    queryFn: fetchAuthAccount,
  });
  const { data: header } = useQuery({
    queryKey: ["tenant-header"],
    queryFn: fetchTenantHeader,
    enabled: kind === "vendor",
  });
  const { data: shops = [] } = useQuery({
    queryKey: ["shops"],
    queryFn: fetchShops,
    enabled: kind === "vendor",
  });

  useEffect(() => {
    const refresh = () => setTick((n) => n + 1);
    window.addEventListener("inuabiz-identity", refresh);
    return () => window.removeEventListener("inuabiz-identity", refresh);
  }, []);

  const shop =
    shops.find((s) => s.id === data?.active_shop_id)?.name ||
    shops[0]?.name ||
    header?.name ||
    data?.pending_shop_name ||
    "";

  const remote: Partial<AppIdentity> = data
    ? {
        fullName: data.full_name ?? "",
        phone: data.phone ?? "",
        role: data.role || (kind === "admin" ? "SUPER_ADMIN" : "VENDOR_ADMIN"),
        shop: kind === "admin" ? "InuaBiz" : shop,
        avatarUrl: data.avatar_url ?? "",
      }
    : { shop: kind === "admin" ? "InuaBiz" : shop };

  const stored = readStored(kind);
  return {
    ...EMPTY,
    ...remote,
    ...stored,
    email: account?.email || stored?.email || "",
    avatarUrl: stored?.avatarUrl || remote.avatarUrl || "",
  };
}
