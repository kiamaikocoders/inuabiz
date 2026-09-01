import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, RefreshCw } from "lucide-react";
import { AdminShell } from "@/components/app/AdminShell";
import { IntelligenceDashboard } from "@/components/admin/IntelligenceDashboard";
import { Button } from "@/components/ui/button";
import { fetchProductIntelligence } from "@/lib/admin-intelligence";
import { privateHead } from "@/lib/seo";
import { isSupabaseConfigured } from "@/lib/supabase";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/intelligence")({
  head: () => privateHead("Product intelligence — InuaBiz admin"),
  component: Intelligence,
});

const RANGE_OPTIONS = [
  { days: 1, label: "24h" },
  { days: 7, label: "7d" },
  { days: 30, label: "30d" },
  { days: 90, label: "90d" },
] as const;

function windowLabel(days: number): string {
  return days === 1 ? "24h" : `${days}d`;
}

function Intelligence() {
  const live = isSupabaseConfigured();
  const [days, setDays] = useState(30);

  const { data, isFetching, refetch, error } = useQuery({
    queryKey: ["admin-product-intelligence", days],
    queryFn: () => fetchProductIntelligence(days),
    enabled: live,
    refetchInterval: 120_000,
  });

  return (
    <AdminShell
      title="Product intelligence"
      description="Funnel, cohorts, friction and what-if — analytics dashboard."
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <div className="bg-muted/60 flex rounded-full p-0.5">
            {RANGE_OPTIONS.map(({ days: d, label }) => (
              <Button
                key={d}
                size="sm"
                variant={days === d ? "default" : "ghost"}
                className={cn(
                  "h-8 rounded-full px-3 text-xs",
                  days !== d && "text-muted-foreground hover:text-foreground",
                )}
                onClick={() => setDays(d)}
              >
                {label}
              </Button>
            ))}
          </div>
          <Button size="sm" variant="outline" className="rounded-full">
            <Download className="size-3.5" />
            Export
          </Button>
          <Button size="sm" variant="ink" className="rounded-full" disabled={isFetching} onClick={() => void refetch()}>
            <RefreshCw className={cn("size-3.5", isFetching && "animate-spin")} />
            Refresh
          </Button>
        </div>
      }
    >
      {!live ? (
        <p className="text-muted-foreground text-sm">Connect Supabase to load live funnel metrics.</p>
      ) : error ? (
        <p className="text-destructive text-sm">
          {error instanceof Error ? error.message : "Could not load intelligence payload."} Apply
          the product_intelligence migration if this RPC is missing.
        </p>
      ) : (
        <IntelligenceDashboard data={data} windowLabel={windowLabel(days)} />
      )}
    </AdminShell>
  );
}
