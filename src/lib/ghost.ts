import { useSyncExternalStore } from "react";

const KEY = "inuabiz:ghost";

export type GhostSession = {
  tenantId: string;
  business: string;
  auditId?: string;
};

function read(): GhostSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as GhostSession) : null;
  } catch {
    return null;
  }
}

let current: GhostSession | null = read();
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export function getGhost(): GhostSession | null {
  return current;
}

export function subscribeGhost(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function startGhost(session: GhostSession): void {
  current = session;
  if (typeof window !== "undefined") {
    sessionStorage.setItem(KEY, JSON.stringify(session));
  }
  emit();
}

export function stopGhost(): void {
  current = null;
  if (typeof window !== "undefined") {
    sessionStorage.removeItem(KEY);
  }
  emit();
}

export function useGhost(): GhostSession | null {
  return useSyncExternalStore(subscribeGhost, getGhost, () => null);
}
