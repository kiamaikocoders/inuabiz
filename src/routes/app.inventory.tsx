import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Package, Plus, ScanBarcode, Search, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app/AppShell";
import { StatCard } from "@/components/app/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { KES, products } from "@/lib/mock-data";

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
  const [open, setOpen] = useState(false);

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
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1 size-4" /> Add product
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add a product</DialogTitle>
              <DialogDescription>
                Scan a barcode or type the details. Set a reorder level to get low-stock alerts.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4">
              <Button variant="outline" className="justify-start">
                <ScanBarcode className="mr-2 size-4" /> Scan barcode with camera
              </Button>
              <div className="space-y-2">
                <Label htmlFor="pn">Product name</Label>
                <Input id="pn" placeholder="Unga Pembe 2kg" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pc">Cost price</Label>
                  <Input id="pc" type="number" placeholder="155" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pp">Selling price</Label>
                  <Input id="pp" type="number" placeholder="195" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ps">Opening stock</Label>
                  <Input id="ps" type="number" placeholder="24" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pr">Reorder level</Label>
                  <Input id="pr" type="number" placeholder="10" />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                className="w-full"
                onClick={() => {
                  setOpen(false);
                  toast.success("Product saved", { description: "Front-end demo only for now." });
                }}
              >
                Save product
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      {p.emoji} {p.name}
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
        </div>
      </div>
    </AppShell>
  );
}
