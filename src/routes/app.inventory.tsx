import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CircleSlash, LayoutGrid, List, Package, Plus, Search, TriangleAlert } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { ProductThumb } from "@/components/app/ProductThumb";
import { StatCard } from "@/components/app/StatCard";
import { StatusEmpty } from "@/components/status/StatusPage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { KES } from "@/lib/mock-data";
import { fetchProducts } from "@/lib/data";
import { useShopCategory } from "@/hooks/use-shop-category";
import { cn } from "@/lib/utils";
import type { Product } from "@/lib/mock-data";

const VIEW_KEY = "inuabiz:inventory-view";

export const Route = createFileRoute("/app/inventory")({
  head: () => ({
    meta: [
      { title: "Inventory & stock alerts — InuaBiz" },
      {
        name: "description",
        content:
          "Track live stock levels, reorder thresholds and true margins on cost versus selling price for every product.",
      },
      { property: "og:title", content: "InuaBiz inventory" },
      { property: "og:description", content: "Live stock levels, reorder alerts and margins." },
    ],
  }),
  component: Inventory,
});

function stockFill(p: Product): number {
  const cap = Math.max(p.reorderLevel * 3, p.stock, 1);
  return Math.min(100, Math.round((p.stock / cap) * 100));
}

function Inventory() {
  const [q, setQ] = useState("");
  const [view, setView] = useState<"grid" | "list">(() => {
    if (typeof window === "undefined") return "grid";
    return window.localStorage.getItem(VIEW_KEY) === "list" ? "list" : "grid";
  });
  const { def, hasModule } = useShopCategory();
  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: fetchProducts,
  });

  const rows = products.filter(
    (p) =>
      p.name.toLowerCase().includes(q.toLowerCase()) ||
      p.sku.toLowerCase().includes(q.toLowerCase()),
  );
  const lowStock = products.filter((p) => p.stock <= p.reorderLevel);
  const stockValue = products.reduce((s, p) => s + p.cost * Math.min(p.stock, 500), 0);
  const avgMargin =
    products.reduce((s, p) => s + ((p.price - p.cost) / p.price) * 100, 0) / products.length;

  const setInventoryView = (next: "grid" | "list") => {
    setView(next);
    window.localStorage.setItem(VIEW_KEY, next);
  };

  return (
    <AppShell
      title="Inventory"
      description={def.inventoryHint}
      actions={
        <Button size="sm" asChild>
          <Link to="/app/inventory/new">
            <Plus className="mr-1 size-4" /> Add product
          </Link>
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Products" value={String(products.length)} icon={Package} />
        <StatCard label="Stock value" value={KES(stockValue)} hint="at cost" />
        <StatCard label="Average margin" value={`${avgMargin.toFixed(1)}%`} delta={2} />
        <StatCard
          label="Below reorder level"
          value={String(lowStock.length)}
          icon={TriangleAlert}
          tone="danger"
          hint="reorder now"
        />
      </div>

      {lowStock.length > 0 && (
        <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/8 p-4">
          <p className="text-destructive inline-flex items-center gap-2 text-sm font-semibold">
            <TriangleAlert className="size-4" /> {lowStock.length} products need reordering
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {lowStock.map((p) => (
              <Badge key={p.id} variant="outline" className="bg-card">
                {p.emoji} {p.name} · {p.stock} left
              </Badge>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            className="pl-9"
            placeholder="Search products…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-sm">View:</span>
          <ToggleGroup
            type="single"
            value={view}
            onValueChange={(v) => {
              if (v === "grid" || v === "list") setInventoryView(v);
            }}
            variant="outline"
            size="sm"
          >
            <ToggleGroupItem
              value="grid"
              aria-label="Grid view"
              className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
            >
              <LayoutGrid />
              Grid
            </ToggleGroupItem>
            <ToggleGroupItem
              value="list"
              aria-label="List view"
              className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
            >
              <List />
              List
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="surface-card mt-4 p-5">
          <StatusEmpty
            icon={CircleSlash}
            title="No results match"
            description="Try a different search, or clear filters and browse inventory for this duka."
            primary={{ label: "Clear filters", onClick: () => setQ("") }}
            secondary={{ label: "Add product", to: "/app/inventory/new" }}
            meta="0 results"
          />
        </div>
      ) : view === "grid" ? (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
          {rows.map((p) => {
            const low = p.stock <= p.reorderLevel;
            const fill = stockFill(p);
            return (
              <article key={p.id} className="surface-card flex flex-col overflow-hidden p-2">
                <ProductThumb
                  src={p.imageUrl}
                  alt={p.name}
                  emoji={p.emoji}
                  className="h-24 w-full rounded-md"
                />
                <h3 className="mt-2 line-clamp-1 text-sm font-semibold">{p.name}</h3>
                <p className="text-foreground text-sm">{KES(p.price)}</p>
                <div className="bg-muted mt-2 h-1 overflow-hidden rounded-full">
                  <div
                    className={cn("h-full rounded-full", low ? "bg-destructive" : "bg-primary")}
                    style={{ width: `${fill}%` }}
                  />
                </div>
                <p className="text-muted-foreground mt-1 text-[11px]">
                  Stock: {p.stock}
                  {low ? " · reorder" : ""}
                </p>
                <Button size="sm" className="mt-2 h-8 w-full text-xs" asChild>
                  <Link to="/app/inventory/$productId" params={{ productId: p.id }}>
                    Edit stock
                  </Link>
                </Button>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="surface-card mt-4 overflow-x-auto p-5">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Department</TableHead>
                {hasModule("expiry_alerts") && <TableHead>Expiry</TableHead>}
                {hasModule("batch_tracking") && <TableHead>Batch</TableHead>}
                <TableHead className="text-right">Cost</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Margin</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[1%]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((p) => {
                const margin = ((p.price - p.cost) / p.price) * 100;
                const low = p.stock <= p.reorderLevel;
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      <Link
                        to="/app/inventory/$productId"
                        params={{ productId: p.id }}
                        className="flex items-center gap-3 hover:underline"
                      >
                        <ProductThumb
                          src={p.imageUrl}
                          alt=""
                          emoji={p.emoji}
                          className="size-10 shrink-0 rounded-md"
                        />
                        {p.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{p.sku}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{p.category}</Badge>
                    </TableCell>
                    {hasModule("expiry_alerts") && (
                      <TableCell className="text-muted-foreground text-xs">
                        {p.attrs?.expiry_date ?? "—"}
                      </TableCell>
                    )}
                    {hasModule("batch_tracking") && (
                      <TableCell className="text-muted-foreground text-xs">
                        {p.attrs?.batch_number ?? "—"}
                      </TableCell>
                    )}
                    <TableCell className="text-right">{KES(p.cost)}</TableCell>
                    <TableCell className="text-right font-semibold">{KES(p.price)}</TableCell>
                    <TableCell className="text-right">{margin.toFixed(0)}%</TableCell>
                    <TableCell className="text-right">{p.stock}</TableCell>
                    <TableCell>
                      <Badge variant={low ? "destructive" : "secondary"}>
                        {low ? "Reorder" : "Healthy"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost" asChild>
                        <Link to="/app/inventory/$productId" params={{ productId: p.id }}>
                          Edit
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </AppShell>
  );
}
