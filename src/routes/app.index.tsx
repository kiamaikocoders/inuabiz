import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import {
  AlertTriangle,
  Banknote,
  CalendarClock,
  FileText,
  PackagePlus,
  Receipt,
  Sparkles,
  Store,
  TrendingUp,
  UserPlus,
  Users,
} from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { HorizontalRail, RailCard } from "@/components/app/HorizontalRail";
import { SaleDetailDialog } from "@/components/app/SaleDetailDialog";
import { StatCard } from "@/components/app/StatCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { KES } from "@/lib/mock-data";
import {
  fetchChannelSplit,
  fetchCreditBook,
  fetchProducts,
  fetchSales,
  fetchTodaySales,
  fetchWeekTrend,
} from "@/lib/data";
import { generateLiveInsights } from "@/lib/ai";
import { greetingFor, useIdentity } from "@/lib/identity";
import { daysUntilExpiry } from "@/lib/category";
import { cn } from "@/lib/utils";

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

function pctDelta(today: number, yesterday: number): number | undefined {
  if (!(yesterday > 0)) return undefined;
  return Math.round(((today - yesterday) / yesterday) * 100);
}

function Dashboard() {
  const identity = useIdentity("vendor");
  const { data: products = [] } = useQuery({ queryKey: ["products"], queryFn: fetchProducts });
  const { data: sales = [] } = useQuery({ queryKey: ["sales"], queryFn: fetchSales });
  const { data: debts = [] } = useQuery({ queryKey: ["credit-book"], queryFn: fetchCreditBook });
  const { data: today } = useQuery({ queryKey: ["today-sales"], queryFn: fetchTodaySales });
  const { data: weekTrend = [] } = useQuery({ queryKey: ["week-trend"], queryFn: fetchWeekTrend });
  const { data: channels = [] } = useQuery({
    queryKey: ["channel-split"],
    queryFn: fetchChannelSplit,
  });
  const { data: insights } = useQuery({
    queryKey: ["live-insights"],
    queryFn: generateLiveInsights,
  });

  const lowStock = products.filter((p) => p.stock <= p.reorderLevel);
  const overdueCredit = debts.filter((d) => d.status === "Overdue");
  const expiringSoon = products.filter((p) => {
    const raw = p.attrs?.expiry_date;
    const days = daysUntilExpiry(typeof raw === "string" ? raw : null);
    return days != null && days >= 0 && days <= 30;
  });
  const totalDebt = debts.reduce((s, d) => s + d.amount, 0);
  const todaySales = today?.total ?? 0;
  const todayCount = today?.count ?? 0;
  const salesDelta = pctDelta(todaySales, today?.yesterday ?? 0);
  const weekSales = weekTrend.reduce((s, d) => s + d.sales, 0);
  const topInsight = insights?.items[0];
  const [openSaleId, setOpenSaleId] = useState<string | null>(null);

  return (
    <AppShell
      title={greetingFor(identity.fullName)}
      description={identity.shop || "Your shop"}
      actions={
        <Button size="sm" asChild className="hidden sm:inline-flex">
          <Link to="/app/pos">New sale</Link>
        </Button>
      }
    >
      {/* Phone: horizontal rails */}
      <div className="space-y-4 lg:hidden">
        <HorizontalRail label="Today" hint="swipe">
          <RailCard className="w-[42vw] min-w-[9.5rem] max-w-[11rem]">
            <div className="flex items-start justify-between gap-2">
              <p className="text-muted-foreground text-[11px] font-medium">Sales today</p>
              <span className="bg-success/15 text-success grid size-7 place-items-center rounded-lg">
                <Banknote className="size-3.5" />
              </span>
            </div>
            <p className="font-display mt-2 text-xl font-bold tracking-tight">{KES(todaySales)}</p>
            {salesDelta != null && (
              <p
                className={cn(
                  "mt-1 text-[10px] font-semibold",
                  salesDelta >= 0 ? "text-success" : "text-destructive",
                )}
              >
                {salesDelta >= 0 ? "+" : ""}
                {salesDelta}% vs yesterday
              </p>
            )}
          </RailCard>
          <RailCard className="w-[42vw] min-w-[9.5rem] max-w-[11rem]">
            <div className="flex items-start justify-between gap-2">
              <p className="text-muted-foreground text-[11px] font-medium">Transactions</p>
              <span className="bg-primary/15 text-primary grid size-7 place-items-center rounded-lg">
                <Receipt className="size-3.5" />
              </span>
            </div>
            <p className="font-display mt-2 text-xl font-bold tracking-tight">{todayCount}</p>
            <p className="text-muted-foreground mt-1 text-[10px]">paid today</p>
          </RailCard>
          <RailCard className="w-[42vw] min-w-[9.5rem] max-w-[11rem]">
            <div className="flex items-start justify-between gap-2">
              <p className="text-muted-foreground text-[11px] font-medium">Credit out</p>
              <span className="bg-gold/20 text-gold-foreground grid size-7 place-items-center rounded-lg">
                <Users className="size-3.5" />
              </span>
            </div>
            <p className="font-display mt-2 text-xl font-bold tracking-tight">{KES(totalDebt)}</p>
            <p className="text-muted-foreground mt-1 text-[10px]">
              {debts.length} customer{debts.length === 1 ? "" : "s"}
            </p>
          </RailCard>
        </HorizontalRail>

        <HorizontalRail label="Needs attention" hint="swipe">
          <Link to="/app/inventory" className="snap-start shrink-0">
            <RailCard className="w-[40vw] min-w-[9rem] max-w-[10.5rem] border-warning/30 bg-warning/10">
              <p className="text-[11px] font-semibold text-warning-foreground/80">Low stock</p>
              <p className="font-display mt-1.5 text-2xl font-bold">{lowStock.length}</p>
              <p className="mt-0.5 text-[10px] opacity-80">items</p>
            </RailCard>
          </Link>
          <Link to="/app/credit" className="snap-start shrink-0">
            <RailCard className="w-[40vw] min-w-[9rem] max-w-[10.5rem] border-destructive/25 bg-destructive/10">
              <p className="text-destructive text-[11px] font-semibold">Overdue credit</p>
              <p className="font-display mt-1.5 text-2xl font-bold">{overdueCredit.length}</p>
              <p className="text-muted-foreground mt-0.5 text-[10px]">customers</p>
            </RailCard>
          </Link>
          <Link to="/app/expiry" className="snap-start shrink-0">
            <RailCard className="bg-muted/60 w-[40vw] min-w-[9rem] max-w-[10.5rem]">
              <p className="text-muted-foreground inline-flex items-center gap-1 text-[11px] font-semibold">
                <CalendarClock className="size-3" /> Expiring soon
              </p>
              <p className="font-display mt-1.5 text-2xl font-bold">{expiringSoon.length}</p>
              <p className="text-muted-foreground mt-0.5 text-[10px]">within 30 days</p>
            </RailCard>
          </Link>
        </HorizontalRail>

        <section className="space-y-2">
          <div className="flex items-center justify-between gap-2 px-0.5">
            <div>
              <h2 className="text-sm font-semibold tracking-tight">This week</h2>
              <p className="text-muted-foreground text-[11px]">Sales vs credit</p>
            </div>
            <Badge variant="secondary" className="text-[10px]">
              <TrendingUp className="mr-1 size-3" /> {KES(weekSales)}
            </Badge>
          </div>
          <div className="surface-card h-36 p-3">
            {weekTrend.some((d) => d.sales > 0 || d.credit > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weekTrend} margin={{ left: -24, right: 4, top: 4, bottom: -4 }}>
                  <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={10} />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 10,
                      border: "1px solid var(--color-border)",
                      background: "var(--color-card)",
                      fontSize: 11,
                    }}
                    formatter={(v: number) => KES(v)}
                  />
                  <Bar dataKey="sales" fill="var(--color-chart-1)" radius={[4, 4, 0, 0]} barSize={10} />
                  <Bar dataKey="credit" fill="var(--color-muted-foreground)" opacity={0.35} radius={[4, 4, 0, 0]} barSize={10} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground grid h-full place-items-center text-xs">
                No paid sales in the last 7 days.
              </p>
            )}
          </div>
        </section>

        <HorizontalRail label="Shortcuts">
          {[
            { to: "/app/pos", label: "Open till", icon: Store },
            { to: "/app/credit", label: "Record credit", icon: UserPlus },
            { to: "/app/inventory", label: "Add product", icon: PackagePlus },
            { to: "/app/invoices", label: "Invoices", icon: FileText },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <Link key={s.to + s.label} to={s.to as never} className="snap-start shrink-0">
                <RailCard className="flex w-[7.25rem] flex-col items-start gap-2 py-3">
                  <span className="bg-primary/12 text-primary grid size-8 place-items-center rounded-xl">
                    <Icon className="size-4" />
                  </span>
                  <span className="text-[12px] leading-tight font-semibold">{s.label}</span>
                </RailCard>
              </Link>
            );
          })}
        </HorizontalRail>

        {topInsight && (
          <div className="surface-card p-3.5">
            <p className="text-primary inline-flex items-center gap-1 text-[10px] font-semibold tracking-wide uppercase">
              <Sparkles className="size-3" /> AI insight
            </p>
            <p className="mt-1 text-sm font-semibold leading-snug">{topInsight.title}</p>
            <p className="text-muted-foreground mt-1 line-clamp-2 text-xs leading-relaxed">
              {topInsight.body}
            </p>
          </div>
        )}

        <div className="surface-card p-3.5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Recent sales</h2>
            <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
              <Link to="/app/sales">View all</Link>
            </Button>
          </div>
          {sales.length === 0 ? (
            <p className="text-muted-foreground mt-3 text-xs">No sales yet. Tap Sell to start.</p>
          ) : (
            <div className="mt-2 divide-y divide-border">
              {sales.slice(0, 4).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className="hover:bg-muted/50 flex w-full items-center justify-between gap-2 py-2.5 text-left"
                  onClick={() => setOpenSaleId(s.id)}
                >
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium">
                      {s.mpesaReceipt || s.ref} · {s.customer}
                    </p>
                    <p className="text-muted-foreground text-[10px]">
                      {s.time} · {s.channel}
                    </p>
                  </div>
                  <p className="shrink-0 text-[13px] font-semibold">{KES(s.total)}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Desktop / tablet: original denser grid */}
      <div className="hidden lg:block">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Sales today"
            value={KES(todaySales)}
            {...(salesDelta != null ? { delta: salesDelta } : {})}
            hint={salesDelta != null ? "vs yesterday" : "paid today"}
            icon={Banknote}
          />
          <StatCard
            label="Transactions"
            value={String(todayCount)}
            hint="paid today"
            icon={Receipt}
          />
          <StatCard
            label="Credit outstanding"
            value={KES(totalDebt)}
            hint={`${debts.length} customer${debts.length === 1 ? "" : "s"}`}
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
                <TrendingUp className="mr-1 size-3" /> {KES(weekSales)}
              </Badge>
            </div>
            <div className="mt-5 h-64">
              {weekTrend.some((d) => d.sales > 0 || d.credit > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={weekTrend} margin={{ left: -18, right: 4, top: 4 }}>
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
              ) : (
                <p className="text-muted-foreground grid h-full place-items-center text-sm">
                  No paid sales in the last 7 days.
                </p>
              )}
            </div>
          </div>

          <div className="surface-card p-5">
            <h2 className="font-semibold">Payment channels</h2>
            <p className="text-muted-foreground text-xs">Share of this week's volume</p>
            <div className="mt-5 h-64">
              {channels.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={channels} layout="vertical" margin={{ left: 24, right: 12 }}>
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
              ) : (
                <p className="text-muted-foreground grid h-full place-items-center text-sm">
                  Channel mix appears after the first paid sale.
                </p>
              )}
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
            {sales.length === 0 ? (
              <p className="text-muted-foreground mt-6 text-sm">
                No sales yet. Open POS to record the first one.
              </p>
            ) : (
              <div className="mt-4 divide-y divide-border">
                {sales.slice(0, 6).map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className="hover:bg-muted/50 flex w-full items-center justify-between gap-3 rounded-lg py-3 text-left"
                    onClick={() => setOpenSaleId(s.id)}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {s.mpesaReceipt || s.ref} · {s.customer}
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
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="surface-card p-5">
              <p className="text-primary inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase">
                <Sparkles className="size-3.5" /> AI insight
              </p>
              {topInsight ? (
                <>
                  <h3 className="mt-2 font-semibold leading-snug">{topInsight.title}</h3>
                  <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{topInsight.body}</p>
                </>
              ) : (
                <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                  Insights appear after sales and stock are on this till. Open AI insights to refresh.
                </p>
              )}
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
              {lowStock.length === 0 ? (
                <p className="text-muted-foreground mt-3 text-sm">Nothing below reorder level.</p>
              ) : (
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
              )}
            </div>
          </div>
        </div>
      </div>

      <SaleDetailDialog saleId={openSaleId} onOpenChange={(open) => !open && setOpenSaleId(null)} />
    </AppShell>
  );
}
