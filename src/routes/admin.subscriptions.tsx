import { createFileRoute } from "@tanstack/react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Repeat, Wallet } from "lucide-react";
import { AdminShell } from "@/components/app/AdminShell";
import { StatCard } from "@/components/app/StatCard";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { KES, mrrTrend, statusColor, tenants } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/subscriptions")({
  head: () => ({
    meta: [
      { title: "Subscriptions & MRR — InuaBiz super admin" },
      {
        name: "description",
        content:
          "Track monthly recurring revenue, active trials, conversion rates and automated billing retries across all InuaBiz tenants.",
      },
      { property: "og:title", content: "InuaBiz subscriptions & MRR" },
      { property: "og:description", content: "MRR, trials, conversion and billing retries." },
    ],
  }),
  component: Subscriptions,
});

function Subscriptions() {
  const active = tenants.filter((t) => t.status === "Active");
  const mrr = active.reduce((s, t) => s + t.mrr, 0);

  return (
    <AdminShell title="Subscriptions & MRR" description="Revenue, trials and billing retries">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="MRR" value={KES(mrr)} delta={29} icon={Wallet} />
        <StatCard label="ARR run rate" value={KES(mrr * 12)} delta={29} />
        <StatCard label="Trial conversion" value="68%" delta={5} tone="gold" />
        <StatCard label="Churn" value="3.1%" delta={-1} hint="monthly" tone="danger" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="surface-card p-5 lg:col-span-2">
          <h2 className="font-semibold">Recurring revenue by month</h2>
          <div className="mt-5 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mrrTrend} margin={{ left: -12, right: 4, top: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} />
                <Tooltip
                  cursor={{ fill: "var(--color-muted)" }}
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid var(--color-border)",
                    background: "var(--color-card)",
                    fontSize: 12,
                  }}
                  formatter={(v: number) => KES(v)}
                />
                <Bar dataKey="mrr" fill="var(--color-chart-1)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="surface-card p-5">
          <h2 className="inline-flex items-center gap-2 font-semibold">
            <Repeat className="text-primary size-4" /> Billing pipeline
          </h2>
          <div className="mt-5 space-y-4">
            {[
              ["Renewing in 7 days", 12, 80],
              ["Trials ending this week", 4, 45],
              ["Retry in progress", 2, 25],
              ["Failed 3x — locked", 1, 12],
            ].map(([label, count, pct]) => (
              <div key={label as string}>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{label as string}</span>
                  <span className="font-semibold">{count as number}</span>
                </div>
                <Progress value={pct as number} className="mt-1.5 h-1.5" />
              </div>
            ))}
          </div>
          <div className="bg-muted mt-6 rounded-xl p-3.5">
            <p className="text-xs font-semibold">M-Pesa Ratiba · Phase 2</p>
            <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
              Standing orders will auto-debit KES 3,000 monthly with up to 3 retries over 72 hours
              before write access is locked.
            </p>
          </div>
        </div>
      </div>

      <div className="surface-card mt-4 p-5">
        <h2 className="font-semibold">Tenant subscriptions</h2>
        <div className="mt-4 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Business</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">MRR</TableHead>
                <TableHead>Next billing</TableHead>
                <TableHead>Auto-debit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenants.map((t, i) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.business}</TableCell>
                  <TableCell className="text-muted-foreground">{t.owner}</TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-[11px] font-medium",
                        statusColor[t.status],
                      )}
                    >
                      {t.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {t.mrr ? KES(t.mrr) : "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {t.status === "Active" ? `${(i % 28) + 1} Sep 2026` : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={i % 3 === 0 ? "secondary" : "outline"}>
                      {i % 3 === 0 ? "Ratiba on" : "Manual STK"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </AdminShell>
  );
}
