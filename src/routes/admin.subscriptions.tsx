import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Download, Percent, Repeat, TrendingUp, UserMinus, Wallet } from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/app/AdminShell";
import { StatCard } from "@/components/app/StatCard";
import { StatusPill } from "@/components/admin/StatusPill";
import { Button } from "@/components/ui/button";
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
import { fetchMrrSnapshot } from "@/lib/ops";
import { isSupabaseConfigured } from "@/lib/supabase";

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
  const active = tenants.filter((t) => t.status === "Active");
  const mrr = snap?.mrr_kes ?? active.reduce((s, t) => s + t.mrr, 0);
  const trials = snap?.trial_tenants ?? tenants.filter((t) => t.status === "Trial").length;
  const pastDue = snap?.past_due_tenants ?? tenants.filter((t) => t.status === "Error").length;
  const conversions = snap?.conversions_this_month ?? 0;
  const chart = mrrTrendFromTenants(tenants);

  return (
    <AdminShell
      title="Subscriptions & MRR"
      description="Revenue, trials and billing retries"
      actions={
        <Button
          size="sm"
          variant="ink"
          className="rounded-[10px]"
          onClick={() => {
            const rows = [
              "Business,Owner,Status,MRR",
              ...tenants.map((t) => `${t.business},${t.owner},${t.status},${t.mrr}`),
            ];
            const blob = new Blob([rows.join("\n")], { type: "text/csv" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "inuabiz-subscriptions.csv";
            a.click();
            URL.revokeObjectURL(url);
            toast.success("CSV exported");
          }}
        >
          <Download className="size-3.5" /> Export CSV
        </Button>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="MRR" value={KES(mrr)} delta={29} icon={Wallet} tone="violet" />
        <StatCard
          label="ARR run rate"
          value={KES(mrr * 12)}
          delta={29}
          icon={TrendingUp}
          tone="success"
        />
        <StatCard label="Trial conversion" value={conversions ? String(conversions) : "—"} delta={5} icon={Percent} tone="gold" />
        <StatCard
          label="Past due"
          value={String(pastDue)}
          hint={`${trials} trials`}
          icon={UserMinus}
          tone="danger"
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="surface-card p-5 lg:col-span-2">
          <h2 className="font-semibold">Recurring revenue by month</h2>
          <div className="mt-5 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart} margin={{ left: -12, right: 4, top: 4 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--color-border)"
                  vertical={false}
                />
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
            {(() => {
              const total = Math.max(tenants.length, 1);
              return [
                ["Active (paying)", active.length],
                ["Open trials", trials],
                ["Past due", pastDue],
              ].map(([label, count]) => (
              <div key={label as string}>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{label as string}</span>
                  <span className="font-semibold">{count as number}</span>
                </div>
                <Progress
                  value={Math.round(((count as number) / total) * 100)}
                  className="mt-1.5 h-1.5"
                />
              </div>
              ));
            })()}
          </div>
          <div className="bg-muted mt-6 rounded-xl p-3.5">
            <p className="text-xs font-semibold">M-Pesa Ratiba</p>
            <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
              Optional standing orders auto-debit KES 3,000 per shop, with up to 3 retries over 72
              hours before write access is locked. Vendors opt in from Subscription in the till.
            </p>
          </div>
        </div>
      </div>

      <div className="surface-card mt-4 p-5">
        <h2 className="font-semibold">Tenant subscriptions</h2>
        <div className="mt-4 hidden overflow-x-auto md:block">
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
              {tenants.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.business}</TableCell>
                  <TableCell className="text-muted-foreground">{t.owner}</TableCell>
                  <TableCell>
                    <StatusPill status={t.status} />
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {t.mrr ? KES(t.mrr) : "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {t.status === "Active" ? "This period" : "—"}
                  </TableCell>
                  <TableCell>
                    <StatusPill status={t.status === "Active" ? "Daraja STK" : "—"} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <ul className="mt-4 space-y-2 md:hidden">
          {tenants.map((t) => (
            <li key={t.id} className="rounded-xl border border-border p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold">{t.business}</p>
                <StatusPill status={t.status} />
              </div>
              <p className="text-muted-foreground mt-1 text-xs">{t.owner}</p>
              <p className="mt-2 text-sm font-semibold">{t.mrr ? KES(t.mrr) : "Trial"}</p>
            </li>
          ))}
        </ul>
      </div>
    </AdminShell>
  );
}
