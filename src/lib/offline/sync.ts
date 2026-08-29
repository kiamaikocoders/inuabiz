import { invokeFunction } from "@/lib/supabase";
import { isBrowserOffline, probeOnline } from "@/lib/offline/connectivity";
import { listPendingOps, recordConflict, updateOp } from "@/lib/offline/outbox";
import { offlineDb, setMeta } from "@/lib/offline/db";
import type { Sale } from "@/lib/mock-data";

export type SyncBatchResult = {
  ok: boolean;
  results: Array<{
    client_op_id: string;
    status: "applied" | "conflict" | "needs_online" | "failed" | "skipped";
    code?: string;
    message?: string;
    sale_id?: string;
    product_id?: string;
    customer_id?: string;
    meta?: Record<string, unknown>;
  }>;
};

let syncing = false;

export function isSyncing(): boolean {
  return syncing;
}

export async function flushOutbox(): Promise<{
  flushed: number;
  conflicts: number;
  error?: string;
}> {
  if (syncing) return { flushed: 0, conflicts: 0 };
  if (isBrowserOffline()) {
    const online = await probeOnline();
    if (!online) return { flushed: 0, conflicts: 0, error: "offline" };
  }

  const pending = await listPendingOps();
  if (!pending.length) return { flushed: 0, conflicts: 0 };

  syncing = true;
  window.dispatchEvent(new Event("inuabiz-sync"));
  let flushed = 0;
  let conflicts = 0;

  try {
    for (const op of pending) {
      await updateOp(op.id, { status: "syncing", attempts: op.attempts + 1 });
    }

    const { data, error } = await invokeFunction<SyncBatchResult>("sync-offline-batch", {
      ops: pending.map((op) => ({
        client_op_id: op.id,
        type: op.type,
        payload: op.payload,
        created_at: op.createdAt,
      })),
    });

    if (error || !data) {
      for (const op of pending) {
        await updateOp(op.id, {
          status: "failed",
          lastError: error ?? "Sync failed",
        });
      }
      return { flushed: 0, conflicts: 0, error: error ?? "Sync failed" };
    }

    const byId = new Map(data.results.map((r) => [r.client_op_id, r]));

    for (const op of pending) {
      const result = byId.get(op.id);
      if (!result) {
        await updateOp(op.id, { status: "failed", lastError: "Missing result" });
        continue;
      }

      if (result.status === "applied" || result.status === "skipped") {
        await updateOp(op.id, {
          status: "applied",
          result: result as unknown as Record<string, unknown>,
          lastError: null,
          conflictCode: null,
        });
        await applyLocalResult(op.id, op.type, result);
        flushed += 1;
        continue;
      }

      if (result.status === "conflict") {
        conflicts += 1;
        await recordConflict({
          opId: op.id,
          code: result.code ?? "conflict",
          message: result.message ?? "Conflict while syncing",
          meta: result.meta ?? null,
        });
        continue;
      }

      if (result.status === "needs_online") {
        await updateOp(op.id, {
          status: "needs_online",
          lastError: result.message ?? "Needs network",
          conflictCode: result.code ?? null,
        });
        continue;
      }

      await updateOp(op.id, {
        status: "failed",
        lastError: result.message ?? "Failed",
        conflictCode: result.code ?? null,
      });
    }

    await setMeta("lastSyncAt", new Date().toISOString());
    return { flushed, conflicts };
  } finally {
    syncing = false;
    window.dispatchEvent(new Event("inuabiz-sync"));
    window.dispatchEvent(new Event("inuabiz-outbox"));
  }
}

async function applyLocalResult(
  opId: string,
  type: string,
  result: SyncBatchResult["results"][number],
): Promise<void> {
  if (!offlineDb) return;

  if (type === "checkout_sale" && result.sale_id) {
    const local = await offlineDb.sales.get(opId);
    if (local && local.id !== result.sale_id) {
      await offlineDb.sales.delete(opId);
      const next: Sale = {
        ...local,
        id: result.sale_id,
        ref: `SL-${result.sale_id.slice(0, 8).toUpperCase()}`,
      };
      await offlineDb.sales.put(next);
    } else if (local) {
      await offlineDb.sales.put({
        ...local,
        status: local.status === "Pending" ? "Pending" : local.status,
      });
    }
    await offlineDb.openSales.delete(opId);
    if (result.sale_id !== opId) await offlineDb.openSales.delete(result.sale_id);
  }

  if (type === "confirm_mpesa" && result.sale_id) {
    const sale = await offlineDb.sales.get(result.sale_id);
    if (sale) {
      await offlineDb.sales.put({ ...sale, status: "Complete" });
    }
    await offlineDb.openSales.delete(result.sale_id);
  }

  if (type === "save_product" && result.product_id) {
    const localId = String((await offlineDb.outbox.get(opId))?.payload["local_id"] ?? "");
    if (localId && localId !== result.product_id) {
      const product = await offlineDb.products.get(localId);
      if (product) {
        await offlineDb.products.delete(localId);
        await offlineDb.products.put({ ...product, id: result.product_id });
      }
    }
  }

  if (type === "save_customer" && result.customer_id) {
    const localId = String((await offlineDb.outbox.get(opId))?.payload["local_id"] ?? "");
    if (localId && localId !== result.customer_id) {
      const customer = await offlineDb.customers.get(localId);
      if (customer) {
        await offlineDb.customers.delete(localId);
        await offlineDb.customers.put({ ...customer, id: result.customer_id });
      }
      const shop = await offlineDb.shopCustomers.get(localId);
      if (shop) {
        await offlineDb.shopCustomers.delete(localId);
        await offlineDb.shopCustomers.put({ ...shop, id: result.customer_id });
      }
    }
  }
}

/** Auto-flush when the browser comes back online. */
export function startOfflineSyncWatcher(): () => void {
  if (typeof window === "undefined") return () => undefined;

  const onOnline = () => {
    void flushOutbox();
  };
  window.addEventListener("online", onOnline);
  window.addEventListener("inuabiz-outbox", () => {
    if (navigator.onLine) void flushOutbox();
  });

  // Kick once shortly after boot if we have a session.
  window.setTimeout(() => {
    if (navigator.onLine) void flushOutbox();
  }, 2500);

  return () => {
    window.removeEventListener("online", onOnline);
  };
}
