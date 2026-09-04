import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Banknote, Check, Plus, RefreshCw, Search, X } from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/app/AdminShell";
import { StatCard } from "@/components/app/StatCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { fetchTenants } from "@/lib/data";
import {
  adminEnableCurrency,
  CBK_CURRENCIES,
  cbkCurrencyName,
  fetchAdminCurrencyRequests,
  fetchAllFxRates,
  refreshFxFromCbk,
  reviewCurrencyRequest,
} from "@/lib/fx";

export const Route = createFileRoute("/admin/fx")({
  head: () => ({
    meta: [
      { title: "CBK FX rates — InuaBiz super admin" },
      {
        name: "description",
        content:
          "Pull Central Bank of Kenya exchange rates and approve vendor requests for extra cash currencies.",
      },
    ],
  }),
  component: AdminFxPage,
});

function AdminFxPage() {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [rateQ, setRateQ] = useState("");
  const [grantTenantId, setGrantTenantId] = useState("");
  const [grantCurrency, setGrantCurrency] = useState("EUR");

  const { data: rates = [], isLoading: ratesLoading } = useQuery({
    queryKey: ["admin-fx-rates"],
    queryFn: fetchAllFxRates,
  });
  const { data: requests = [] } = useQuery({
    queryKey: ["admin-currency-requests"],
    queryFn: fetchAdminCurrencyRequests,
  });
  const { data: tenants = [] } = useQuery({
    queryKey: ["admin-tenants"],
    queryFn: fetchTenants,
  });

  const pending = useMemo(() => requests.filter((r) => r.status === "pending"), [requests]);
  const usd = rates.find((r) => r.currency === "USD");
  const rateMap = useMemo(() => new Map(rates.map((r) => [r.currency, r])), [rates]);

  const catalogRows = useMemo(() => {
    const q = rateQ.trim().toLowerCase();
    return CBK_CURRENCIES.filter(
      (c) =>
        !q ||
        c.code.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q),
    ).map((c) => {
      const live = rateMap.get(c.code);
      return {
        code: c.code,
        name: c.name,
        rate: live?.rate ?? 0,
        date: live?.date ?? null,
        cached: Boolean(live),
      };
    });
  }, [rateMap, rateQ]);

  const pullCbk = () => {
    setBusy(true);
    void refreshFxFromCbk()
      .then(async (res) => {
        toast.success("CBK rates refreshed", {
          description: `${res.currencies} currencies${res.date ? ` · ${res.date}` : ""}`,
        });
        await queryClient.invalidateQueries({ queryKey: ["admin-fx-rates"] });
      })
      .catch((err: unknown) =>
        toast.error("CBK pull failed", {
          description: err instanceof Error ? err.message : "Try again.",
        }),
      )
      .finally(() => setBusy(false));
  };

  const review = (id: string, status: "approved" | "rejected") => {
    setBusy(true);
    void reviewCurrencyRequest({ id, status, adminNote: notes[id] })
      .then(async () => {
        toast.success(status === "approved" ? "Currency enabled" : "Request rejected");
        await queryClient.invalidateQueries({ queryKey: ["admin-currency-requests"] });
      })
      .catch((err: unknown) =>
        toast.error("Could not update request", {
          description: err instanceof Error ? err.message : "Try again.",
        }),
      )
      .finally(() => setBusy(false));
  };

  const grant = () => {
    if (!grantTenantId || !grantCurrency) {
      toast.error("Pick a shop and currency");
      return;
    }
    setBusy(true);
    void adminEnableCurrency({ tenantId: grantTenantId, currency: grantCurrency })
      .then(async () => {
        toast.success(`${grantCurrency} enabled`, {
          description: tenants.find((t) => t.id === grantTenantId)?.business ?? grantTenantId,
        });
        await queryClient.invalidateQueries({ queryKey: ["admin-currency-requests"] });
      })
      .catch((err: unknown) =>
        toast.error("Could not enable currency", {
          description: err instanceof Error ? err.message : "Try again.",
        }),
      )
      .finally(() => setBusy(false));
  };

  return (
    <AdminShell
      title="CBK FX & currencies"
      description="Morning CBK pull, full currency catalog, and vendor requests"
      actions={
        <Button size="sm" onClick={pullCbk} disabled={busy}>
          <RefreshCw className={`mr-2 size-4 ${busy ? "animate-spin" : ""}`} />
          Pull CBK now
        </Button>
      }
    >
      <div className="grid gap-3 sm:grid-cols-4">
        <StatCard label="USD / KES" value={usd ? usd.rate.toFixed(2) : "—"} />
        <StatCard label="CBK catalog" value={String(CBK_CURRENCIES.length)} />
        <StatCard label="Rates cached" value={String(rates.length)} />
        <StatCard label="Pending requests" value={String(pending.length)} />
      </div>

      <section className="surface-card mt-6 overflow-hidden">
        <div className="border-border flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
          <div>
            <h2 className="font-display text-base font-semibold">CBK currency catalog</h2>
            <p className="text-muted-foreground text-xs">
              All {CBK_CURRENCIES.length} codes CBK publishes · KES per 1 foreign unit
              {usd?.date ? ` · value date ${usd.date}` : ""}
            </p>
          </div>
          <div className="relative w-full max-w-xs">
            <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
            <Input
              className="h-9 pl-8"
              placeholder="Search code or name…"
              value={rateQ}
              onChange={(e) => setRateQ(e.target.value)}
            />
          </div>
        </div>
        {ratesLoading ? (
          <p className="text-muted-foreground p-4 text-sm">Loading…</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Currency</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="text-right">KES / unit</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {catalogRows.map((r) => (
                <TableRow key={r.code}>
                  <TableCell className="font-semibold">
                    {r.code}
                    {r.code === "USD" ? (
                      <Badge className="ml-2" variant="secondary">
                        primary
                      </Badge>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{r.name}</TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {r.cached ? r.rate.toFixed(4) : "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{r.date ?? "—"}</TableCell>
                  <TableCell>
                    {r.cached ? (
                      <Badge variant="secondary">Cached</Badge>
                    ) : (
                      <Badge variant="outline">Pull CBK</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {rates.length === 0 && (
          <p className="text-muted-foreground border-border border-t px-4 py-3 text-xs">
            Rates show as empty until you pull CBK. Catalog rows are always listed.
          </p>
        )}
      </section>

      <section className="surface-card mt-6 p-4">
        <div className="mb-3 flex items-center gap-2">
          <Plus className="size-4" />
          <div>
            <h2 className="font-display text-base font-semibold">Enable currency for a shop</h2>
            <p className="text-muted-foreground text-xs">
              Grant any CBK cash tender without waiting for a vendor request. USD is always on.
            </p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_180px_auto] sm:items-end">
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">Shop</Label>
            <Select value={grantTenantId} onValueChange={setGrantTenantId}>
              <SelectTrigger>
                <SelectValue placeholder="Select vendor…" />
              </SelectTrigger>
              <SelectContent>
                {tenants.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.business}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">Currency</Label>
            <Select value={grantCurrency} onValueChange={setGrantCurrency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CBK_CURRENCIES.filter((c) => c.code !== "USD").map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.code} · {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="button" disabled={busy || !grantTenantId} onClick={grant}>
            <Banknote className="mr-2 size-4" />
            Enable {grantCurrency}
          </Button>
        </div>
      </section>

      <section className="surface-card mt-6 overflow-hidden">
        <div className="border-border border-b px-4 py-3">
          <h2 className="font-display text-base font-semibold">Vendor currency requests</h2>
          <p className="text-muted-foreground text-xs">
            Approve to enable that cash tender on their till. USD is always on.
          </p>
        </div>
        {requests.length === 0 ? (
          <p className="text-muted-foreground p-4 text-sm">No requests yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Shop</TableHead>
                <TableHead>Currency</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <p className="font-medium">{r.tenantName ?? r.tenantId.slice(0, 8)}</p>
                    <p className="text-muted-foreground text-[11px]">
                      {new Date(r.createdAt).toLocaleString("en-KE")}
                    </p>
                  </TableCell>
                  <TableCell className="font-semibold">
                    {r.currency}
                    <span className="text-muted-foreground ml-1 text-xs font-normal">
                      {cbkCurrencyName(r.currency)}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-[280px] text-sm">{r.message}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        r.status === "approved"
                          ? "default"
                          : r.status === "rejected"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {r.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {r.status === "pending" ? (
                      <div className="flex flex-col items-end gap-2">
                        <Input
                          className="h-8 w-44 text-xs"
                          placeholder="Admin note (optional)"
                          value={notes[r.id] ?? ""}
                          onChange={(e) =>
                            setNotes((prev) => ({ ...prev, [r.id]: e.target.value }))
                          }
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busy}
                            onClick={() => review(r.id, "rejected")}
                          >
                            <X className="mr-1 size-3.5" /> Reject
                          </Button>
                          <Button size="sm" disabled={busy} onClick={() => review(r.id, "approved")}>
                            <Check className="mr-1 size-3.5" /> Approve
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-xs">{r.adminNote ?? "—"}</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </AdminShell>
  );
}
