import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Brain, Package, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app/AppShell";
import { StatCard } from "@/components/app/StatCard";
import { StatusEmpty } from "@/components/status/StatusPage";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { KES } from "@/lib/mock-data";
import { generateLiveInsights } from "@/lib/ai";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/insights")({
  head: () => ({
    meta: [
      { title: "AI financial intelligence — InuaBiz" },
      {
        name: "description",
        content:
          "Predictive cash-flow forecasting, reorder recommendations, margin warnings and customer retention alerts in plain language.",
      },
      { property: "og:title", content: "InuaBiz AI insights" },
      {
        property: "og:description",
        content: "Cash-flow forecasts and reorder advice for your shop, in plain language.",
      },
    ],
  }),
  component: Insights,
});

function Insights() {
  const queryClient = useQueryClient();
  const { data, isFetching } = useQuery({
    queryKey: ["live-insights"],
    queryFn: generateLiveInsights,
  });

  const cards = data?.items ?? [];
  const model = data?.model ?? "—";
  const cashflow = data?.cashflow ?? [];
  const bestsellers = data?.bestsellers ?? [];
  const forecast30 = Math.round((data?.revenueKes ?? 0) * (30 / 7));
  const workingCapital = Math.round(forecast30 * 0.15);

  const refresh = () => {
    void queryClient
      .invalidateQueries({ queryKey: ["live-insights"] })
      .then(() =>
        toast.success("Insights refreshed", {
          description:
            data?.source === "supabase"
              ? "From generate-ai-insights"
              : data?.source === "gateway"
                ? "From WYA AI gateway (Gemini)"
                : "From your sales and stock",
        }),
      )
      .catch((err: unknown) =>
        toast.error("Could not refresh insights", {
          description: err instanceof Error ? err.message : "Try again",
        }),
      );
  };

  return (
    <AppShell
      title="AI insights"
      description="What your numbers are trying to tell you"
      actions={
        <Button size="sm" variant="outline" onClick={refresh} disabled={isFetching}>
          <RefreshCw className={cn("mr-2 size-4", isFetching && "animate-spin")} /> Refresh
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="30-day run-rate" value={KES(forecast30)} icon={Brain} />
        <StatCard
          label="Working capital needed"
          value={KES(workingCapital)}
          hint="~15% of run-rate"
          tone="gold"
        />
        <StatCard
          label="Reorder actions"
          value={String(data?.reorderCount ?? 0)}
          hint="below threshold"
          tone="danger"
        />
        <StatCard
          label="Paid sales (7d)"
          value={String(data?.saleCount ?? 0)}
          hint={KES(data?.revenueKes ?? 0)}
        />
      </div>

      <div className="surface-card mt-4 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold">Cash-flow forecast</h2>
            <p className="text-muted-foreground text-xs">Actual weekly revenue and a 2-week average outlook</p>
          </div>
          <Badge variant="secondary">
            <Sparkles className="mr-1 size-3" /> {model}
          </Badge>
        </div>
        <div className="mt-5 h-72">
          {cashflow.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={cashflow} margin={{ left: -10, right: 8, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="week" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid var(--color-border)",
                    background: "var(--color-card)",
                    fontSize: 12,
                  }}
                  formatter={(v: number) => KES(v)}
                />
                <Line
                  type="monotone"
                  dataKey="actual"
                  stroke="var(--color-chart-1)"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                  connectNulls={false}
                />
                <Line
                  type="monotone"
                  dataKey="forecast"
                  stroke="var(--color-chart-2)"
                  strokeWidth={2.5}
                  strokeDasharray="6 5"
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-muted-foreground grid h-full place-items-center text-sm">
              Weekly revenue plots after the first paid sales.
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {cards.length === 0 ? (
            <div className="surface-card">
              <StatusEmpty
                icon={Sparkles}
                title="No insights yet"
                description="Record sales and set reorder levels. Refresh to generate a cash-flow read from this till — we will not invent SKUs."
                primary={{ label: "Open POS", to: "/app/pos" }}
                secondary={{ label: "Inventory", to: "/app/inventory" }}
              />
            </div>
          ) : (
            cards.map((i) => (
              <div key={i.id} className="surface-card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Badge variant="outline">{i.kind}</Badge>
                    <h3 className="mt-2.5 font-semibold leading-snug">{i.title}</h3>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-muted-foreground text-[11px]">confidence</p>
                    <p className="font-display text-sm font-bold">{i.confidence}%</p>
                  </div>
                </div>
                <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{i.body}</p>
                <div className="mt-4 flex gap-2">
                  <Button size="sm" asChild>
                    <Link to={i.kind === "Reorder" ? "/app/inventory" : "/app/sales"}>Act on this</Link>
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="surface-card h-fit p-5">
          <h2 className="font-semibold">Bestsellers</h2>
          <p className="text-muted-foreground text-xs">Last 7 days by revenue</p>
          <div className="mt-4 space-y-4">
            {bestsellers.length === 0 ? (
              <p className="text-muted-foreground inline-flex items-center gap-2 text-sm">
                <Package className="size-4" /> No line items in the last week.
              </p>
            ) : (
              bestsellers.map((p, i) => (
                <div key={p.name}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="truncate">{p.name}</span>
                    <span className="text-muted-foreground shrink-0 text-xs">
                      {p.qty} · {KES(p.revenue)}
                    </span>
                  </div>
                  <Progress
                    value={Math.max(
                      8,
                      Math.round((p.revenue / Math.max(bestsellers[0]?.revenue ?? 1, 1)) * 100),
                    )}
                    className="mt-1.5 h-1.5"
                  />
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
