import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CircleSlash, Download, RefreshCw, Search } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { SaleDetailDialog } from "@/components/app/SaleDetailDialog";
import { StatCard } from "@/components/app/StatCard";
import { StatusEmpty } from "@/components/status/StatusPage";
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
import { toast } from "sonner";
import { KES } from "@/lib/mock-data";
import { fetchSales } from "@/lib/data";
import { downloadCsv, fetchAuditInvoices } from "@/lib/ops";
import {
  countPendingOps,
  listUnresolvedConflicts,
  markConflictResolved,
} from "@/lib/offline/outbox";
import { flushOutbox } from "@/lib/offline/sync";
import type { SyncConflict } from "@/lib/offline/db";

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
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [tab, setTab] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [openSaleId, setOpenSaleId] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<SyncConflict[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncBusy, setSyncBusy] = useState(false);
  const { data: sales = [] } = useQuery({
    queryKey: ["sales"],
    queryFn: fetchSales,
  });

  const refreshOffline = () => {
    void listUnresolvedConflicts().then(setConflicts);
    void countPendingOps().then(setPendingCount);
  };

  useEffect(() => {
    refreshOffline();
    const onChange = () => refreshOffline();
    window.addEventListener("inuabiz-outbox", onChange);
    window.addEventListener("inuabiz-sync", onChange);
    return () => {
      window.removeEventListener("inuabiz-outbox", onChange);
      window.removeEventListener("inuabiz-sync", onChange);
    };
  }, []);

  const exportLedger = async () => {
    const from = fromDate ? new Date(`${fromDate}T00:00:00`).toISOString() : undefined;
    const to = toDate ? new Date(`${toDate}T23:59:59`).toISOString() : undefined;
    const rows = await fetchAuditInvoices(from, to);
    if (!rows.length) {
      toast.info("Nothing to export", { description: "No invoices in this date range." });
      return;
    }
    downloadCsv("inuabiz-audit-ledger.csv", [
      [
        "Invoice number",
        "Date",
        "Customer",
        "KRA PIN",
        "Rate A VAT 16%",
        "Rate B zero-rated",
        "Rate C exempt",
        "Total",
        "Payment",
        "M-Pesa code",
      ],
      ...rows.map((r) => [
        r.invoice_number,
        new Date(r.created_at).toLocaleString("en-KE"),
        r.customer_name ?? "",
        r.kra_pin ?? "",
        String(r.vat_16_amount),
        String(r.vat_0_amount),
        String(r.exempt_amount),
        String(r.total_amount),
        r.payment_method,
        r.mpesa_receipt_code ?? "",
      ]),
    ]);
    toast.success("CSV downloaded");
  };

  const rows = sales.filter(
    (s) =>
      (tab === "all" || s.status.toLowerCase() === tab) &&
      (s.ref.toLowerCase().includes(q.toLowerCase()) ||
        s.customer.toLowerCase().includes(q.toLowerCase()) ||
        (s.mpesaReceipt ?? "").toLowerCase().includes(q.toLowerCase())),
  );

  const completed = sales.filter((s) => s.status === "Complete");
  const gross = completed.reduce((a, b) => a + b.total, 0);

  return (
    <AppShell
      title="Sales"
      description="Every transaction and its reconciliation status"
      actions={
        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <Button
              variant="secondary"
              size="sm"
              disabled={syncBusy}
              onClick={() => {
                setSyncBusy(true);
                void flushOutbox()
                  .then((r) => {
                    refreshOffline();
                    void queryClient.invalidateQueries({ queryKey: ["sales"] });
                    void queryClient.invalidateQueries({ queryKey: ["products"] });
                    if (r.error === "offline") {
                      toast.error("Still offline");
                    } else if (r.conflicts > 0) {
                      toast.warning("Synced with conflicts", {
                        description: `${r.flushed} applied, ${r.conflicts} need review.`,
                      });
                    } else {
                      toast.success(
                        r.flushed
                          ? `Synced ${r.flushed} change${r.flushed === 1 ? "" : "s"}`
                          : "Nothing to sync",
                      );
                    }
                  })
                  .finally(() => setSyncBusy(false));
              }}
            >
              <RefreshCw className={`mr-2 size-4 ${syncBusy ? "animate-spin" : ""}`} />
              Sync ({pendingCount})
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="hidden sm:inline-flex"
            onClick={() => void exportLedger()}
          >
            <Download className="mr-2 size-4" /> Export
          </Button>
        </div>
      }
    >
      {conflicts.length > 0 && (
        <div className="mb-4 rounded-xl border border-destructive/40 bg-destructive/10 p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">
                {conflicts.length} sync conflict{conflicts.length === 1 ? "" : "s"}
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                Stock or ledger did not match the server. Resolve each item after you check the
                till.
              </p>
              <ul className="mt-3 space-y-2">
                {conflicts.map((c) => (
                  <li
                    key={c.id}
                    className="flex flex-col gap-2 rounded-lg border border-border/60 bg-background/70 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        <Badge variant="outline" className="mr-2 font-mono text-[10px]">
                          {c.code}
                        </Badge>
                        {c.message}
                      </p>
                      <p className="text-muted-foreground mt-0.5 text-[11px]">
                        {new Date(c.createdAt).toLocaleString("en-KE")}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        void markConflictResolved(c.id).then(() => {
                          refreshOffline();
                          toast.success("Marked reviewed");
                        });
                      }}
                    >
                      Mark reviewed
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Gross sales" value={KES(gross)} delta={12} hint="today" />
        <StatCard label="Transactions" value={String(sales.length)} delta={6} hint="today" />
        <StatCard
          label="Average basket"
          value={KES(Math.round(gross / Math.max(completed.length, 1)))}
          delta={3}
        />
        <StatCard
          label="Pending sync"
          value={String(pendingCount)}
          hint={conflicts.length ? `${conflicts.length} conflicts` : "queued on this phone"}
          {...(conflicts.length ? { tone: "danger" as const } : {})}
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
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              type="date"
              className="sm:w-40"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              aria-label="From date"
            />
            <Input
              type="date"
              className="sm:w-40"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              aria-label="To date"
            />
            <div className="relative sm:w-64">
              <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                className="pl-9"
                placeholder="Search ref, M-Pesa or customer…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              className="sm:hidden"
              onClick={() => void exportLedger()}
            >
              <Download className="mr-2 size-4" /> Export
            </Button>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          {rows.length === 0 ? (
            <StatusEmpty
              icon={CircleSlash}
              title="No results match"
              description="Try a different search, or clear filters and browse this duka's sales."
              primary={{
                label: "Clear filters",
                onClick: () => {
                  setQ("");
                  setTab("all");
                },
              }}
              secondary={{ label: "Open POS", to: "/app/pos" }}
              meta="0 results"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>M-Pesa</TableHead>
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
                  <TableRow
                    key={s.id}
                    className="hover:bg-muted/40 cursor-pointer"
                    onClick={() => setOpenSaleId(s.id)}
                  >
                    <TableCell className="font-medium">
                      <span className="text-primary">{s.ref}</span>
                    </TableCell>
                    <TableCell className="font-mono text-xs tracking-wide">
                      {s.mpesaReceipt ?? "—"}
                    </TableCell>
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
              </TableBody>
            </Table>
          )}
        </div>
      </div>
      <SaleDetailDialog saleId={openSaleId} onOpenChange={(open) => !open && setOpenSaleId(null)} />
    </AppShell>
  );
}
