import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle, Banknote, Receipt, Sparkles, TrendingUp, Users } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { StatCard } from "@/components/app/StatCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  KES,
  channelSplit,
  debts,
  insights,
  products,
  sales,
  salesTrend,
} from "@/lib/mock-data";

export const Route = createFileRoute("/app/")({
  head: () => ({
    meta: [
      { title: "Dashboard — InuaBiz vendor app" },
      {
        name: "description",
        content:
          "Today's sales, credit outstanding, low-stock warnings and AI insights for your shop at a glance.",
      },
      { property: "og:title", content: "InuaBiz vendor dashboard" },
      { property: "og:description", content: "Your shop's daily performance in one screen." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const lowStock = products.filter((p) => p.stock <= p.reorderLevel);
  const totalDebt = debts.reduce((s, d) => s + d.amount, 0);
  const todaySales = sales.filter((s) => s.status === "Complete").reduce((s, x) => s + x.total, 0);

  return (
    <AppShell
      title="Good morning, Mama Njoroge"
      description="Njoroge Mini Mart · Kasarani"
      actions={
        <Button size="sm" asChild className="hidden sm:inline-flex">
          <Link to="/app/pos">New sale</Link>
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Sales today" value={KES(todaySales)} delta={12} hint="vs yesterday" icon={Banknote} />
        <StatCard label="Transactions" value={String(sales.length)} delta={6} hint="8 today" icon={Receipt} />
        <StatCard
          label="Credit outstanding"
          value={KES(totalDebt)}
          delta={-4}
          hint="5 customers"
          icon={Users}
          tone="gold"
        />
        <StatCard
          label="Low stock items"
          value={String(lowStock.length)}
          hint="need reordering"
          icon={AlertTriangle}
          tone="danger"
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="surface-card p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">This week</h2>
              <p className="text-muted-foreground text-xs">Sales vs credit given</p>
            </div>
            <Badge variant="secondary">
              <TrendingUp className="mr-1 size-3" /> +18%
            </Badge>
          </div>
          <div className="mt-5 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesTrend} margin={{ left: -18, right: 4, top: 4 }}>
                <defs>
                  <linearGradient id="gSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={12} />
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
                <Area
                  type="monotone"
                  dataKey="sales"
                  stroke="var(--color-chart-1)"
                  strokeWidth={2.5}
                  fill="url(#gSales)"
                />
                <Area
                  type="monotone"
                  dataKey="credit"
                  stroke="var(--color-chart-2)"
                  strokeWidth={2}
                  fill="transparent"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="surface-card p-5">
          <h2 className="font-semibold">Payment channels</h2>
          <p className="text-muted-foreground text-xs">Share of this week's volume</p>
          <div className="mt-5 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={channelSplit} layout="vertical" margin={{ left: 24, right: 12 }}>
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="channel"
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  width={72}
                />
                <Tooltip
                  cursor={{ fill: "var(--color-muted)" }}
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid var(--color-border)",
                    background: "var(--color-card)",
                    fontSize: 12,
                  }}
                  formatter={(v: number) => `${v}%`}
                />
                <Bar dataKey="value" fill="var(--color-chart-1)" radius={[0, 6, 6, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="surface-card p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Recent sales</h2>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/app/sales">View all</Link>
            </Button>
          </div>
          <div className="mt-4 divide-y divide-border">
            {sales.slice(0, 6).map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {s.ref} · {s.customer}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {s.time} · {s.items} items · {s.channel}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{KES(s.total)}</p>
                  <Badge
                    variant={
                      s.status === "Complete"
                        ? "secondary"
                        : s.status === "Failed"
                          ? "destructive"
                          : "outline"
                    }
                    className="mt-0.5 text-[10px]"
                  >
                    {s.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="surface-card p-5">
            <p className="text-primary inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase">
              <Sparkles className="size-3.5" /> AI insight
            </p>
            <h3 className="mt-2 font-semibold leading-snug">{insights[0]!.title}</h3>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{insights[0]!.body}</p>
            <Button variant="outline" size="sm" className="mt-4 w-full" asChild>
              <Link to="/app/insights">See all insights</Link>
            </Button>
          </div>

          <div className="surface-card p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Low stock</h3>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/app/inventory">Manage</Link>
              </Button>
            </div>
            <div className="mt-3 space-y-3">
              {lowStock.slice(0, 4).map((p) => (
                <div key={p.id}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="truncate">
                      {p.emoji} {p.name}
                    </span>
                    <span className="text-muted-foreground shrink-0 text-xs">
                      {p.stock}/{p.reorderLevel}
                    </span>
                  </div>
                  <Progress
                    value={Math.min(100, (p.stock / Math.max(p.reorderLevel, 1)) * 100)}
                    className="mt-1.5 h-1.5"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
