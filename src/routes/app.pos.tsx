import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CircleSlash,
  Minus,
  Plus,
  ScanBarcode,
  Search,
  Smartphone,
  Trash2,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app/AppShell";
import {
  VendorMpesaPaymentDialog,
  type PaymentDestinationInfo,
} from "@/components/app/VendorMpesaPaymentDialog";
import { StatusEmpty } from "@/components/status/StatusPage";
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
import { KES, products as mockProducts } from "@/lib/mock-data";
import {
  fetchPrimaryPaymentDestination,
  fetchProducts,
  fetchShopCustomers,
} from "@/lib/data";
import { invokeFunction, isSupabaseConfigured } from "@/lib/supabase";
import { saveLastSale, type LastSale } from "@/lib/last-sale";
import { pollSaleStatus } from "@/lib/payments";
import { useIdentity } from "@/lib/identity";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/app/pos")({
  head: () => ({
    meta: [
      { title: "Point of sale — InuaBiz" },
      {
        name: "description",
        content:
          "Fast mobile checkout: search or scan products, apply discounts and confirm M-Pesa to your till.",
      },
      { property: "og:title", content: "InuaBiz point of sale" },
      {
        property: "og:description",
        content: "Checkout, discounts and M-Pesa confirmation in seconds.",
      },
    ],
  }),
  component: POS,
});

type CartLine = { id: string; qty: number };

