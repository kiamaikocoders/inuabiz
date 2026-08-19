import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchProfile } from "@/lib/auth";

export type AppIdentity = {
  fullName: string;
  phone: string;
  role: string;
  shop: string;
  email: string;
};

export const DEMO_VENDOR: AppIdentity = {
  fullName: "Mama Njoroge",
  phone: "0722 431 002",
  role: "VENDOR_ADMIN",
  shop: "Njoroge Mini Mart",
  email: "njoroge@example.com",
};

export const DEMO_ADMIN: AppIdentity = {
  fullName: "Zachariah Komu",
  phone: "0700 000 001",
  role: "SUPER_ADMIN",
  shop: "InuaBiz Command Center",
  email: "zack@inuabiz.co.ke",
};

/** Two-letter initials from a display name. */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/** Human-readable role for the header and profile. */
export function roleLabel(role: string): string {
  if (role === "SUPER_ADMIN") return "Super admin";
  if (role === "VENDOR_ADMIN") return "Owner";
  if (role === "ATTENDANT") return "Attendant";
  return role.replaceAll("_", " ");
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

/**
 * Resolves the signed-in person for vendor or admin chrome.
 * Prefers a live Supabase profile, then session edits, then the demo identity.
 */
export function useIdentity(kind: "vendor" | "admin"): AppIdentity {
  const fallback = kind === "admin" ? DEMO_ADMIN : DEMO_VENDOR;
  const [, setTick] = useState(0);
  const { data } = useQuery({
    queryKey: ["identity"],
    queryFn: fetchProfile,
  });

  useEffect(() => {
    const refresh = () => setTick((n) => n + 1);
    window.addEventListener("inuabiz-identity", refresh);
    return () => window.removeEventListener("inuabiz-identity", refresh);
  }, []);

  const remote: Partial<AppIdentity> = data
    ? {
        fullName: data.full_name ?? fallback.fullName,
        phone: data.phone ?? fallback.phone,
        role: data.role || fallback.role,
      }
    : {};

  return {
    ...fallback,
    ...remote,
    ...readStored(kind),
  };
}
