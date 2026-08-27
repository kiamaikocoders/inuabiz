import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Hourglass,
  LayoutGrid,
  Plus,
  ShieldAlert,
  Sparkles,
  Store,
  TrendingDown,
  Wallet,
} from "lucide-react";
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
import { KES } from "@/lib/mock-data";
import { fetchTenants, mrrTrendFromTenants } from "@/lib/data";
import { fetchAiSpendThisMonth } from "@/lib/admin-ai";
import { fetchMrrSnapshot, fetchUnclaimedPayments } from "@/lib/ops";
import { isSupabaseConfigured } from "@/lib/supabase";
import { categoryMix, fetchAdminShops, shopCategoriesLabel, shopsForTenant } from "@/lib/admin-category";
import { CATEGORY_CATALOG } from "@/lib/category";

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
  activeTenants,
  trials,
  unclaimed,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
  activeTenants: number;
  trials: number;
  unclaimed: number;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="min-w-[160px] space-y-1.5 rounded-xl border border-border bg-card p-3 text-xs shadow-soft">
      <p className="font-semibold">
        {label} · {KES(payload[0]!.value)} MRR
      </p>
      {[
        ["Active tenants", String(activeTenants)],
        ["Trials", String(trials)],
        ["Unclaimed", String(unclaimed)],
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
  const live = isSupabaseConfigured();
  const { data: tenants = [] } = useQuery({
    queryKey: ["admin-tenants"],
    queryFn: fetchTenants,
    enabled: live,
  });
  const { data: snap } = useQuery({
    queryKey: ["admin-mrr"],
    queryFn: fetchMrrSnapshot,
    enabled: live,
  });
  const { data: unclaimed = [] } = useQuery({
    queryKey: ["unclaimed-payments"],
    queryFn: fetchUnclaimedPayments,
    enabled: live,
  });
  const { data: shops = [] } = useQuery({
    queryKey: ["admin-shops"],
    queryFn: fetchAdminShops,
  });
  const { data: aiSpend } = useQuery({
    queryKey: ["admin-ai-spend"],
    queryFn: fetchAiSpendThisMonth,
    enabled: live,
  });
  const mix = categoryMix(shops);
  const active = tenants.filter((t) => t.status === "Active");
  const trials = tenants.filter((t) => t.status === "Trial");
  const mrr = snap?.mrr_kes ?? active.reduce((s, t) => s + t.mrr, 0);
  const unclaimedCount = unclaimed.length;
  const latest = { month: "Now", mrr };
  const chart = mrrTrendFromTenants(tenants);
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (id: string, checked: boolean) => {
    setSelected((prev) => (checked ? [...prev, id] : prev.filter((x) => x !== id)));
  };

  return (
    <AdminShell
      title="Dashboard"
      description="Everything happening across the InuaBiz platform"
      actions={
        <Button size="sm" variant="ink" asChild className="rounded-[10px]">
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

      {unclaimedCount > 0 && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3.5">
          <p className="text-destructive text-sm font-semibold">
            {unclaimedCount} payments could not be matched to a tenant
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
          icon={Wallet}
          tone="violet"
        />
        <StatCard
          label="Active tenants"
          value={String(active.length)}
          icon={Store}
          tone="success"
        />
        <StatCard
          label="Trials running"
          value={String(snap?.trial_tenants ?? trials.length)}
          hint={
            snap?.conversions_this_month
              ? `${snap.conversions_this_month} converted this month`
              : "open trials"
          }
          tone="gold"
          icon={Hourglass}
        />
        <StatCard
          label="Unclaimed payments"
          value={String(unclaimedCount)}
          icon={ShieldAlert}
          tone="danger"
        />
        <StatCard
          label="Past due"
          value={String(snap?.past_due_tenants ?? tenants.filter((t) => t.status === "Error").length)}
          icon={TrendingDown}
          tone="muted"
        />
      </div>

      <div className="surface-card mt-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">
            <LayoutGrid className="mr-1.5 inline size-4" />
            Shop category mix
          </h2>
          <Button variant="ghost" size="sm" className="text-primary" asChild>
            <Link to="/admin/categories">Expiry, tickets & floor</Link>
          </Button>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5 xl:grid-cols-9">
          {mix.map((row) => {
            const def = CATEGORY_CATALOG[row.id];
            return (
              <div key={row.id} className="rounded-xl border border-border px-2 py-2.5 text-center">
                <p className="text-lg leading-none">{def.emoji}</p>
                <p className="mt-1 truncate text-[11px] font-semibold">{def.label}</p>
                <p className="text-muted-foreground text-[10px]">{row.shops} shops</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="surface-card p-5 lg:col-span-2">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">MRR (cumulative by signup month)</h2>
              <p className="mt-1 font-display text-[22px] font-bold">
                {latest ? KES(latest.mrr) : "—"}
              </p>
            </div>
          </div>
          <div className="mt-4 h-56">
            {chart.some((r) => r.mrr > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chart} margin={{ left: -12, right: 8, top: 8 }}>
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
                  <Tooltip
                    content={
                      <MrrTooltip
                        activeTenants={snap?.active_tenants ?? active.length}
                        trials={snap?.trial_tenants ?? trials.length}
                        unclaimed={unclaimedCount}
                      />
                    }
                  />
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
            ) : (
              <p className="text-muted-foreground flex h-full items-center justify-center text-sm">
                MRR appears when paying tenants are on the map.
              </p>
            )}
          </div>
        </div>

        <div className="surface-card p-5">
          <h2 className="text-sm font-semibold">Live ops</h2>
          <div className="mt-4 space-y-4">
            {[
              {
                name: "Unclaimed queue",
                status: unclaimedCount === 0 ? "Healthy" : "Degraded",
                value: Math.min(100, unclaimedCount * 15),
                detail: `${unclaimedCount} unmatched payments`,
              },
              {
                name: "Trials",
                status: "Healthy",
                value: Math.min(100, (snap?.trial_tenants ?? trials.length) * 12),
                detail: `${snap?.trial_tenants ?? trials.length} open`,
              },
              {
                name: "Past due",
                status:
                  (snap?.past_due_tenants ?? 0) > 0 ? "Degraded" : "Healthy",
                value: Math.min(100, (snap?.past_due_tenants ?? 0) * 20),
                detail: `${snap?.past_due_tenants ?? 0} tenants`,
              },
              {
                name: "Admin AI",
                status: "Healthy",
                value: Math.min(100, (aiSpend?.runs ?? 0) * 6),
                detail: `${aiSpend?.runs ?? 0} runs · ${KES(Math.round(aiSpend?.costKes ?? 0))} this month`,
              },
            ].map((h) => (
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
        <div className="mt-3 hidden overflow-x-auto md:block">
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
                  <TableCell>
                    {shopCategoriesLabel(shopsForTenant(shops, t.id)) || t.category}
                  </TableCell>
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
        <ul className="mt-3 space-y-2 md:hidden">
          {tenants.slice(0, 6).map((t) => (
            <li key={t.id} className="rounded-xl border border-border p-3">
              <div className="flex items-start justify-between gap-2">
                <Link
                  to="/admin/tenants/$tenantId"
                  params={{ tenantId: t.id }}
                  className="font-semibold hover:underline"
                >
                  {t.business}
                </Link>
                <StatusPill status={t.status} />
              </div>
              <p className="text-muted-foreground mt-1 text-xs">
                {t.owner} · {t.town} ·{" "}
                {shopCategoriesLabel(shopsForTenant(shops, t.id)) || t.category}
              </p>
              <p className="mt-1 text-sm font-semibold">{t.mrr ? KES(t.mrr) : "Trial"}</p>
            </li>
          ))}
        </ul>
      </div>
    </AdminShell>
  );
}
