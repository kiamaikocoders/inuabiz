import { createFileRoute } from "@tanstack/react-router";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Brain, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app/AppShell";
import { StatCard } from "@/components/app/StatCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { KES, cashflowForecast, insights, products } from "@/lib/mock-data";

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
  const topSellers = [...products].sort((a, b) => b.price - a.price).slice(0, 5);

  return (
    <AppShell
      title="AI insights"
      description="What your numbers are trying to tell you"
      actions={
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            toast.success("Insights refreshed", { description: "Recomputed from the last 90 days." })
          }
        >
          <RefreshCw className="mr-2 size-4" /> Refresh
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="30-day forecast" value={KES(342000)} delta={9} icon={Brain} />
        <StatCard label="Working capital needed" value={KES(46000)} hint="keep on hand" tone="gold" />
        <StatCard label="Reorder actions" value="3" hint="this week" tone="danger" />
        <StatCard label="Forecast accuracy" value="87%" delta={4} hint="last 8 weeks" />
      </div>

      <div className="surface-card mt-4 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold">Cash-flow forecast</h2>
            <p className="text-muted-foreground text-xs">Actual vs projected weekly revenue</p>
          </div>
          <Badge variant="secondary">
            <Sparkles className="mr-1 size-3" /> Model v2
          </Badge>
        </div>
        <div className="mt-5 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={cashflowForecast} margin={{ left: -10, right: 8, top: 8 }}>
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
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {insights.map((i) => (
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
                <Button
                  size="sm"
                  onClick={() => toast.success("Action queued", { description: i.title })}
                >
                  Act on this
                </Button>
                <Button size="sm" variant="ghost">
                  Dismiss
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="surface-card h-fit p-5">
          <h2 className="font-semibold">Predicted best sellers</h2>
          <p className="text-muted-foreground text-xs">Next 7 days</p>
          <div className="mt-4 space-y-4">
            {topSellers.map((p, i) => (
              <div key={p.id}>
                <div className="flex items-center justify-between text-sm">
                  <span className="truncate">
                    {p.emoji} {p.name}
                  </span>
                  <span className="text-muted-foreground shrink-0 text-xs">
                    ~{40 - i * 6} units
                  </span>
                </div>
                <Progress value={100 - i * 15} className="mt-1.5 h-1.5" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
