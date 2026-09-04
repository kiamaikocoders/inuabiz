import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CircleSlash,
  Minus,
  Pause,
  Plus,
  ScanBarcode,
  Search,
  Smartphone,
  Trash2,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app/AppShell";
import { BarcodeScannerDialog } from "@/components/app/BarcodeScannerDialog";
import { ProductThumb } from "@/components/app/ProductThumb";
import { OpenSalesButton, OpenSalesSheet } from "@/components/app/OpenSalesSheet";
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
import { KES } from "@/lib/mock-data";
import {
  cancelOpenSale,
  fetchOpenSales,
  fetchPrimaryPaymentDestination,
  fetchProducts,
  fetchShopCustomers,
  type OpenSale,
} from "@/lib/data";
import { CustomerFormDialog } from "@/components/app/CustomerFormDialog";
import { getSupabase, invokeFunction, isSupabaseConfigured } from "@/lib/supabase";
import { saveLastSale, readLastSale, type LastSale } from "@/lib/last-sale";
import {
  fetchBillingSnapshot,
  fetchSaleMpesaMeta,
  waitForSalePaid,
} from "@/lib/payments";
import { fetchSaleReceipt, fetchTenantHeader } from "@/lib/ops";
import { calculateTax } from "@/lib/tax";
import { useIdentity } from "@/lib/identity";
import { shareReceiptText } from "@/components/app/ReceiptCard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { isBrowserOffline, probeOnline } from "@/lib/offline/connectivity";
import { queueConfirmMpesa, recordOfflineCheckout } from "@/lib/offline/checkout";
import { ForeignCashDialog } from "@/components/app/UsdCashDialog";
import { fetchEnabledCurrencies } from "@/lib/fx";

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
  const queryClient = useQueryClient();
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
  const { data: billing } = useQuery({
    queryKey: ["billing"],
    queryFn: fetchBillingSnapshot,
    enabled: isSupabaseConfigured(),
  });
  const { data: tenantHeader } = useQuery({
    queryKey: ["tenant-header"],
    queryFn: fetchTenantHeader,
    enabled: isSupabaseConfigured(),
  });
  const etrFormat = billing?.planCode === "COMPLIANCE";
  const { data: openSales = [] } = useQuery({
    queryKey: ["open-sales"],
    queryFn: fetchOpenSales,
    enabled: isSupabaseConfigured(),
    refetchInterval: 15_000,
  });
  const products = liveProducts ?? [];
  const categories = ["All", ...Array.from(new Set(products.map((p) => p.category)))];
  const [query, setQuery] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [cat, setCat] = useState("All");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [discount, setDiscount] = useState(0);
  const [payOpen, setPayOpen] = useState(false);
  const [creditOpen, setCreditOpen] = useState(false);
  const [creditCustomerId, setCreditCustomerId] = useState("");
  const [addCustomerOpen, setAddCustomerOpen] = useState(false);
  const [mpesaState, setMpesaState] = useState<"idle" | "waiting" | "done" | "failed">("idle");
  const [saleRef, setSaleRef] = useState("SL-10239");
  const [activeSaleId, setActiveSaleId] = useState<string | null>(null);
  const [billRef, setBillRef] = useState("");
  const [checkoutDestination, setCheckoutDestination] = useState<PaymentDestinationInfo | null>(
    null,
  );
  const [receiptCode, setReceiptCode] = useState("");
  const [paidPayerName, setPaidPayerName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [parkedSaleId, setParkedSaleId] = useState<string | null>(null);
  const [lockedTotal, setLockedTotal] = useState<number | null>(null);
  const [openSalesOpen, setOpenSalesOpen] = useState(false);
  const [parkOpen, setParkOpen] = useState(false);
  const [parkLabel, setParkLabel] = useState("");
  const [usdOpen, setUsdOpen] = useState(false);
  const [fxCurrency, setFxCurrency] = useState("USD");
  const { data: enabledCurrencies = ["USD"] } = useQuery({
    queryKey: ["enabled-currencies"],
    queryFn: fetchEnabledCurrencies,
    enabled: isSupabaseConfigured(),
  });
  const mockTimer = useRef<number | null>(null);
  const payWait = useRef<AbortController | null>(null);
  const activeSaleIdRef = useRef<string | null>(null);

  useEffect(() => () => payWait.current?.abort(), []);
  useEffect(() => {
    activeSaleIdRef.current = activeSaleId;
  }, [activeSaleId]);

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return;
    const channel = sb
      .channel("pos-open-sales")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "sales" }, (payload) => {
        const next = payload.new as { id?: string; status?: string; total?: number };
        if (next.status !== "PAID" || !next.id) return;
        void queryClient.invalidateQueries({ queryKey: ["open-sales"] });
        if (next.id === activeSaleIdRef.current) return;
        toast.success("A parked sale was paid", {
          description: `${KES(Number(next.total ?? 0))} confirmed via M-Pesa.`,
        });
      })
      .subscribe();
    return () => {
      void sb.removeChannel(channel);
    };
  }, [queryClient]);

  const filtered = useMemo(
    () =>
      products.filter(
        (p) =>
          (cat === "All" || p.category === cat) &&
          (p.name.toLowerCase().includes(query.toLowerCase()) ||
            p.sku.toLowerCase().includes(query.toLowerCase()) ||
            (p.barcode ?? "").toLowerCase().includes(query.toLowerCase())),
      ),
    [query, cat, products],
  );

  const lines = cart
    .map((l) => ({ ...l, product: products.find((p) => p.id === l.id)! }))
    .filter((l) => l.product);
  const subtotal = lines.reduce((s, l) => s + l.product.price * l.qty, 0);
  const total = Math.max(0, subtotal - discount);
  const payTotal = lockedTotal ?? total;
  const defaultParkLabel = (() => {
    const first = lines[0]?.product.name;
    if (!first) return "Walk-in";
    return lines.length > 1 ? `${first} +${lines.length - 1}` : first;
  })();

  const resetCart = () => {
    setCart([]);
    setDiscount(0);
    setParkedSaleId(null);
    setLockedTotal(null);
    setActiveSaleId(null);
    setBillRef("");
    setReceiptCode("");
    setPaidPayerName(null);
    setMpesaState("idle");
  };

  const refreshOpenSales = () => {
    void queryClient.invalidateQueries({ queryKey: ["open-sales"] });
  };

  const persistPark = async (label?: string) => {
    if (!lines.length) return true;
    if (!isSupabaseConfigured()) {
      toast.error("Sign in to park a sale");
      return false;
    }
    if (isBrowserOffline() && !(await probeOnline())) {
      const offline = await recordOfflineCheckout({
        channel: "HOLD",
        items: lines.map((l) => ({
          product_id: l.id,
          qty: l.qty,
          name: l.product.name,
          unit_price: l.product.price,
        })),
        discount_amount: discount,
        sale_id: parkedSaleId,
        label: (label ?? parkLabel).trim() || defaultParkLabel,
      });
      setParkedSaleId(offline.sale.id);
      refreshOpenSales();
      toast.success("Parked offline", { description: "Will sync when you're back online." });
      return true;
    }
    const { data, error } = await invokeFunction<{ ok?: boolean; sale?: { id: string } }>(
      "checkout-sale",
      {
        items: lines.map((l) => ({ product_id: l.id, qty: l.qty })),
        discount_amount: discount,
        channel: "HOLD",
        sale_id: parkedSaleId,
        label: (label ?? parkLabel).trim() || defaultParkLabel,
      },
    );
    if (error || !data?.ok) {
      toast.error("Could not park sale", { description: error ?? "Try again." });
      return false;
    }
    refreshOpenSales();
    return true;
  };

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
    mpesaReceipt?: string | null,
    mpesaPayerName?: string | null,
  ): LastSale => {
    const now = new Date();
    const when = now.toLocaleString("en-KE", { timeZone: "Africa/Nairobi" });
    const destLike = /^(PERSONAL_MPESA|TILL|PAYBILL|POCHI)$/i.test(customer);
    const payer = mpesaPayerName?.trim() || "";
    const receiptLines = lines.map((l) => {
      const line: NonNullable<LastSale["lines"]>[number] = {
        name: l.product.name,
        qty: l.qty,
        price: l.product.price,
        taxClass: l.product.taxClass ?? "STANDARD_16",
        imageUrl: l.product.imageUrl ?? null,
      };
      if (l.product.classificationCode) {
        line.classificationCode = l.product.classificationCode;
      }
      return line;
    });
    const tax = etrFormat
      ? calculateTax(
          receiptLines.map((l) => ({
            name: l.name,
            qty: l.qty,
            unitPrice: l.price,
            lineTotal: l.price * l.qty,
            taxClass: l.taxClass ?? "STANDARD_16",
          })),
        )
      : null;
    const sale: LastSale = {
      id: saleId ?? `s-${Date.now()}`,
      ref: saleId ? `SL-${saleId.slice(0, 8)}` : `SL-${String(Date.now()).slice(-5)}`,
      total,
      items: lines.length,
      channel,
      customer: payer || (destLike ? "Walk-in" : customer),
      shop: tenantHeader?.legal_name || tenantHeader?.name || identity.shop,
      location: tenantHeader?.address_text || "",
      when,
      isoWhen: now.toISOString(),
      footer: etrFormat
        ? "ETR tax invoice — prepared for eTIMS export. Not yet transmitted to KRA."
        : "Asante sana! Karibu tena.",
      lines: receiptLines,
      etrFormat,
      branchId: "00",
    };
    if (tenantHeader?.kra_pin && etrFormat) sale.kraPin = tenantHeader.kra_pin;
    if (tenantHeader?.phone) sale.merchantPhone = tenantHeader.phone;
    if (tenantHeader?.email) sale.email = tenantHeader.email;
    if (tenantHeader?.logo_url) sale.logoUrl = tenantHeader.logo_url;
    if (tax) {
      sale.vat16 = tax.vat16Amount;
      sale.vat0 = tax.vat0Amount;
      sale.exempt = tax.exemptAmount;
      sale.subtotalExVat = tax.subtotalExVat;
    }
    if (!destLike && customer) sale.phone = customer;
    if (mpesaReceipt) sale.mpesaReceipt = mpesaReceipt;
    if (payer) sale.mpesaPayerName = payer;
    setSaleRef(sale.ref);
    return sale;
  };

  const finishSale = async (
    channel: string,
    customer: string,
    saleId?: string,
    fx?: { currency?: string; fxRate: number; foreignAmount: number },
  ) => {
    let sale = buildSale(channel, customer, saleId);
    if (fx) {
      sale.tenderCurrency = fx.currency?.toUpperCase() || "USD";
      sale.fxRate = fx.fxRate;
      sale.foreignAmount = fx.foreignAmount;
    }
    if (saleId && isSupabaseConfigured()) {
      try {
        const live = await fetchSaleReceipt(saleId);
        if (live) sale = live;
      } catch {
        // keep local receipt
      }
    }
    saveLastSale(sale);
    void navigate({ to: "/app/pos/success" });
  };

  const startMpesaCheckout = async () => {
    if (!lines.length) return;
    setBusy(true);
    setMpesaState("waiting");
    setReceiptCode("");
    setPaidPayerName(null);

    if (!isSupabaseConfigured()) {
      setBusy(false);
      toast.error("Sign in to record a sale", {
        description: "Supabase is not configured on this build.",
      });
      return;
    }

    if (isBrowserOffline() && !(await probeOnline())) {
      const offline = await recordOfflineCheckout({
        channel: "MPESA",
        items: lines.map((l) => ({
          product_id: l.id,
          qty: l.qty,
          name: l.product.name,
          unit_price: l.product.price,
        })),
        discount_amount: discount,
        sale_id: parkedSaleId,
      });
      setBusy(false);
      setActiveSaleId(offline.sale.id);
      setParkedSaleId(offline.sale.id);
      setLockedTotal(Number(offline.sale.total));
      setBillRef(offline.bill_ref ?? "");
      const cachedDest = await readCachedPaymentDestination();
      setCheckoutDestination(cachedDest ?? paymentDestination ?? null);
      setPayOpen(true);
      setMpesaState("waiting");
      refreshOpenSales();
      toast.info("M-Pesa sale opened offline", {
        description:
          "Customer can still pay your till. Enter the code now — we'll confirm it when you're back online.",
      });
      return;
    }

    const { data, error } = await invokeFunction<{
      ok?: boolean;
      sale?: { id: string; status: string; total?: number; payment_bill_ref?: string };
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
      sale_id: parkedSaleId,
    });

    setBusy(false);
    if (error || !data?.ok || !data.sale) {
      setMpesaState("failed");
      toast.error("Could not open sale", { description: error ?? "Try again." });
      return;
    }

    setActiveSaleId(data.sale.id);
    setParkedSaleId(data.sale.id);
    setLockedTotal(Number(data.sale.total ?? total));
    setBillRef(data.bill_ref ?? data.sale.payment_bill_ref ?? "");
    refreshOpenSales();
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
        : (paymentDestination ?? null),
    );
    setPayOpen(true);

    payWait.current?.abort();
    const ac = new AbortController();
    payWait.current = ac;
    const destType = String(raw?.destination_type ?? raw?.destinationType ?? "PERSONAL_MPESA");
    const result = await waitForSalePaid(data.sale.id, {
      timeoutMs: 180_000,
      signal: ac.signal,
    });
    if (ac.signal.aborted) return;
    if (result === "PAID") {
      setMpesaState("done");
      toast.success("Payment received", { description: `${KES(payTotal)} confirmed via M-Pesa.` });
      refreshOpenSales();
      const meta = await fetchSaleMpesaMeta(data.sale.id);
      if (meta.payerName) setPaidPayerName(meta.payerName);
      if (meta.code) setReceiptCode(meta.code);
      saveLastSale(buildSale("M-Pesa", destType, data.sale.id, meta.code, meta.payerName));
    } else if (result === "FAILED") {
      setMpesaState("failed");
    } else if (result === "TIMEOUT") {
      toast.info("Still waiting for M-Pesa", {
        description: data.message ?? "Keep the companion phone on, or enter the confirmation code.",
      });
    }
  };

  const checkout = async (
    channel: "CASH" | "CREDIT" | "FOREIGN_CASH",
    customerId?: string,
    fx?: { currency: string; fxRate: number; foreignAmount: number },
  ) => {
    if (!lines.length) return;
    setBusy(true);

    if (!isSupabaseConfigured()) {
      setBusy(false);
      toast.error("Sign in to record a sale", {
        description: "Supabase is not configured on this build.",
      });
      return;
    }

    if (isBrowserOffline() && !(await probeOnline())) {
      if (channel === "FOREIGN_CASH") {
        setBusy(false);
        toast.error("Foreign cash needs a connection", {
          description: "Go online to record a foreign-currency sale.",
        });
        return;
      }
      const customer = shopCustomers.find((c) => c.id === customerId);
      const offline = await recordOfflineCheckout({
        channel,
        items: lines.map((l) => ({
          product_id: l.id,
          qty: l.qty,
          name: l.product.name,
          unit_price: l.product.price,
        })),
        discount_amount: discount,
        ...(customerId ? { customer_id: customerId } : {}),
        ...(customer?.name ? { customer_name: customer.name } : {}),
        sale_id: parkedSaleId,
      });
      setBusy(false);
      void queryClient.invalidateQueries({ queryKey: ["products"] });
      void queryClient.invalidateQueries({ queryKey: ["sales"] });
      if (channel === "CASH") {
        toast.success("Cash sale saved offline", {
          description: "Will sync when you're back online.",
        });
        await finishSale("Cash", "Walk-in", offline.sale.id);
        return;
      }
      setCreditOpen(false);
      toast.success("Credit saved offline", {
        description: customer ? `Attached to ${customer.name}.` : "Credit sale queued.",
      });
      await finishSale("Credit", customer?.name ?? "Customer", offline.sale.id);
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
      sale_id: parkedSaleId,
      ...(channel === "FOREIGN_CASH" && fx
        ? {
            tender_currency: fx.currency,
            fx_rate: fx.fxRate,
            foreign_amount: fx.foreignAmount,
          }
        : {}),
    });
    setBusy(false);
    if (error || !data?.ok || !data.sale) {
      toast.error("Checkout failed", { description: error ?? "Could not record the sale." });
      return;
    }

    if (channel === "CASH") {
      toast.success("Cash sale recorded");
      await finishSale("Cash", "Walk-in", data.sale.id);
      return;
    }

    if (channel === "FOREIGN_CASH") {
      setUsdOpen(false);
      const code = fx?.currency ?? "USD";
      toast.success(`${code} cash recorded`, {
        description: fx
          ? `${fx.foreignAmount.toFixed(2)} ${code} @ ${fx.fxRate.toFixed(2)} KES`
          : undefined,
      });
      await finishSale(`${code} cash`, "Walk-in", data.sale.id, fx);
      return;
    }

    setCreditOpen(false);
    const customer = shopCustomers.find((c) => c.id === customerId);
    toast.success("Added to credit ledger", {
      description: customer ? `Attached to ${customer.name}.` : "Credit sale recorded.",
    });
    await finishSale("Credit", customer?.name ?? "Customer", data.sale.id);
  };

  const confirmManualMpesa = async () => {
    if (!activeSaleId || !receiptCode.trim()) return;
    setBusy(true);

    if (!isSupabaseConfigured()) {
      setBusy(false);
      toast.error("Sign in to confirm M-Pesa", {
        description: "Supabase is not configured on this build.",
      });
      return;
    }

    if (isBrowserOffline() && !(await probeOnline())) {
      await queueConfirmMpesa({
        sale_id: activeSaleId,
        mpesa_receipt_code: receiptCode.trim(),
      });
      setBusy(false);
      setMpesaState("waiting");
      toast.success("M-Pesa code saved offline", {
        description: "We'll confirm it on the server when you're back online. Sale stays pending.",
      });
      saveLastSale(
        buildSale("M-Pesa", "PENDING", activeSaleId, receiptCode.trim().toUpperCase(), null),
      );
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
    toast.success("Payment confirmed", { description: `${KES(payTotal)} recorded.` });
    refreshOpenSales();
    saveLastSale(buildSale("M-Pesa", "Walk-in", activeSaleId, receiptCode.trim()));
  };

  const parkAndServeNext = async (label?: string) => {
    if (!lines.length && !activeSaleId) {
      setOpenSalesOpen(true);
      return;
    }
    setBusy(true);
    const ok = lines.length ? await persistPark(label) : true;
    setBusy(false);
    if (!ok) return;
    payWait.current?.abort();
    setPayOpen(false);
    resetCart();
    toast.success("Sale parked", {
      description: "Serve the next customer, then resume from Open sales.",
    });
    setParkOpen(false);
    setParkLabel("");
  };

  const stayOnSale = () => {
    payWait.current?.abort();
    setPayOpen(false);
  };

  const nextCustomerFromPay = () => {
    payWait.current?.abort();
    setPayOpen(false);
    resetCart();
    refreshOpenSales();
    toast.success("Waiting sale parked", {
      description: "Recall it from Open sales when that customer is ready.",
    });
  };

  const loadSaleIntoCart = (sale: OpenSale) => {
    setCart(
      sale.lines
        .filter((line) => line.productId)
        .map((line) => ({ id: line.productId, qty: line.qty })),
    );
    setDiscount(sale.discount);
    setParkedSaleId(sale.id);
    setSaleRef(sale.ref);
    setBillRef(sale.billRef ?? "");
    setLockedTotal(sale.status === "PENDING_PAYMENT" ? sale.total : null);
  };

  const resumeSale = async (sale: OpenSale) => {
    setOpenSalesOpen(false);
    if (lines.length && parkedSaleId !== sale.id) {
      const ok = await persistPark();
      if (!ok) return;
    }
    payWait.current?.abort();
    loadSaleIntoCart(sale);
    if (sale.status !== "PENDING_PAYMENT") {
      toast.success("Sale resumed", { description: sale.label });
      return;
    }
    setActiveSaleId(sale.id);
    setMpesaState("waiting");
    setReceiptCode("");
    setPaidPayerName(null);
    setCheckoutDestination(paymentDestination ?? null);
    setPayOpen(true);
    if (!isSupabaseConfigured()) return;
    const { data, error } = await invokeFunction<{
      ok?: boolean;
      already_paid?: boolean;
      sale?: { id: string; total?: number };
      payment_destination?: PaymentDestinationInfo & {
        destination_type?: string;
        account_number?: string;
        account_name?: string | null;
      };
      bill_ref?: string;
      message?: string;
    }>("checkout-sale", { channel: "MPESA", sale_id: sale.id });
    if (error || !data?.ok) {
      toast.error("Could not reopen sale", { description: error ?? "Try again." });
      return;
    }
    if (data.already_paid) {
      setMpesaState("done");
      refreshOpenSales();
      return;
    }
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
        : (paymentDestination ?? null),
    );
    setBillRef(data.bill_ref ?? sale.billRef ?? "");
    const ac = new AbortController();
    payWait.current = ac;
    const result = await waitForSalePaid(sale.id, { timeoutMs: 180_000, signal: ac.signal });
    if (ac.signal.aborted) return;
    if (result === "PAID") {
      setMpesaState("done");
      const meta = await fetchSaleMpesaMeta(sale.id);
      if (meta.payerName) setPaidPayerName(meta.payerName);
      if (meta.code) setReceiptCode(meta.code);
      const now = new Date();
      saveLastSale({
        id: sale.id,
        ref: sale.ref,
        total: sale.total,
        items: sale.itemCount,
        channel: "M-Pesa",
        customer: meta.payerName?.trim() || "Walk-in",
        shop: identity.shop,
        location: "Kasarani, Nairobi",
        when: `Today · ${now.toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" })} EAT`,
        footer: "Asante sana! Karibu tena.",
        lines: sale.lines.map((line) => ({
          name: line.name,
          qty: line.qty,
          price: line.price,
        })),
        ...(meta.code ? { mpesaReceipt: meta.code } : {}),
        ...(meta.payerName?.trim() ? { mpesaPayerName: meta.payerName.trim() } : {}),
      });
      toast.success("Payment received", {
        description: `${KES(sale.total)} confirmed via M-Pesa.`,
      });
      refreshOpenSales();
    } else if (result === "FAILED") {
      setMpesaState("failed");
    } else if (result === "TIMEOUT") {
      toast.info("Still waiting for M-Pesa", {
        description: data.message ?? "Keep the companion phone on, or enter the confirmation code.",
      });
    }
  };

  const discardSale = async (sale: OpenSale) => {
    try {
      await cancelOpenSale(sale.id);
      if (parkedSaleId === sale.id || activeSaleId === sale.id) resetCart();
      refreshOpenSales();
      toast.success("Sale discarded");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Could not discard");
    }
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
            <Button variant="outline" onClick={() => setScannerOpen(true)}>
              <ScanBarcode className="mr-2 size-4" /> Scan
            </Button>
            <OpenSalesButton count={openSales.length} onClick={() => setOpenSalesOpen(true)} />
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
                <div className="relative">
                  <ProductThumb
                    src={p.imageUrl}
                    alt=""
                    emoji={p.emoji}
                    className="aspect-square w-full rounded-lg"
                  />
                  {p.stock <= p.reorderLevel && (
                    <Badge variant="destructive" className="absolute top-2 right-2 text-[10px]">
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
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-semibold">Current sale</h2>
            <div className="flex items-center gap-1">
              {lines.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  onClick={() => {
                    setParkLabel(defaultParkLabel);
                    setParkOpen(true);
                  }}
                >
                  <Pause className="mr-1 size-3.5" /> Park
                </Button>
              )}
              {lines.length > 0 && (
                <Button variant="ghost" size="sm" onClick={() => resetCart()}>
                  Clear
                </Button>
              )}
            </div>
          </div>
          {parkedSaleId ? (
            <p className="text-muted-foreground mt-1 text-xs">
              Resumed {saleRef}. Park or take payment — it stays in Open sales until you finish.
            </p>
          ) : null}

          <div className="mt-3 space-y-2">
            {lines.length === 0 && (
              <p className="text-muted-foreground py-8 text-center text-sm">
                Cart is empty. Tap a product to start.
              </p>
            )}
            {lines.map((l) => (
              <div key={l.id} className="flex items-center gap-2 rounded-lg bg-muted/60 p-2.5">
                <ProductThumb
                  src={l.product.imageUrl}
                  alt=""
                  emoji={l.product.emoji}
                  className="size-9 shrink-0 rounded-md"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{l.product.name}</p>
                  <p className="text-muted-foreground text-xs">{KES(l.product.price)} each</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-7"
                    onClick={() => dec(l.id)}
                  >
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
              <span className="font-display font-bold">{KES(payTotal)}</span>
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
                  setFxCurrency("USD");
                  setUsdOpen(true);
                }}
              >
                USD cash
              </Button>
            </div>
            {enabledCurrencies.filter((c) => c !== "USD").length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {enabledCurrencies
                  .filter((c) => c !== "USD")
                  .map((code) => (
                    <Button
                      key={code}
                      variant="outline"
                      disabled={lines.length === 0 || busy}
                      onClick={() => {
                        setFxCurrency(code);
                        setUsdOpen(true);
                      }}
                    >
                      {code} cash
                    </Button>
                  ))}
              </div>
            )}
            <Button
              variant="outline"
              disabled={lines.length === 0 || busy}
              onClick={() => {
                setCreditCustomerId(shopCustomers[0]?.id ?? "");
                setCreditOpen(true);
              }}
            >
              On credit
            </Button>
          </div>
        </div>
      </div>

      <VendorMpesaPaymentDialog
        open={payOpen}
        onOpenChange={(open) => {
          if (!open && mpesaState === "waiting") stayOnSale();
          else setPayOpen(open);
        }}
        state={mpesaState === "idle" ? "waiting" : mpesaState}
        total={payTotal}
        saleRef={saleRef}
        billRef={billRef}
        destination={checkoutDestination}
        receiptCode={receiptCode}
        mpesaReceipt={receiptCode}
        payerName={paidPayerName}
        onReceiptChange={setReceiptCode}
        busy={busy}
        onConfirmManual={() => void confirmManualMpesa()}
        onCancel={stayOnSale}
        onNextCustomer={nextCustomerFromPay}
        onPrint={() => {
          setPayOpen(false);
          resetCart();
          void navigate({ to: "/app/pos/success" });
        }}
        onShare={() => {
          void shareReceiptText(readLastSale())
            .then(() => {
              if (!navigator.share) toast.success("Receipt copied");
            })
            .catch(() => toast.error("Could not share the receipt"));
        }}
        onNewSale={() => {
          setPayOpen(false);
          resetCart();
        }}
      />

      <OpenSalesSheet
        open={openSalesOpen}
        onOpenChange={setOpenSalesOpen}
        sales={openSales}
        onResume={(sale) => void resumeSale(sale)}
        onDiscard={(sale) => void discardSale(sale)}
      />

      <Dialog open={parkOpen} onOpenChange={setParkOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Park this sale</DialogTitle>
            <DialogDescription>
              Name it so you can call it back — table, drink, or the customer&apos;s name.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="park-label">Label</Label>
            <Input
              id="park-label"
              value={parkLabel}
              onChange={(e) => setParkLabel(e.target.value)}
              placeholder={defaultParkLabel}
            />
          </div>
          <DialogFooter>
            <Button
              className="w-full"
              disabled={busy || !lines.length}
              onClick={() => void parkAndServeNext(parkLabel)}
            >
              Park and serve next
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={creditOpen} onOpenChange={setCreditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Put {KES(total)} on credit</DialogTitle>
            <DialogDescription>
              Attach this sale to a customer. Add a regular if they are not on the list yet.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="credit-customer">Customer</Label>
            {shopCustomers.length ? (
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
            ) : (
              <p className="text-muted-foreground text-sm">
                No customers yet. Add one to put this sale on credit.
              </p>
            )}
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => setAddCustomerOpen(true)}
            >
              <Plus className="mr-2 size-4" /> Add customer
            </Button>
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

      <CustomerFormDialog
        open={addCustomerOpen}
        onOpenChange={setAddCustomerOpen}
        onSaved={(id) => {
          void queryClient.invalidateQueries({ queryKey: ["shop-customers"] });
          void queryClient.invalidateQueries({ queryKey: ["customers"] });
          setCreditCustomerId(id);
        }}
      />

      <ForeignCashDialog
        open={usdOpen}
        onOpenChange={setUsdOpen}
        currency={fxCurrency}
        kesTotal={payTotal}
        busy={busy}
        onConfirm={(fx) => void checkout("FOREIGN_CASH", undefined, fx)}
      />

      <BarcodeScannerDialog
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        title="Scan product barcode"
        onDetected={(code) => {
          const match = products.find(
            (p) =>
              p.sku.toLowerCase() === code.toLowerCase() ||
              (p.barcode ?? "").toLowerCase() === code.toLowerCase(),
          );
          if (match) {
            add(match.id);
            toast.success(match.name, { description: "Added to cart" });
            return;
          }
          setQuery(code);
          toast.info("No product match", {
            description: `Searched for ${code}. Add it in Inventory if it is new.`,
          });
        }}
      />
    </AppShell>
  );
}
