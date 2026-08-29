import { offlineDb, type OfflineOp, type OfflineOpType, type SyncConflict } from "@/lib/offline/db";

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `op-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function enqueueOp(
  type: OfflineOpType,
  payload: Record<string, unknown>,
  id?: string,
): Promise<OfflineOp> {
  if (!offlineDb) throw new Error("Offline store unavailable");
  const op: OfflineOp = {
    id: id ?? uuid(),
    type,
    payload,
    createdAt: new Date().toISOString(),
    status: "pending",
    attempts: 0,
    lastError: null,
    conflictCode: null,
    result: null,
  };
  await offlineDb.outbox.put(op);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("inuabiz-outbox", { detail: { op } }));
  }
  return op;
}

export async function listPendingOps(): Promise<OfflineOp[]> {
  if (!offlineDb) return [];
  return offlineDb.outbox
    .where("status")
    .anyOf(["pending", "failed", "needs_online"])
    .sortBy("createdAt");
}

export async function countPendingOps(): Promise<number> {
  if (!offlineDb) return 0;
  return offlineDb.outbox
    .where("status")
    .anyOf(["pending", "failed", "needs_online", "conflict", "syncing"])
    .count();
}

export async function countConflicts(): Promise<number> {
  if (!offlineDb) return 0;
  return offlineDb.conflicts.filter((c) => !c.resolved).count();
}

export async function listUnresolvedConflicts(): Promise<SyncConflict[]> {
  if (!offlineDb) return [];
  return offlineDb.conflicts
    .filter((c) => !c.resolved)
    .reverse()
    .sortBy("createdAt");
}

export async function markConflictResolved(id: string): Promise<void> {
  if (!offlineDb) return;
  await offlineDb.conflicts.update(id, { resolved: true });
  window.dispatchEvent(new Event("inuabiz-outbox"));
}

export async function updateOp(id: string, patch: Partial<OfflineOp>): Promise<void> {
  if (!offlineDb) return;
  await offlineDb.outbox.update(id, patch);
  window.dispatchEvent(new Event("inuabiz-outbox"));
}

export async function recordConflict(input: {
  opId: string;
  code: string;
  message: string;
  meta?: Record<string, unknown> | null;
}): Promise<void> {
  if (!offlineDb) return;
  const conflict: SyncConflict = {
    id: uuid(),
    opId: input.opId,
    code: input.code,
    message: input.message,
    createdAt: new Date().toISOString(),
    resolved: false,
    meta: input.meta ?? null,
  };
  await offlineDb.conflicts.put(conflict);
  await updateOp(input.opId, {
    status: "conflict",
    conflictCode: input.code,
    lastError: input.message,
  });
}
