import { useEffect, useState } from "react";
import { CloudOff, RefreshCw, AlertTriangle } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useNetworkOnline } from "@/lib/network";
import { countConflicts, countPendingOps } from "@/lib/offline/outbox";
import { flushOutbox, isSyncing } from "@/lib/offline/sync";
import { cn } from "@/lib/utils";

/**
 * Persistent offline / pending-sync banner for the shop shell.
 * Replaces the old full-screen OfflineStatus lock.
 */
export function OfflineBanner({ className }: { className?: string }) {
  const { online, retry } = useNetworkOnline();
  const [pending, setPending] = useState(0);
  const [conflicts, setConflicts] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [busy, setBusy] = useState(false);

  const refreshCounts = () => {
    void countPendingOps().then(setPending);
    void countConflicts().then(setConflicts);
    setSyncing(isSyncing());
  };

  useEffect(() => {
    refreshCounts();
    const onChange = () => refreshCounts();
    window.addEventListener("inuabiz-outbox", onChange);
    window.addEventListener("inuabiz-sync", onChange);
    window.addEventListener("online", onChange);
    window.addEventListener("offline", onChange);
    return () => {
      window.removeEventListener("inuabiz-outbox", onChange);
      window.removeEventListener("inuabiz-sync", onChange);
      window.removeEventListener("online", onChange);
      window.removeEventListener("offline", onChange);
    };
  }, []);

  if (online && pending === 0 && conflicts === 0 && !syncing) return null;

  const syncNow = async () => {
    setBusy(true);
    const ok = online ? true : await retry();
    if (ok) await flushOutbox();
    refreshCounts();
    setBusy(false);
  };

  return (
    <div
      className={cn(
        "mb-4 flex flex-col gap-2 rounded-xl border px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between",
        !online
          ? "border-amber-500/40 bg-amber-500/10 text-amber-950 dark:text-amber-50"
          : conflicts > 0
            ? "border-destructive/40 bg-destructive/10"
            : "border-primary/30 bg-primary/10",
        className,
      )}
      role="status"
    >
      <div className="flex min-w-0 items-start gap-2">
        {!online ? (
          <CloudOff className="mt-0.5 size-4 shrink-0" />
        ) : conflicts > 0 ? (
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
        ) : (
          <RefreshCw className={cn("mt-0.5 size-4 shrink-0", syncing && "animate-spin")} />
        )}
        <div className="min-w-0">
          <p className="font-semibold">
            {!online
              ? "You're offline — keep selling"
              : conflicts > 0
                ? `${conflicts} sync conflict${conflicts === 1 ? "" : "s"} need review`
                : syncing
                  ? "Syncing queued sales…"
                  : `${pending} change${pending === 1 ? "" : "s"} waiting to sync`}
          </p>
          <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed dark:text-inherit/80">
            {!online
              ? "Cash, credit and parked sales are saved on this phone. M-Pesa confirmation and billing need signal."
              : conflicts > 0
                ? "Stock or ledger did not match the server. Review on Sales, then retry."
                : "We'll push them when the connection is steady."}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {conflicts > 0 && (
          <Button size="sm" variant="outline" asChild>
            <Link to="/app/sales">Review</Link>
          </Button>
        )}
        <Button
          size="sm"
          variant={!online ? "secondary" : "default"}
          disabled={busy || syncing}
          onClick={() => void syncNow()}
        >
          <RefreshCw className={cn("mr-1.5 size-3.5", (busy || syncing) && "animate-spin")} />
          {online ? "Sync now" : "Retry"}
        </Button>
      </div>
    </div>
  );
}
