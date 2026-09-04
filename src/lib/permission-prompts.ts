/** Soft-prompt dismiss / snooze for browser permission requests. */

const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;

export type SoftPermissionKind = "notifications" | "location";

function storageKey(kind: SoftPermissionKind): string {
  return `inuabiz.soft_prompt.${kind}`;
}

export function isSoftPromptSnoozed(kind: SoftPermissionKind): boolean {
  if (typeof window === "undefined") return true;
  try {
    const raw = localStorage.getItem(storageKey(kind));
    if (!raw) return false;
    if (raw === "done") return true;
    const until = Number(raw);
    return Number.isFinite(until) && Date.now() < until;
  } catch {
    return false;
  }
}

export function snoozeSoftPrompt(kind: SoftPermissionKind): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(storageKey(kind), String(Date.now() + SNOOZE_MS));
  } catch {
    /* ignore */
  }
}

export function markSoftPromptDone(kind: SoftPermissionKind): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(storageKey(kind), "done");
  } catch {
    /* ignore */
  }
}

export function notificationPermissionState(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}

export async function geolocationPermissionState(): Promise<PermissionState | "unsupported"> {
  if (typeof window === "undefined" || !navigator.geolocation) return "unsupported";
  try {
    if (navigator.permissions?.query) {
      const status = await navigator.permissions.query({ name: "geolocation" });
      return status.state;
    }
  } catch {
    /* Safari / older browsers */
  }
  return "prompt";
}

export function requestCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("Geolocation is not available on this device."));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15_000,
      maximumAge: 60_000,
    });
  });
}
