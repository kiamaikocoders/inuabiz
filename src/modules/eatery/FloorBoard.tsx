import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { StatusEmpty } from "@/components/status/StatusPage";
import { LayoutGrid } from "lucide-react";
import { fetchFloorTables, setFloorTableStatus, type FloorTable } from "@/lib/ops";
import { isSupabaseConfigured } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const STATUSES: FloorTable["status"][] = ["FREE", "SEATED", "BILLING"];

function cycle(status: FloorTable["status"]): FloorTable["status"] {
  return STATUSES[(STATUSES.indexOf(status) + 1) % STATUSES.length]!;
}

export function FloorBoard() {
  const live = isSupabaseConfigured();
  const queryClient = useQueryClient();
  const { data: tables = [] } = useQuery({
    queryKey: ["floor-tables"],
    queryFn: fetchFloorTables,
    enabled: live,
  });
  const mutate = useMutation({
    mutationFn: ({ id, status }: { id: string; status: FloorTable["status"] }) =>
      setFloorTableStatus(id, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["floor-tables"] });
    },
    onError: (err: unknown) =>
      toast.error("Could not update table", {
        description: err instanceof Error ? err.message : "Try again",
      }),
  });

  if (!live) {
    return (
      <StatusEmpty
        icon={LayoutGrid}
        title="Sign in to run the floor"
        description="Tables persist per shop once you are on a live restaurant or eatery."
        primary={{ label: "Open till", to: "/app/pos" }}
      />
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {tables.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => mutate.mutate({ id: t.id, status: cycle(t.status) })}
          className={cn(
            "rounded-2xl border p-4 text-left transition-colors",
            t.status === "FREE" && "border-success/40 bg-success/10",
            t.status === "SEATED" && "border-primary/40 bg-primary/10",
            t.status === "BILLING" && "border-gold/50 bg-gold/15",
          )}
        >
          <p className="font-display text-xl font-bold">{t.label}</p>
          <p className="text-muted-foreground mt-1 text-xs">{t.seats} seats</p>
          <p className="mt-3 text-sm font-semibold">{t.status}</p>
        </button>
      ))}
    </div>
  );
}

export function FloorPage() {
  return (
    <AppShell
      title="Floor"
      description="Tap a table to cycle Free → Seated → Billing"
      actions={
        <Button variant="outline" size="sm" asChild>
          <Link to="/app/pos">Open till</Link>
        </Button>
      }
    >
      <FloorBoard />
    </AppShell>
  );
}
