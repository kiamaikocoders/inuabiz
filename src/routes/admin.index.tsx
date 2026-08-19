import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Hourglass, Plus, ShieldAlert, Sparkles, Store, TrendingDown, Wallet } from "lucide-react";
import { AdminShell } from "@/components/app/AdminShell";
import { StatCard } from "@/components/app/StatCard";
import { StatusPill } from "@/components/admin/StatusPill";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { KES, mrrTrend, platformHealth, tenants, unclaimedPayments } from "@/lib/mock-data";

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
      {
        property: "og:description",
        content: "MRR, tenants, unclaimed payments and health at a glance.",
      },
    ],
  }),
  component: AdminOverview,
});

function MrrTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const activeTenants = tenants.filter((t) => t.status === "Active").length;
  const trials = tenants.filter((t) => t.status === "Trial").length;
  return (
    <div className="min-w-[160px] space-y-1.5 rounded-xl border border-border bg-card p-3 text-xs shadow-soft">
      <p className="font-semibold">
        {label} · {KES(payload[0]!.value)} MRR
      </p>
      {[
        ["Active tenants", String(activeTenants)],
        ["Trials", String(trials)],
        ["Unclaimed", String(unclaimedPayments.length)],
      ].map(([k, v]) => (
        <div key={k} className="flex justify-between gap-6">
          <span className="text-muted-foreground">{k}</span>
          <span className="font-semibold">{v}</span>
        </div>
      ))}
    </div>
  );
}

function AdminOverview() {
  const active = tenants.filter((t) => t.status === "Active");
  const trials = tenants.filter((t) => t.status === "Trial");
  const mrr = active.reduce((s, t) => s + t.mrr, 0);
  const latest = mrrTrend[mrrTrend.length - 1];
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (id: string, checked: boolean) => {
    setSelected((prev) => (checked ? [...prev, id] : prev.filter((x) => x !== id)));
  };

  return (
    <AdminShell
      title="Dashboard"
      description="Everything happening across the InuaBiz platform"
      actions={
        <Button size="sm" variant="ink" asChild className="hidden rounded-[10px] sm:inline-flex">
          <Link to="/admin/vendors">
            <Plus className="size-3.5" /> Manage vendors
          </Link>
        </Button>
      }
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/20 bg-primary-soft px-4 py-3.5">
        <p className="text-sm font-semibold">
          <Sparkles className="text-primary mr-1.5 inline size-4" />
          Admin AI can brief MRR, trials, unclaimed cash and who to call today
        </p>
        <Button size="sm" variant="ink" asChild className="rounded-lg">
          <Link to="/admin/ai">Open copilot</Link>
        </Button>
      </div>

      {unclaimedPayments.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3.5">
          <p className="text-destructive text-sm font-semibold">
            {unclaimedPayments.length} payments could not be matched to a tenant
          </p>
          <Button size="sm" variant="destructive" asChild className="rounded-lg">
            <Link to="/admin/unclaimed">Resolve queue</Link>
          </Button>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Monthly recurring revenue"
          value={KES(mrr)}
          delta={29}
          icon={Wallet}
          tone="violet"
        />
        <StatCard
          label="Active tenants"
          value={String(active.length)}
          delta={12}
          icon={Store}
          tone="success"
        />
        <StatCard
          label="Trials running"
          value={String(trials.length)}
          deltaLabel="68% conv."
          tone="gold"
          icon={Hourglass}
        />
        <StatCard
          label="Unclaimed payments"
          value={String(unclaimedPayments.length)}
          icon={ShieldAlert}
          tone="danger"
          deltaLabel="needs mapping"
        />
        <StatCard
          label="Churn this month"
          value="3.1%"
          delta={-1}
          icon={TrendingDown}
          tone="muted"
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="surface-card p-5 lg:col-span-2">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">MRR growth</h2>
              <p className="mt-1 font-display text-[22px] font-bold">
                {latest ? KES(latest.mrr) : "—"}
              </p>
            </div>
            <span className="rounded-full bg-success/15 px-2 py-0.5 text-[11px] font-semibold text-success">
              +29% MoM
            </span>
          </div>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mrrTrend} margin={{ left: -12, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="gMrr" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--color-border)"
                  vertical={false}
                />
                <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} hide />
                <Tooltip content={<MrrTooltip />} />
                <Area
                  type="monotone"
                  dataKey="mrr"
                  stroke="var(--color-chart-1)"
                  strokeWidth={2.5}
                  fill="url(#gMrr)"
                  dot={{ r: 4, strokeWidth: 0, fill: "var(--color-chart-1)" }}
                  activeDot={{ r: 5 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="surface-card p-5">
          <h2 className="text-sm font-semibold">Platform health</h2>
          <div className="mt-4 space-y-4">
            {platformHealth.slice(0, 4).map((h) => (
              <div key={h.name}>
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="font-medium">{h.name}</span>
                  <StatusPill status={h.status} />
                </div>
                <Progress value={h.value} className="mt-1.5 h-1.5" />
                <p className="text-muted-foreground mt-1 text-xs">{h.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="surface-card mt-4 p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Newest tenants</h2>
          <Button variant="ghost" size="sm" className="text-primary" asChild>
            <Link to="/admin/vendors">View all</Link>
          </Button>
        </div>
        <div className="mt-3 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>Business</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Town</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>MRR</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenants.slice(0, 6).map((t) => (
                <TableRow key={t.id}>
                  <TableCell>
                    <Checkbox
                      checked={selected.includes(t.id)}
                      onCheckedChange={(v) => toggle(t.id, v === true)}
                      aria-label={`Select ${t.business}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    <Link
                      to="/admin/tenants/$tenantId"
                      params={{ tenantId: t.id }}
                      className="hover:underline"
                    >
                      {t.business}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{t.owner}</TableCell>
                  <TableCell>{t.category}</TableCell>
                  <TableCell className="text-muted-foreground">{t.town}</TableCell>
                  <TableCell>
                    <StatusPill status={t.status} />
                  </TableCell>
                  <TableCell className="font-semibold">{t.mrr ? KES(t.mrr) : "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{t.joined}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </AdminShell>
  );
}
