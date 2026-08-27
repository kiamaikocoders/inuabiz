import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock, LayoutGrid, Ticket, UtensilsCrossed } from "lucide-react";
import { AdminShell } from "@/components/app/AdminShell";
import { StatCard } from "@/components/app/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CATEGORY_CATALOG, CATEGORY_LIST, type BusinessCategory } from "@/lib/category";
import { categoryMix, fetchAdminCategoryDesk } from "@/lib/admin-category";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/categories")({
  head: () => ({
    meta: [
      { title: "Shop categories — InuaBiz admin" },
      {
        name: "description",
        content:
          "Live shop counts by category, expiry watch, kitchen and service tickets, and occupied restaurant tables.",
      },
    ],
  }),
  component: AdminCategories,
});

function AdminCategories() {
  const [filter, setFilter] = useState<BusinessCategory | "ALL">("ALL");
  const { data } = useQuery({
    queryKey: ["admin-category-desk"],
    queryFn: fetchAdminCategoryDesk,
  });
  const shops = data?.shops ?? [];
  const expiry = data?.expiry ?? [];
  const tickets = data?.tickets ?? [];
  const floor = data?.floor ?? [];

  const mix = useMemo(() => categoryMix(shops), [shops]);
  const dueSoon = expiry.filter((r) => r.days <= 30);
  const match = (cat: BusinessCategory) => filter === "ALL" || filter === cat;
  const expiryRows = expiry.filter((r) => match(r.category));
  const ticketRows = tickets.filter((r) => match(r.category));
  const floorRows = floor.filter((r) => {
    const shop = shops.find((s) => s.id === r.shopId);
    return match(shop?.category ?? "EATERY");
  });

  return (
    <AdminShell
      title="Shop categories"
      description="What each till is running — expiry, tickets and floor, not just the org label"
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Live shops" value={String(shops.length)} icon={LayoutGrid} />
        <StatCard
          label="Expiring in 30 days"
          value={String(dueSoon.length)}
          icon={CalendarClock}
          tone="danger"
        />
        <StatCard label="Open tickets" value={String(tickets.length)} icon={Ticket} tone="gold" />
        <StatCard
          label="Tables seated / billing"
          value={String(floor.length)}
          icon={UtensilsCrossed}
          tone="violet"
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
        <button
          type="button"
          onClick={() => setFilter("ALL")}
          className={cn(
            "rounded-xl border px-3 py-3 text-left",
            filter === "ALL" ? "border-primary bg-primary/10" : "border-border bg-card",
          )}
        >
          <p className="text-xs font-semibold">All categories</p>
          <p className="text-muted-foreground mt-1 text-[11px]">{shops.length} shops</p>
        </button>
        {mix.map((row) => {
          const def = CATEGORY_CATALOG[row.id];
          return (
            <button
              key={row.id}
              type="button"
              onClick={() => setFilter(row.id)}
              className={cn(
                "rounded-xl border px-3 py-3 text-left",
                filter === row.id ? "border-primary bg-primary/10" : "border-border bg-card",
              )}
            >
              <p className="text-sm font-semibold">
                {def.emoji} {def.label}
              </p>
              <p className="text-muted-foreground mt-1 text-[11px]">
                {row.shops} shop{row.shops === 1 ? "" : "s"} · {row.tenants} org
                {row.tenants === 1 ? "" : "s"}
              </p>
            </button>
          );
        })}
      </div>

      {filter !== "ALL" && (
        <p className="text-muted-foreground mt-3 text-sm">
          {CATEGORY_CATALOG[filter].blurb}{" "}
          <span className="text-foreground font-medium">
            Modules:{" "}
            {CATEGORY_CATALOG[filter].modules.length
              ? CATEGORY_CATALOG[filter].modules.join(", ")
              : "core till only"}
          </span>
        </p>
      )}

      <section className="surface-card mt-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">Expiry watch</h2>
          <Badge variant="outline">{expiryRows.length}</Badge>
        </div>
        <p className="text-muted-foreground mt-1 text-xs">
          Chemist and agritech lots with an expiry date. Same list cashiers see on Expiry.
        </p>
        <OpsTable
          empty="No expiry dates on file for this filter."
          heads={["Product", "Shop", "Org", "Batch", "Date", "Left"]}
          rows={expiryRows.slice(0, 40).map((r) => [
            r.name,
            r.shopName,
            r.tenantName,
            r.batch ?? "—",
            r.expiry,
            r.days < 0 ? `${Math.abs(r.days)}d overdue` : `${r.days}d`,
          ])}
          danger={(row) =>
            String(row[5]).includes("overdue") || Number.parseInt(String(row[5]), 10) <= 7
          }
        />
      </section>

      <section className="surface-card mt-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">Open kitchen & service tickets</h2>
          <Badge variant="outline">{ticketRows.length}</Badge>
        </div>
        <OpsTable
          empty="No open tickets."
          heads={["Ticket", "Kind", "Status", "Shop", "Org"]}
          rows={ticketRows
            .slice(0, 40)
            .map((r) => [r.title, r.kind, r.status, r.shopName, r.tenantName])}
        />
      </section>

      <section className="surface-card mt-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">Occupied tables</h2>
          <Badge variant="outline">{floorRows.length}</Badge>
        </div>
        <OpsTable
          empty="No seated or billing tables."
          heads={["Table", "Status", "Seats", "Shop", "Org"]}
          rows={floorRows.map((r) => [r.label, r.status, String(r.seats), r.shopName, r.tenantName])}
        />
      </section>

      <p className="text-muted-foreground mt-4 text-xs">
        Impersonate a vendor from{" "}
        <Button variant="link" className="h-auto p-0 text-xs" asChild>
          <Link to="/admin/vendors">Vendors</Link>
        </Button>{" "}
        to walk the same till they see. Categories: {CATEGORY_LIST.map((c) => c.label).join(", ")}.
      </p>
    </AdminShell>
  );
}

function OpsTable({
  heads,
  rows,
  empty,
  danger,
}: {
  heads: string[];
  rows: string[][];
  empty: string;
  danger?: (row: string[]) => boolean;
}) {
  if (!rows.length) {
    return <p className="text-muted-foreground mt-3 text-sm">{empty}</p>;
  }
  return (
    <>
      <div className="mt-3 hidden overflow-x-auto md:block">
        <Table>
          <TableHeader>
            <TableRow>
              {heads.map((h) => (
                <TableHead key={h}>{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, i) => (
              <TableRow key={`${row[0]}-${i}`}>
                {row.map((cell, j) => (
                  <TableCell
                    key={`${heads[j]}-${j}`}
                    className={cn(
                      j === 0 && "font-medium",
                      danger?.(row) && j === row.length - 1 && "text-destructive",
                    )}
                  >
                    {cell}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <ul className="mt-3 space-y-2 md:hidden">
        {rows.map((row, i) => (
          <li key={`${row[0]}-m-${i}`} className="rounded-xl border border-border p-3">
            <p className="text-sm font-semibold">{row[0]}</p>
            <p className="text-muted-foreground mt-1 text-xs">
              {heads
                .slice(1)
                .map((h, j) => `${h}: ${row[j + 1]}`)
                .join(" · ")}
            </p>
          </li>
        ))}
      </ul>
    </>
  );
}
