import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Megaphone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchActiveBroadcasts, type PlatformBroadcast } from "@/lib/communications";
import { fetchBillingSnapshot } from "@/lib/payments";
import { isSupabaseConfigured } from "@/lib/supabase";

const DISMISS_KEY = "inuabiz:dismissed-broadcasts";

function readDismissed(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(DISMISS_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function writeDismissed(ids: string[]) {
  window.localStorage.setItem(DISMISS_KEY, JSON.stringify(ids.slice(-40)));
}

function matchesAudience(broadcast: PlatformBroadcast, status: string | undefined): boolean {
  const st = (status ?? "").toUpperCase();
  if (broadcast.audience === "active") return st === "ACTIVE";
  if (broadcast.audience === "trial") return st === "TRIAL";
  if (broadcast.audience === "lapsed") return ["PAST_DUE", "SUSPENDED", "CANCELLED"].includes(st);
  return true;
}

export function BroadcastBanner() {
  const live = isSupabaseConfigured();
  const [dismissed, setDismissed] = useState<string[]>([]);
  const { data: broadcasts = [] } = useQuery({
    queryKey: ["active-broadcasts"],
    queryFn: fetchActiveBroadcasts,
    enabled: live,
    refetchInterval: 60_000,
  });
  const { data: billing } = useQuery({
    queryKey: ["billing"],
    queryFn: fetchBillingSnapshot,
    enabled: live,
  });

  useEffect(() => {
    setDismissed(readDismissed());
  }, []);

  const active = useMemo(() => {
    const now = Date.now();
    return broadcasts.find((b) => {
      if (dismissed.includes(b.id)) return false;
      if (b.ends_at && new Date(b.ends_at).getTime() < now) return false;
      if (b.starts_at && new Date(b.starts_at).getTime() > now) return false;
      return matchesAudience(b, billing?.status);
    });
  }, [broadcasts, dismissed, billing?.status]);

  if (!active) return null;

  return (
    <div className="mb-4 flex items-start gap-3 rounded-xl border border-primary/25 bg-primary-soft/70 px-4 py-3">
      <span className="bg-primary text-primary-foreground mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg">
        <Megaphone className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{active.title}</p>
        <p className="text-muted-foreground mt-0.5 text-sm leading-relaxed">{active.body}</p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="size-8 shrink-0"
        aria-label="Dismiss notice"
        onClick={() => {
          const next = [...dismissed, active.id];
          setDismissed(next);
          writeDismissed(next);
        }}
      >
        <X className="size-4" />
      </Button>
    </div>
  );
}
