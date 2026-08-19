import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Banknote, CircleCheck, Percent, RefreshCw, ShieldAlert, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/app/AdminShell";
import { StatCard } from "@/components/app/StatCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { KES, tenants, unclaimedPayments } from "@/lib/mock-data";
import { suggestUnclaimedMatches } from "@/lib/admin-ai";

export const Route = createFileRoute("/admin/unclaimed")({
  head: () => ({
    meta: [
      { title: "Unclaimed payments — InuaBiz super admin" },
      {
        name: "description",
        content:
          "Reconciliation queue for inbound payment webhooks that failed automated tenant matching, with one-click manual assignment.",
      },
      { property: "og:title", content: "InuaBiz unclaimed payment queue" },
      { property: "og:description", content: "Map orphaned M-Pesa webhooks to the right vendor." },
    ],
  }),
  component: Unclaimed,
});

function Unclaimed() {
  const [queue, setQueue] = useState(unclaimedPayments);
  const [assign, setAssign] = useState<Record<string, string>>({});
  const [matching, setMatching] = useState(false);

  const total = queue.reduce((s, p) => s + p.amount, 0);

  return (
    <AdminShell
      title="Unclaimed payments"
      description="Webhooks whose api_ref failed to match a tenant"
      actions={
        <div className="hidden gap-2 sm:flex">
          <Button
            size="sm"
            variant="outline"
            className="rounded-[10px]"
            disabled={matching}
            onClick={() => {
              setMatching(true);
              void suggestUnclaimedMatches()
                .then((matches) => {
                  const next: Record<string, string> = {};
                  for (const m of matches) next[m.paymentId] = m.tenantId;
                  setAssign((prev) => ({ ...prev, ...next }));
                  toast.success("AI matches filled", {
                    description: "Review confidence, then assign.",
                  });
                })
                .catch((err: unknown) =>
                  toast.error("Match failed", {
                    description: err instanceof Error ? err.message : "Try again",
                  }),
                )
                .finally(() => setMatching(false));
            }}
          >
            <Sparkles className="size-3.5" /> {matching ? "Matching…" : "AI match"}
          </Button>
          <Button
            size="sm"
            variant="ink"
            className="rounded-[10px]"
            onClick={() => {
              setQueue(unclaimedPayments);
              setAssign({});
              toast.success("Queue refreshed");
            }}
          >
            <RefreshCw className="size-3.5" /> Refresh queue
          </Button>
        </div>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="In queue" value={String(queue.length)} icon={ShieldAlert} tone="danger" />
        <StatCard label="Value held" value={KES(total)} icon={Banknote} tone="gold" />
        <StatCard
          label="Resolved this month"
          value="7"
          delta={-30}
          hint="fewer than last month"
          icon={CircleCheck}
          tone="success"
        />
        <StatCard label="Auto-match rate" value="98.4%" delta={1} icon={Percent} tone="teal" />
      </div>

      <div className="mt-4 rounded-xl border border-border bg-muted p-4">
        <p className="text-sm font-semibold">How this queue fills up</p>
        <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
          When a payment completes but the <code className="text-foreground">api_ref</code> is
          missing or corrupted, the payload lands here instead of being silently dropped. Assign it
          to the right vendor and their subscription or sale reconciles immediately.
        </p>
      </div>

      <div className="surface-card mt-4 p-5">
        <h2 className="font-semibold">Queue</h2>
        <div className="mt-4 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice ID</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Payer account</TableHead>
                <TableHead>api_ref</TableHead>
                <TableHead>Received</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Assign to</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {queue.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.invoiceId}</TableCell>
                  <TableCell className="text-right font-semibold">{KES(p.amount)}</TableCell>
                  <TableCell className="text-muted-foreground">{p.account}</TableCell>
                  <TableCell className="text-muted-foreground">{p.apiRef}</TableCell>
                  <TableCell className="text-muted-foreground">{p.received}</TableCell>
                  <TableCell>
                    <Badge variant="destructive">{p.reason}</Badge>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={assign[p.id] ?? ""}
                      onValueChange={(v) => setAssign((a) => ({ ...a, [p.id]: v }))}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Choose vendor" />
                      </SelectTrigger>
                      <SelectContent>
                        {tenants.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.business}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      disabled={!assign[p.id]}
                      onClick={() => {
                        setQueue((q) => q.filter((x) => x.id !== p.id));
                        toast.success("Payment assigned", {
                          description: `${p.invoiceId} mapped to ${
                            tenants.find((t) => t.id === assign[p.id])?.business ?? "vendor"
                          }.`,
                        });
                      }}
                    >
                      Assign
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {queue.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-muted-foreground py-10 text-center">
                    Queue is clear — every payment matched a tenant.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </AdminShell>
  );
}