function POS() {
  const navigate = useNavigate();
  const identity = useIdentity("vendor");
  const { data: liveProducts } = useQuery({
    queryKey: ["products"],
    queryFn: fetchProducts,
  });
  const { data: shopCustomers = [] } = useQuery({
    queryKey: ["shop-customers"],
    queryFn: fetchShopCustomers,
    enabled: isSupabaseConfigured(),
  });
  const { data: paymentDestination } = useQuery({
    queryKey: ["payment-destination"],
    queryFn: fetchPrimaryPaymentDestination,
    enabled: isSupabaseConfigured(),
  });
  const products = liveProducts ?? (isSupabaseConfigured() ? [] : mockProducts);
  const categories = ["All", ...Array.from(new Set(products.map((p) => p.category)))];
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("All");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [discount, setDiscount] = useState(0);
  const [payOpen, setPayOpen] = useState(false);
  const [creditOpen, setCreditOpen] = useState(false);
  const [creditCustomerId, setCreditCustomerId] = useState("");
  const [mpesaState, setMpesaState] = useState<"idle" | "waiting" | "done" | "failed">("idle");
  const [saleRef, setSaleRef] = useState("SL-10239");
  const [activeSaleId, setActiveSaleId] = useState<string | null>(null);
  const [billRef, setBillRef] = useState("");
  const [checkoutDestination, setCheckoutDestination] = useState<PaymentDestinationInfo | null>(
    null,
  );
  const [receiptCode, setReceiptCode] = useState("");
  const [busy, setBusy] = useState(false);
  const mockTimer = useRef<number | null>(null);

  const filtered = useMemo(
    () =>
      products.filter(
        (p) =>
          (cat === "All" || p.category === cat) &&
          (p.name.toLowerCase().includes(query.toLowerCase()) ||
            p.sku.toLowerCase().includes(query.toLowerCase())),
      ),
    [query, cat, products],
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

  const buildSale = (
    channel: string,
    customer: string,
    saleId?: string,
  ): LastSale => {
    const now = new Date();
    const when = `Today · ${now.toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" })} EAT`;
    const sale: LastSale = {
      id: saleId ?? `s-${Date.now()}`,
      ref: saleId ? `SL-${saleId.slice(0, 8)}` : `SL-${String(Date.now()).slice(-5)}`,
      total,
      items: lines.length,
      channel,
      customer,
      phone: customer,
      shop: identity.shop,
      location: "Kasarani, Nairobi",
      when,
      footer: "Asante sana! Karibu tena.",
      lines: lines.map((l) => ({ name: l.product.name, qty: l.qty, price: l.product.price })),
    };
    setSaleRef(sale.ref);
    return sale;
  };

  const finishSale = (channel: string, customer: string, saleId?: string) => {
    saveLastSale(buildSale(channel, customer, saleId));
    void navigate({ to: "/app/pos/success" });
  };

  const startMpesaCheckout = async () => {
    if (!lines.length) return;
    setBusy(true);
    setMpesaState("waiting");
    setReceiptCode("");

    if (!isSupabaseConfigured()) {
      setCheckoutDestination(
        paymentDestination ?? {
          destinationType: "PERSONAL_MPESA",
          accountNumber: "0712 345 678",
          accountName: "Demo shop",
        },
      );
      setBillRef("DEMO1234");
      setBusy(false);
      setPayOpen(true);
      return;
    }

    const { data, error } = await invokeFunction<{
      ok?: boolean;
      sale?: { id: string; status: string; payment_bill_ref?: string };
      payment_destination?: PaymentDestinationInfo & {
        destination_type?: string;
        account_number?: string;
        account_name?: string | null;
      };
      bill_ref?: string;
      message?: string;
    }>("checkout-sale", {
      items: lines.map((l) => ({ product_id: l.id, qty: l.qty })),
      discount_amount: discount,
      channel: "MPESA",
    });

    setBusy(false);
    if (error || !data?.ok || !data.sale) {
      setMpesaState("failed");
      toast.error("Could not open sale", { description: error ?? "Try again." });
      return;
    }

    setActiveSaleId(data.sale.id);
    setBillRef(data.bill_ref ?? data.sale.payment_bill_ref ?? "");
    const raw = data.payment_destination;
    setCheckoutDestination(
      raw
        ? {
            destinationType: (raw.destinationType ??
              raw.destination_type ??
              "PERSONAL_MPESA") as PaymentDestinationInfo["destinationType"],
            accountNumber: raw.accountNumber ?? raw.account_number ?? "",
            accountName: raw.accountName ?? raw.account_name ?? null,
          }
        : paymentDestination ?? null,
    );
    setPayOpen(true);

    const dest = raw?.destination_type ?? raw?.destinationType;
    if (dest && dest !== "PERSONAL_MPESA") {
      const result = await pollSaleStatus(data.sale.id);
      if (result === "PAID") {
        setMpesaState("done");
        toast.success("Payment received", { description: `${KES(total)} confirmed via M-Pesa.` });
      } else if (result === "FAILED") {
        setMpesaState("failed");
      } else {
        toast.info("Waiting for customer payment", {
          description: data.message ?? "Daraja will mark this sale paid when funds arrive.",
        });
      }
    }
  };

  const checkout = async (channel: "CASH" | "CREDIT", customerId?: string) => {
    if (!lines.length) return;
    setBusy(true);

    if (!isSupabaseConfigured()) {
      setBusy(false);
      if (channel === "CASH") {
        toast.success("Cash sale recorded");
        finishSale("Cash", "Walk-in");
      } else {
        setCreditOpen(false);
        const customer = shopCustomers.find((c) => c.id === customerId);
        toast.success("Added to credit ledger", {
          description: customer ? `Attached to ${customer.name}.` : "Credit sale recorded.",
        });
        finishSale("Credit", customer?.name ?? "Customer");
      }
      return;
    }

    const { data, error } = await invokeFunction<{
      ok?: boolean;
      sale?: { id: string };
    }>("checkout-sale", {
      items: lines.map((l) => ({ product_id: l.id, qty: l.qty })),
      discount_amount: discount,
      channel,
      customer_id: customerId,
    });
    setBusy(false);
    if (error || !data?.ok || !data.sale) {
      toast.error("Checkout failed", { description: error ?? "Could not record the sale." });
      return;
    }

    if (channel === "CASH") {
      toast.success("Cash sale recorded");
      finishSale("Cash", "Walk-in", data.sale.id);
      return;
    }

    setCreditOpen(false);
    const customer = shopCustomers.find((c) => c.id === customerId);
    toast.success("Added to credit ledger", {
      description: customer ? `Attached to ${customer.name}.` : "Credit sale recorded.",
    });
    finishSale("Credit", customer?.name ?? "Customer", data.sale.id);
  };

  const confirmManualMpesa = async () => {
    if (!activeSaleId || !receiptCode.trim()) return;
    setBusy(true);

    if (!isSupabaseConfigured()) {
      setBusy(false);
      setMpesaState("done");
      saveLastSale(buildSale("M-Pesa", receiptCode, activeSaleId));
      toast.success("Payment confirmed");
      return;
    }

    const { data, error } = await invokeFunction<{ ok?: boolean; message?: string }>(
      "confirm-sale-mpesa",
      { sale_id: activeSaleId, mpesa_receipt_code: receiptCode.trim() },
    );
    setBusy(false);
    if (error || !data?.ok) {
      toast.error("Could not confirm", { description: error ?? "Check the M-Pesa code." });
      return;
    }
    setMpesaState("done");
    toast.success("Payment confirmed", { description: `${KES(total)} recorded.` });
    saveLastSale(buildSale("M-Pesa", receiptCode, activeSaleId));
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
              <div className="col-span-full">
                <StatusEmpty
                  icon={CircleSlash}
                  title="No results match"
                  description={`Nothing in stock matches “${query}”. Clear the search to see the full shelf.`}
                  primary={{ label: "Clear filters", onClick: () => setQuery("") }}
                  meta="0 results"
                />
              </div>
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
                  <Button variant="outline" size="icon" className="size-7" onClick={() => add(l.id)}>
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
              disabled={lines.length === 0 || busy}
              onClick={() => void startMpesaCheckout()}
            >
              <Smartphone className="mr-2 size-4" /> M-Pesa
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                disabled={lines.length === 0 || busy}
                onClick={() => void checkout("CASH")}
              >
                <Wallet className="mr-2 size-4" /> Cash
              </Button>
              <Button
                variant="outline"
                disabled={lines.length === 0 || busy}
                onClick={() => {
                  if (!shopCustomers.length) {
                    toast.error("Add a customer first", {
                      description: "Credit sales attach to a customer on the Customers page.",
                    });
                    return;
                  }
                  setCreditCustomerId(shopCustomers[0]?.id ?? "");
                  setCreditOpen(true);
                }}
              >
                On credit
              </Button>
            </div>
          </div>
        </div>
      </div>

      <VendorMpesaPaymentDialog
        open={payOpen}
        onOpenChange={setPayOpen}
        state={mpesaState === "idle" ? "waiting" : mpesaState}
        total={total}
        saleRef={saleRef}
        billRef={billRef}
        destination={checkoutDestination}
        receiptCode={receiptCode}
        onReceiptChange={setReceiptCode}
        busy={busy}
        onConfirmManual={() => void confirmManualMpesa()}
        onCancel={() => {
          if (mockTimer.current) window.clearTimeout(mockTimer.current);
          setMpesaState("failed");
          setPayOpen(false);
        }}
        onPrint={() => {
          setPayOpen(false);
          setCart([]);
          setDiscount(0);
          void navigate({ to: "/app/pos/success" });
        }}
        onSms={() => toast.success("SMS receipt queued")}
        onNewSale={() => {
          setPayOpen(false);
          setCart([]);
          setDiscount(0);
          setMpesaState("idle");
          setActiveSaleId(null);
        }}
      />

      <Dialog open={creditOpen} onOpenChange={setCreditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Put {KES(total)} on credit</DialogTitle>
            <DialogDescription>
              This sale is added to the customer's ledger. Collect later from Customers.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="credit-customer">Customer</Label>
            <Select value={creditCustomerId} onValueChange={setCreditCustomerId}>
              <SelectTrigger id="credit-customer">
                <SelectValue placeholder="Select a customer" />
              </SelectTrigger>
              <SelectContent>
                {shopCustomers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} · {c.phone || "no phone"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              className="w-full"
              disabled={busy || !creditCustomerId}
              onClick={() => void checkout("CREDIT", creditCustomerId)}
            >
              Record credit sale
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
