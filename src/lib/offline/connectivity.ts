/** True when the browser reports no network (best-effort; probe separately for UI). */
export function isBrowserOffline(): boolean {
  if (typeof navigator === "undefined") return false;
  return navigator.onLine === false;
}

/** Probe same-origin to distinguish "Linux onLine quirk" from real offline. */
export async function probeOnline(): Promise<boolean> {
  if (typeof window === "undefined") return true;
  try {
    const response = await fetch(`/favicon.svg?ping=${Date.now()}`, {
      method: "HEAD",
      cache: "no-store",
    });
    return response.ok;
  } catch {
    return false;
  }
}
