import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Activity, Database, Gauge, ScrollText, Sparkles, Zap } from "lucide-react";
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
import { buildPlatformSnapshot, fetchAiSpendThisMonth } from "@/lib/admin-ai";
import { fetchUnclaimedPayments } from "@/lib/ops";
import { isSupabaseConfigured } from "@/lib/supabase";

export const Route = createFileRoute("/admin/health")({
  head: () => ({
    meta: [
      { title: "Platform health — InuaBiz super admin" },
      {
        name: "description",
        content:
          "Monitor unmatched webhooks, AI API spend, tenant mix and the unclaimed payment queue.",
      },
      { property: "og:title", content: "InuaBiz platform health" },
      {
        property: "og:description",
        content: "Live unclaimed queue, tenant mix and AI spend.",
      },
    ],
  }),
  component: Health,
});

function Health() {
  const live = isSupabaseConfigured();
  const { data: snap } = useQuery({
    queryKey: ["admin-ai-snapshot"],
    queryFn: buildPlatformSnapshot,
    enabled: live,
  });
  const { data: spend } = useQuery({
    queryKey: ["admin-ai-spend"],
    queryFn: fetchAiSpendThisMonth,
    enabled: live,
  });
  const { data: unclaimed = [] } = useQuery({
    queryKey: ["unclaimed-payments"],
    queryFn: fetchUnclaimedPayments,
    enabled: live,
  });

  const webhookLog = unclaimed.slice(0, 12).map((p) => ({
    id: p.id,
    event: "payment.unmatched",
    tenant: p.account,
    time: p.received,
    attempts: 1,
    status: "Unclaimed",
  }));

  return (
    <AdminShell
      title="Platform health"
      description="Live queue, tenant mix and Admin AI spend — no synthetic uptime."
      actions={
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" className="rounded-[10px]" asChild>
            <Link to="/admin/ai">
              <Sparkles className="size-3.5" /> Admin AI
            </Link>
          </Button>
          <Button
            size="sm"
            variant="ink"
            className="rounded-[10px]"
            onClick={() => {
              document.getElementById("webhook-log")?.scrollIntoView({ behavior: "smooth" });
              toast.message("Unclaimed queue", { description: "Scrolled to unmatched webhooks." });
            }}
          >
            <ScrollText className="size-3.5" /> Open logs
          </Button>
        </div>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Paying tenants"
          value={String(snap?.tenantCounts.Active ?? 0)}
          icon={Activity}
          tone="success"
        />
        <StatCard
          label="Open trials"
          value={String(snap?.tenantCounts.Trial ?? 0)}
          icon={Zap}
          tone="violet"
        />
        <StatCard
          label="Unclaimed"
          value={String(unclaimed.length)}
          hint={KES(snap?.unclaimed.valueKes ?? 0)}
          icon={Database}
          tone="teal"
        />
        <StatCard
          label="Admin AI spend (month)"
          value={KES(Math.round(spend?.costKes ?? 0))}
          hint={`${spend?.runs ?? 0} logged copilot runs`}
          icon={Gauge}
          tone="gold"
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="surface-card p-5">
          <h2 className="font-semibold">Service status</h2>
          <div className="mt-5 space-y-5">
            {(snap?.health ?? []).length === 0 && (
              <p className="text-muted-foreground text-sm">Sign in as super-admin to load live checks.</p>
            )}
            {(snap?.health ?? []).map((h) => (
              <div key={h.name}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{h.name}</span>
                  <StatusPill status={h.status} />
                </div>
                <Progress value={h.value} className="mt-2 h-1.5" />
                <p className="text-muted-foreground mt-1 text-xs">{h.detail}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="surface-card p-5" id="webhook-log">
          <h2 className="font-semibold">Unmatched payment webhooks</h2>
          {webhookLog.length === 0 ? (
            <p className="text-muted-foreground mt-4 text-sm">Queue is clear — no unmatched C2B or Paybill hits.</p>
          ) : (
            <>
              <div className="mt-4 hidden overflow-x-auto md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Event</TableHead>
                      <TableHead>Account</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {webhookLog.map((w) => (
                      <TableRow key={w.id}>
                        <TableCell className="font-medium">{w.event}</TableCell>
                        <TableCell className="text-muted-foreground">{w.tenant}</TableCell>
                        <TableCell className="text-muted-foreground">{w.time}</TableCell>
                        <TableCell>
                          <StatusPill status={w.status} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <ul className="mt-4 space-y-2 md:hidden">
                {webhookLog.map((w) => (
                  <li key={w.id} className="rounded-xl border border-border p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold">{w.event}</p>
                      <StatusPill status={w.status} />
                    </div>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {w.tenant} · {w.time}
                    </p>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </AdminShell>
  );
}
