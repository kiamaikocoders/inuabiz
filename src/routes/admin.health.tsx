import { createFileRoute } from "@tanstack/react-router";
import { Activity, Database, Gauge, Zap } from "lucide-react";
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
import { KES, platformHealth } from "@/lib/mock-data";

export const Route = createFileRoute("/admin/health")({
  head: () => ({
    meta: [
      { title: "Platform health — InuaBiz super admin" },
      {
        name: "description",
        content:
          "Monitor database connections, edge function latency, webhook retries, AI API spend and realtime channel load.",
      },
      { property: "og:title", content: "InuaBiz platform health" },
      { property: "og:description", content: "Database, functions, webhooks and AI spend monitoring." },
    ],
  }),
  component: Health,
});

const webhookLog = [
  { id: "w1", event: "payment.complete", tenant: "Njoroge Mini Mart", time: "09:41:02", attempts: 1, status: "Delivered" },
  { id: "w2", event: "payment.complete", tenant: "Highrise Chemist", time: "09:38:44", attempts: 1, status: "Delivered" },
  { id: "w3", event: "payment.failed", tenant: "Njoro Hardware", time: "09:22:10", attempts: 3, status: "Failed" },
  { id: "w4", event: "subscription.paid", tenant: "Mama Oliech Eatery", time: "08:57:31", attempts: 2, status: "Delivered" },
  { id: "w5", event: "payment.complete", tenant: "Unmapped", time: "08:14:07", attempts: 1, status: "Unclaimed" },
];

function Health() {
  return (
    <AdminShell title="Platform health" description="Infrastructure, webhooks and AI consumption">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Uptime (30d)" value="99.94%" icon={Activity} />
        <StatCard label="Edge fn p95" value="214 ms" delta={-8} icon={Zap} />
        <StatCard label="DB connections" value="34 / 100" icon={Database} />
        <StatCard label="AI spend (month)" value={KES(4120)} delta={11} icon={Gauge} tone="gold" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="surface-card p-5">
          <h2 className="font-semibold">Service status</h2>
          <div className="mt-5 space-y-5">
            {platformHealth.map((h) => (
              <div key={h.name}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{h.name}</span>
                  <Badge variant={h.status === "Healthy" ? "secondary" : "destructive"}>
                    {h.status}
                  </Badge>
                </div>
                <Progress value={h.value} className="mt-2 h-1.5" />
                <p className="text-muted-foreground mt-1 text-xs">{h.detail}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="surface-card p-5">
          <h2 className="font-semibold">Recent webhook deliveries</h2>
          <div className="mt-4 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead className="text-right">Tries</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {webhookLog.map((w) => (
                  <TableRow key={w.id}>
                    <TableCell className="font-medium">{w.event}</TableCell>
                    <TableCell className="text-muted-foreground">{w.tenant}</TableCell>
                    <TableCell className="text-muted-foreground">{w.time}</TableCell>
                    <TableCell className="text-right">{w.attempts}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          w.status === "Delivered"
                            ? "secondary"
                            : w.status === "Failed"
                              ? "destructive"
                              : "outline"
                        }
                      >
                        {w.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
