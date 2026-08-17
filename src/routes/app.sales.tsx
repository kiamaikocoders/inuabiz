import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Download, Search } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { StatCard } from "@/components/app/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { KES, sales } from "@/lib/mock-data";

export const Route = createFileRoute("/app/sales")({
  head: () => ({
    meta: [
      { title: "Sales history — InuaBiz" },
      {
        name: "description",
        content:
          "Every transaction with its payment channel, status and reconciliation state, searchable and exportable.",
      },
      { property: "og:title", content: "InuaBiz sales history" },
      { property: "og:description", content: "Search, filter and export every recorded sale." },
    ],
  }),
  component: Sales,
});

function Sales() {
  const [q, setQ] = useState("");
  const [tab, setTab] = useState("all");

  const rows = sales.filter(
    (s) =>
      (tab === "all" || s.status.toLowerCase() === tab) &&
      (s.ref.toLowerCase().includes(q.toLowerCase()) ||
        s.customer.toLowerCase().includes(q.toLowerCase())),
  );

  const completed = sales.filter((s) => s.status === "Complete");
  const gross = completed.reduce((a, b) => a + b.total, 0);

  return (
    <AppShell
      title="Sales"
      description="Every transaction and its reconciliation status"
      actions={
        <Button variant="outline" size="sm" className="hidden sm:inline-flex">
          <Download className="mr-2 size-4" /> Export
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Gross sales" value={KES(gross)} delta={12} hint="today" />
        <StatCard label="Transactions" value={String(sales.length)} delta={6} hint="today" />
        <StatCard
          label="Average basket"
          value={KES(Math.round(gross / Math.max(completed.length, 1)))}
          delta={3}
        />
        <StatCard
          label="Failed payments"
          value={String(sales.filter((s) => s.status === "Failed").length)}
          hint="needs retry"
          tone="danger"
        />
      </div>

      <div className="surface-card mt-4 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="complete">Complete</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="failed">Failed</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="relative sm:w-64">
            <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              className="pl-9"
              placeholder="Search ref or customer…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead className="text-right">Items</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.ref}</TableCell>
                  <TableCell className="text-muted-foreground">{s.time}</TableCell>
                  <TableCell>{s.customer}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{s.channel}</Badge>
                  </TableCell>
                  <TableCell className="text-right">{s.items}</TableCell>
                  <TableCell className="text-right font-semibold">{KES(s.total)}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        s.status === "Complete"
                          ? "secondary"
                          : s.status === "Failed"
                            ? "destructive"
                            : "outline"
                      }
                    >
                      {s.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-muted-foreground py-10 text-center">
                    No sales match this filter.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </AppShell>
  );
}
