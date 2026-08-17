import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Minus, Plus, ScanBarcode, Search, Smartphone, Trash2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { KES, products } from "@/lib/mock-data";

export const Route = createFileRoute("/app/pos")({
  head: () => ({
    meta: [
      { title: "Point of sale — InuaBiz" },
      {
        name: "description",
        content:
          "Fast mobile checkout: search or scan products, apply discounts and trigger an M-Pesa STK push in seconds.",
      },
      { property: "og:title", content: "InuaBiz point of sale" },
      { property: "og:description", content: "Checkout, discounts and M-Pesa STK push in seconds." },
    ],
  }),
  component: POS,
});

type CartLine = { id: string; qty: number };

const categories = ["All", ...Array.from(new Set(products.map((p) => p.category)))];

function POS() {
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("All");
  const [cart, setCart] = useState<CartLine[]>([{ id: "p1", qty: 2 }]);
  const [discount, setDiscount] = useState(0);
  const [payOpen, setPayOpen] = useState(false);
  const [stkPhone, setStkPhone] = useState("");
  const [stkState, setStkState] = useState<"idle" | "waiting" | "done">("idle");

  const filtered = useMemo(
    () =>
      products.filter(
        (p) =>
          (cat === "All" || p.category === cat) &&
          (p.name.toLowerCase().includes(query.toLowerCase()) ||
            p.sku.toLowerCase().includes(query.toLowerCase())),
      ),
    [query, cat],
  );

  const lines = cart
    .map((l) => ({ ...l, product: products.find((p) => p.id === l.id)! }))
    .filter((l) => l.product);
  const subtotal = lines.reduce((s, l) => s + l.product.price * l.qty, 0);
  const total = Math.max(0, subtotal - discount);

  const add = (id: string) =>
    setCart((c) =>
      c.some((l) => l.id === id)
        ? c.map((l) => (l.id === id ? { ...l, qty: l.qty + 1 } : l))
        : [...c, { id, qty: 1 }],
    );
  const dec = (id: string) =>
    setCart((c) =>
      c.flatMap((l) => (l.id === id ? (l.qty > 1 ? [{ ...l, qty: l.qty - 1 }] : []) : [l])),
    );
  const remove = (id: string) => setCart((c) => c.filter((l) => l.id !== id));

  const startStk = () => {
    setStkState("waiting");
    setTimeout(() => {
      setStkState("done");
      toast.success("Payment received", { description: `${KES(total)} confirmed via M-Pesa.` });
    }, 2200);
  };

  return (
    <AppShell title="Point of sale" description="Tap products to add them to the cart">
      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <div className="surface-card p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                className="pl-9"
                placeholder="Search product or SKU…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              onClick={() =>
                toast.info("Camera scanner", {
                  description: "Barcode scanning will use the device camera once wired.",
                })
              }
            >
              <ScanBarcode className="mr-2 size-4" /> Scan
            </Button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  cat === c
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:bg-muted",
                )}
              >
                {c}
              </button>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {filtered.map((p) => (
              <button
                key={p.id}
                onClick={() => add(p.id)}
                className="group rounded-xl border border-border bg-card p-3 text-left transition-all hover:border-primary hover:shadow-soft"
              >
                <div className="flex items-start justify-between">
                  <span className="text-2xl">{p.emoji}</span>
                  {p.stock <= p.reorderLevel && (
                    <Badge variant="destructive" className="text-[10px]">
                      Low
                    </Badge>
                  )}
                </div>
                <p className="mt-2 line-clamp-2 text-sm font-medium">{p.name}</p>
                <p className="text-primary mt-1 text-sm font-semibold">{KES(p.price)}</p>
                <p className="text-muted-foreground text-[11px]">{p.stock} in stock</p>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="text-muted-foreground col-span-full py-10 text-center text-sm">
                No products match "{query}".
              </p>
            )}
          </div>
        </div>

        <div className="surface-card flex h-fit flex-col p-5 lg:sticky lg:top-20">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Current sale</h2>
            {lines.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setCart([])}>
                Clear
              </Button>
            )}
          </div>

          <div className="mt-3 space-y-2">
            {lines.length === 0 && (
              <p className="text-muted-foreground py-8 text-center text-sm">
                Cart is empty. Tap a product to start.
              </p>
            )}
            {lines.map((l) => (
              <div key={l.id} className="flex items-center gap-2 rounded-lg bg-muted/60 p-2.5">
                <span className="text-lg">{l.product.emoji}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{l.product.name}</p>
                  <p className="text-muted-foreground text-xs">{KES(l.product.price)} each</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="icon" className="size-7" onClick={() => dec(l.id)}>
                    <Minus className="size-3" />
                  </Button>
                  <span className="w-6 text-center text-sm font-semibold">{l.qty}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-7"
                    onClick={() => add(l.id)}
                  >
                    <Plus className="size-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground size-7"
                    onClick={() => remove(l.id)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <Separator className="my-4" />

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium">{KES(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Discount</span>
              <Input
                type="number"
                value={discount || ""}
                placeholder="0"
                onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                className="h-8 w-24 text-right"
              />
            </div>
            <div className="flex justify-between pt-1 text-base">
              <span className="font-semibold">Total</span>
              <span className="font-display font-bold">{KES(total)}</span>
            </div>
          </div>

          <div className="mt-5 grid gap-2">
            <Button
              size="lg"
              disabled={lines.length === 0}
              onClick={() => {
                setStkState("idle");
                setPayOpen(true);
              }}
            >
              <Smartphone className="mr-2 size-4" /> M-Pesa STK push
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                disabled={lines.length === 0}
                onClick={() => toast.success("Cash sale recorded", { description: KES(total) })}
              >
                <Wallet className="mr-2 size-4" /> Cash
              </Button>
              <Button
                variant="outline"
                disabled={lines.length === 0}
                onClick={() =>
                  toast.success("Added to credit ledger", {
                    description: "Select a customer to attach this debt.",
                  })
                }
              >
                On credit
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request {KES(total)} by M-Pesa</DialogTitle>
            <DialogDescription>
              The customer receives a PIN prompt on their handset. Payment reconciles automatically.
            </DialogDescription>
          </DialogHeader>

          {stkState === "idle" && (
            <div className="space-y-2">
              <Label htmlFor="stk">Customer phone number</Label>
              <Input
                id="stk"
                placeholder="0712 345 678"
                value={stkPhone}
                onChange={(e) => setStkPhone(e.target.value)}
              />
            </div>
          )}

          {stkState === "waiting" && (
            <div className="py-6 text-center">
              <span className="bg-primary-soft text-primary mx-auto grid size-14 animate-pulse place-items-center rounded-2xl">
                <Smartphone className="size-7" />
              </span>
              <p className="mt-4 text-sm font-medium">Waiting for PIN…</p>
              <p className="text-muted-foreground mt-1 text-xs">
                Prompt sent to {stkPhone || "the customer"}. This expires in 60 seconds.
              </p>
            </div>
          )}

          {stkState === "done" && (
            <div className="py-6 text-center">
              <span className="bg-success/15 text-success mx-auto grid size-14 place-items-center rounded-2xl">
                <Wallet className="size-7" />
              </span>
              <p className="mt-4 text-sm font-medium">{KES(total)} received</p>
              <p className="text-muted-foreground mt-1 text-xs">
                Stock updated and a digital receipt was sent.
              </p>
            </div>
          )}

          <DialogFooter>
            {stkState === "idle" && (
              <Button onClick={startStk} className="w-full">
                Send prompt
              </Button>
            )}
            {stkState === "waiting" && (
              <Button variant="outline" className="w-full" onClick={() => setStkState("idle")}>
                Cancel and retry
              </Button>
            )}
            {stkState === "done" && (
              <Button
                className="w-full"
                onClick={() => {
                  setPayOpen(false);
                  setCart([]);
                  setDiscount(0);
                }}
              >
                New sale
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
