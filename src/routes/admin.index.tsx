import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Activity, ShieldAlert, Store, TrendingUp, Wallet } from "lucide-react";
import { AdminShell } from "@/components/app/AdminShell";
import { StatCard } from "@/components/app/StatCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  KES,
  adminNotifications,
  mrrTrend,
  platformHealth,
  statusColor,
  tenants,
  unclaimedPayments,
} from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Command center — InuaBiz super admin" },
      {
        name: "description",
        content:
          "Platform-wide overview of MRR, active tenants, trials, unclaimed payments and system health for the InuaBiz operator.",
      },
      { property: "og:title", content: "InuaBiz super-admin command center" },
      { property: "og:description", content: "MRR, tenants, unclaimed payments and health at a glance." },
    ],
  }),
  component: AdminOverview,
});

function AdminOverview() {
  const active = tenants.filter((t) => t.status === "Active");
  const trials = tenants.filter((t) => t.status === "Trial");
  const mrr = active.reduce((s, t) => s + t.mrr, 0);

  return (
    <AdminShell
      title="Command center"
      description="Everything happening across the InuaBiz platform"
      actions={
        <Button size="sm" asChild className="hidden sm:inline-flex">
          <Link to="/admin/vendors">Manage vendors</Link>
        </Button>
      }
    >
      {unclaimedPayments.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/8 p-4">
          <p className="text-destructive inline-flex items-center gap-2 text-sm font-semibold">
            <ShieldAlert className="size-4" />
            {unclaimedPayments.length} payments could not be matched to a tenant
          </p>
          <Button size="sm" variant="destructive" asChild>
            <Link to="/admin/unclaimed">Resolve queue</Link>
          </Button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Monthly recurring revenue" value={KES(mrr)} delta={29} icon={Wallet} />
        <StatCard label="Active tenants" value={String(active.length)} delta={12} icon={Store} />
        <StatCard label="Trials running" value={String(trials.length)} hint="conversion 68%" tone="gold" />
        <StatCard
          label="Unclaimed payments"
          value={String(unclaimedPayments.length)}
          icon={ShieldAlert}
          tone="danger"
          hint="needs mapping"
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="surface-card p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">MRR growth</h2>
              <p className="text-muted-foreground text-xs">Recurring revenue and tenant count</p>
            </div>
            <Badge variant="secondary">
              <TrendingUp className="mr-1 size-3" /> +29% MoM
            </Badge>
          </div>
          <div className="mt-5 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mrrTrend} margin={{ left: -12, right: 4, top: 4 }}>
                <defs>
                  <linearGradient id="gMrr" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid var(--color-border)",
                    background: "var(--color-card)",
                    fontSize: 12,
                  }}
                  formatter={(v: number, k) => (k === "mrr" ? KES(v) : `${v} tenants`)}
                />
                <Area
                  type="monotone"
                  dataKey="mrr"
                  stroke="var(--color-chart-1)"
                  strokeWidth={2.5}
                  fill="url(#gMrr)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="surface-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="inline-flex items-center gap-2 font-semibold">
              <Activity className="text-primary size-4" /> Platform health
            </h2>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/admin/health">Details</Link>
            </Button>
          </div>
          <div className="mt-4 space-y-4">
            {platformHealth.map((h) => (
              <div key={h.name}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{h.name}</span>
                  <Badge variant={h.status === "Healthy" ? "secondary" : "destructive"} className="text-[10px]">
                    {h.status}
                  </Badge>
                </div>
                <Progress value={h.value} className="mt-1.5 h-1.5" />
                <p className="text-muted-foreground mt-1 text-xs">{h.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="surface-card p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Newest tenants</h2>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/admin/vendors">View all</Link>
            </Button>
          </div>
          <div className="mt-3 divide-y divide-border">
            {tenants.slice(0, 6).map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{t.business}</p>
                  <p className="text-muted-foreground text-xs">
                    {t.owner} · {t.town} · {t.category}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-sm font-semibold">{t.mrr ? KES(t.mrr) : "—"}</span>
                  <span
                    className={cn("rounded-full border px-2 py-0.5 text-[11px] font-medium", statusColor[t.status])}
                  >
                    {t.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="surface-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Latest alerts</h2>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/admin/notifications">All</Link>
            </Button>
          </div>
          <div className="mt-3 space-y-3">
            {adminNotifications.slice(0, 4).map((n) => (
              <div key={n.id} className="rounded-lg border border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold">{n.title}</p>
                  <span className="text-muted-foreground shrink-0 text-[11px]">{n.time}</span>
                </div>
                <p className="text-muted-foreground mt-1 text-xs leading-relaxed">{n.message}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
