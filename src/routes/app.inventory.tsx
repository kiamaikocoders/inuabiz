import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CircleSlash, Package, Plus, Search, TriangleAlert } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { StatCard } from "@/components/app/StatCard";
import { StatusEmpty } from "@/components/status/StatusPage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { KES, products as mockProducts } from "@/lib/mock-data";
import { fetchProducts } from "@/lib/data";

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

function Inventory() {
  const [q, setQ] = useState("");
  const { data: products = mockProducts } = useQuery({
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

  return (
    <AppShell
      title="Inventory"
      description="Stock levels, reorder points and margins"
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

      <div className="surface-card mt-4 p-5">
        <div className="relative sm:max-w-xs">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            className="pl-9"
            placeholder="Search products…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        <div className="mt-4 overflow-x-auto">
          {rows.length === 0 ? (
            <StatusEmpty
              icon={CircleSlash}
              title="No results match"
              description="Try a different search, or clear filters and browse inventory for this duka."
              primary={{ label: "Clear filters", onClick: () => setQ("") }}
              secondary={{ label: "Add product", to: "/app/inventory/new" }}
              meta="0 results"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Margin</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((p) => {
                  const margin = ((p.price - p.cost) / p.price) * 100;
                  const low = p.stock <= p.reorderLevel;
                  return (
                    <TableRow key={p.id} className="cursor-pointer">
                      <TableCell className="font-medium">
                        <Link
                          to="/app/inventory/$productId"
                          params={{ productId: p.id }}
                          className="hover:underline"
                        >
                          {p.emoji} {p.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{p.sku}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{p.category}</Badge>
                      </TableCell>
                      <TableCell className="text-right">{KES(p.cost)}</TableCell>
                      <TableCell className="text-right font-semibold">{KES(p.price)}</TableCell>
                      <TableCell className="text-right">{margin.toFixed(0)}%</TableCell>
                      <TableCell className="text-right">{p.stock}</TableCell>
                      <TableCell>
                        <Badge variant={low ? "destructive" : "secondary"}>
                          {low ? "Reorder" : "Healthy"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </AppShell>
  );
}
