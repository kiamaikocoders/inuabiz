import { Download, Share2, Smartphone, Store, Wallet } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ProductThumb } from "@/components/app/ProductThumb";
import { Button } from "@/components/ui/button";
import { KES, KES2 } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import type { LastSale, ReceiptLine } from "@/lib/last-sale";
import { calculateTax, taxClassLabel, type TaxClass } from "@/lib/tax";
import { downloadEtimsExport } from "@/lib/etr-export";
import { fetchTenantHeader } from "@/lib/ops";
import { isSupabaseConfigured } from "@/lib/supabase";

const STANDARD_FOOTER = "Shop receipt — InuaBiz till";
const ETR_FOOTER =
  "ETR tax invoice — prepared for eTIMS export. Not yet transmitted to KRA.";

/** Prefer invoice VAT fields; fall back to inclusive split from lines when missing. */
export function etrTaxTotals(r: LastSale) {
  const lines = r.lines ?? [];
  const fromLines =
    lines.length > 0
      ? calculateTax(
          lines.map((l) => ({
            name: l.name,
            qty: l.qty,
            unitPrice: l.price,
            lineTotal: l.price * l.qty,
            taxClass: (l.taxClass as TaxClass) ?? "STANDARD_16",
          })),
        )
      : null;

  const hasInvoiceVat =
    r.vat16 != null || r.vat0 != null || r.exempt != null || r.subtotalExVat != null;
  if (hasInvoiceVat) {
    const vat16 = Number(r.vat16 ?? 0);
    const vat0 = Number(r.vat0 ?? 0);
    const exempt = Number(r.exempt ?? 0);
    if (vat16 === 0 && vat0 === 0 && exempt === 0 && fromLines && fromLines.vat16Amount > 0) {
      return {
        vat16: fromLines.vat16Amount,
        vat0: fromLines.vat0Amount,
        exempt: fromLines.exemptAmount,
        subtotal: fromLines.subtotalExVat,
      };
    }
    return {
      vat16,
      vat0,
      exempt,
      subtotal: Number(r.subtotalExVat ?? r.total - vat16),
    };
  }

  if (fromLines) {
    return {
      vat16: fromLines.vat16Amount,
      vat0: fromLines.vat0Amount,
      exempt: fromLines.exemptAmount,
      subtotal: fromLines.subtotalExVat,
    };
  }

  return { vat16: 0, vat0: 0, exempt: 0, subtotal: r.total };
}

export function receiptFromSale(sale: LastSale | null): LastSale & {
  shop: string;
  location: string;
  when: string;
  footer: string;
  lines: ReceiptLine[];
} {
  const lines = sale?.lines?.length ? sale.lines : [];
  const total = sale?.total ?? 0;
  const etr = Boolean(sale?.etrFormat);
  const out: LastSale & {
    shop: string;
    location: string;
    when: string;
    footer: string;
    lines: ReceiptLine[];
  } = {
    id: sale?.id ?? "",
    ref: sale?.ref ?? "—",
    total,
    items: lines.length,
    channel: sale?.channel ?? "—",
    customer: sale?.customer ?? "Walk-in",
    shop: sale?.legalName || sale?.shop || "InuaBiz",
    location: sale?.location ?? "",
    when: sale?.when ?? "",
    footer: sale?.footer ?? (etr ? ETR_FOOTER : STANDARD_FOOTER),
    lines,
    etrFormat: etr,
  };
  const phone = sale?.phone ?? sale?.customer;
  if (phone) out.phone = phone;
  if (sale?.legalName) out.legalName = sale.legalName;
  if (sale?.kraPin) out.kraPin = sale.kraPin;
  if (sale?.customerKraPin) out.customerKraPin = sale.customerKraPin;
  if (sale?.email) out.email = sale.email;
  if (sale?.merchantPhone) out.merchantPhone = sale.merchantPhone;
  if (sale?.vat16 != null) out.vat16 = sale.vat16;
  if (sale?.vat0 != null) out.vat0 = sale.vat0;
  if (sale?.exempt != null) out.exempt = sale.exempt;
  if (sale?.subtotalExVat != null) out.subtotalExVat = sale.subtotalExVat;
  if (sale?.mpesaReceipt) out.mpesaReceipt = sale.mpesaReceipt;
  if (sale?.mpesaPayerName) out.mpesaPayerName = sale.mpesaPayerName;
  if (sale?.status) out.status = sale.status;
  if (sale?.logoUrl) out.logoUrl = sale.logoUrl;
  if (sale?.controlNumber) out.controlNumber = sale.controlNumber;
  if (sale?.qrUrl) out.qrUrl = sale.qrUrl;
  if (sale?.isoWhen) out.isoWhen = sale.isoWhen;
  if (sale?.branchId) out.branchId = sale.branchId;
  if (sale?.tenderCurrency) out.tenderCurrency = sale.tenderCurrency;
  if (sale?.fxRate != null) out.fxRate = sale.fxRate;
  if (sale?.foreignAmount != null) out.foreignAmount = sale.foreignAmount;
  return out;
}

function usdTenderSuffix(r: { tenderCurrency?: string; foreignAmount?: number; fxRate?: number }) {
  if (!r.tenderCurrency || r.tenderCurrency === "KES" || !(r.foreignAmount && r.fxRate)) return "";
  return ` · ${Number(r.foreignAmount).toFixed(2)} ${r.tenderCurrency} @ ${Number(r.fxRate).toFixed(2)}`;
}

function paymentMethodLabel(channel: string): string {
  const c = channel.toLowerCase();
  if (
    c.includes("mpesa") ||
    c.includes("personal") ||
    c.includes("pochi") ||
    c.includes("till") ||
    c.includes("paybill") ||
    c.includes("payhero")
  ) {
    return "M-Pesa";
  }
  if (c.includes("usd")) return "USD cash";
  if (/\b[a-z]{3}\s+cash\b/.test(c) || c.endsWith(" cash")) {
    return channel.replace(/_/g, " ");
  }
  if (c.includes("cash")) return "Cash";
  if (c.includes("credit")) return "Credit";
  return channel.replace(/_/g, " ");
}

function EtrThermalReceipt({
  r,
  vat16,
  vat0,
  exempt,
  subtotal,
}: {
  r: LastSale & { shop: string; location: string; when: string; footer: string; lines: ReceiptLine[] };
  vat16: number;
  vat0: number;
  exempt: number;
  subtotal: number;
}) {
  const payLabel = paymentMethodLabel(r.channel);
  const qrTarget =
    r.qrUrl ||
    (r.controlNumber
      ? `https://inuabiz.co.ke/verify-receipt?cuin=${encodeURIComponent(r.controlNumber)}&inv=${encodeURIComponent(r.ref)}`
      : null);
  const qrSrc = qrTarget
    ? `https://api.qrserver.com/v1/create-qr-code/?size=148x148&data=${encodeURIComponent(qrTarget)}`
    : null;

  return (
    <article className="border-border bg-card overflow-hidden rounded-xl border font-mono text-[12px] leading-snug text-foreground shadow-sm">
      <div className="space-y-1 border-b border-dashed border-border px-4 py-4 text-center">
        <p className="text-[10px] font-semibold tracking-[0.2em]">TAX INVOICE</p>
        <p className="text-[10px] tracking-wide text-muted-foreground">ETR · ELECTRONIC TAX RECEIPT</p>
        <h2 className="pt-2 text-[15px] font-bold tracking-tight">{r.shop}</h2>
        {r.location ? <p className="text-muted-foreground whitespace-pre-wrap">{r.location}</p> : null}
        {r.merchantPhone ? <p className="text-muted-foreground">Tel: {r.merchantPhone}</p> : null}
        <p className="pt-1 font-semibold">
          Seller PIN: {r.kraPin ? r.kraPin : "— set KRA PIN in Settings —"}
        </p>
        <p className="text-muted-foreground">Branch: {r.branchId ?? "00"}</p>
      </div>

      <div className="space-y-1 border-b border-dashed border-border px-4 py-3">
        <div className="flex justify-between gap-3">
          <span className="text-muted-foreground">Invoice</span>
          <span className="font-semibold">{r.ref}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-muted-foreground">CUIN</span>
          <span className="font-semibold">{r.controlNumber ?? "Pending issue"}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-muted-foreground">Date / time</span>
          <span className="text-right">{r.when}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-muted-foreground">Buyer</span>
          <span className="text-right">{r.customer || "Walk-in Customer"}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-muted-foreground">Buyer PIN</span>
          <span>{r.customerKraPin || "—"}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-muted-foreground">Payment</span>
          <span className="text-right">
            {payLabel}
            {usdTenderSuffix(r)}
          </span>
        </div>
        {r.mpesaReceipt ? (
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">M-Pesa code</span>
            <span>{r.mpesaReceipt}</span>
          </div>
        ) : null}
      </div>

      <div className="border-b border-dashed border-border px-4 py-3">
        <div className="text-muted-foreground mb-2 flex justify-between text-[10px] font-semibold tracking-wide">
          <span>ITEM</span>
          <span>AMOUNT</span>
        </div>
        {r.lines.length === 0 ? (
          <p className="text-muted-foreground">No items</p>
        ) : (
          <ul className="space-y-2.5">
            {r.lines.map((line, idx) => (
              <li key={`${line.name}-${idx}`}>
                <div className="flex justify-between gap-3">
                  <span className="min-w-0 font-medium">
                    {idx + 1}. {line.name}
                  </span>
                  <span className="shrink-0 font-semibold">{KES2(line.price * line.qty)}</span>
                </div>
                <p className="text-muted-foreground pl-3 text-[11px]">
                  {line.qty} × {KES2(line.price)} · {taxClassLabel((line.taxClass as TaxClass) ?? "STANDARD_16")}
                  {line.classificationCode ? ` · ${line.classificationCode}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-1 border-b border-dashed border-border px-4 py-3">
        <div className="flex justify-between gap-3">
          <span className="text-muted-foreground">Taxable value (ex VAT)</span>
          <span>{KES2(subtotal)}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-muted-foreground">VAT Rate A (16%)</span>
          <span>{KES2(vat16)}</span>
        </div>
        {vat0 > 0 && (
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">Rate B zero-rated</span>
            <span>{KES2(vat0)}</span>
          </div>
        )}
        {exempt > 0 && (
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">Rate C exempt</span>
            <span>{KES2(exempt)}</span>
          </div>
        )}
        <div className="flex justify-between gap-3 border-t border-dashed border-border pt-2 text-[14px] font-bold">
          <span>TOTAL</span>
          <span>{KES(r.total)}</span>
        </div>
      </div>

      <div className="flex flex-col items-center gap-2 px-4 py-4 text-center">
        {qrSrc ? (
          <>
            <img src={qrSrc} alt="ETR verification QR" className="size-36 rounded bg-white p-1" />
            <p className="text-muted-foreground text-[10px] leading-relaxed">
              Scan to verify this ETR record. Export JSON to forward into eTIMS.
            </p>
          </>
        ) : (
          <p className="text-muted-foreground text-[10px]">
            QR / CUIN appear once the fiscal invoice is issued for this sale.
          </p>
        )}
        <p className="text-muted-foreground pt-1 text-[10px] leading-relaxed">{r.footer}</p>
      </div>
    </article>
  );
}

function StandardReceipt({
  r,
  subtotal,
  logoUrl,
}: {
  r: LastSale & { shop: string; location: string; when: string; footer: string; lines: ReceiptLine[] };
  subtotal: number;
  logoUrl: string | null;
}) {
  const payLabel = paymentMethodLabel(r.channel);
  const mpesa = payLabel === "M-Pesa";
  const paid = r.status !== "Pending" && r.status !== "Failed";

  return (
    <article className="surface-card overflow-hidden">
      <div className="bg-muted/50 flex flex-col items-center px-5 py-6 text-center">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt=""
            className="size-16 rounded-full object-cover ring-4 ring-primary/15"
          />
        ) : (
          <span className="bg-primary grid size-16 place-items-center rounded-full ring-4 ring-primary/15">
            <Store className="size-7 text-primary-foreground" />
          </span>
        )}
        <h2 className="font-display mt-3 text-xl font-bold">{r.shop}</h2>
        {r.location && <p className="text-muted-foreground mt-1 text-sm">{r.location}</p>}
        {(r.merchantPhone || r.email) && (
          <p className="text-muted-foreground text-[11px]">
            {[r.merchantPhone, r.email].filter(Boolean).join(" · ")}
          </p>
        )}
      </div>

      <div className="flex flex-col items-center px-5 py-6 text-center">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide",
            paid ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground",
          )}
        >
          {paid ? "PAID" : r.status === "Failed" ? "FAILED" : "PENDING"}
        </span>
        <p className="font-display mt-3 text-4xl font-bold tracking-tight">{KES(r.total)}</p>
        <p className="text-muted-foreground mt-2 text-[12px] font-medium tracking-wide">
          {r.mpesaReceipt ? `Transaction ID: ${r.mpesaReceipt}` : r.ref}
        </p>
        {r.mpesaPayerName ? (
          <p className="mt-1 text-[13px] font-semibold tracking-wide">{r.mpesaPayerName}</p>
        ) : r.customer && r.customer !== "Walk-in" ? (
          <p className="text-muted-foreground mt-1 text-[12px]">{r.customer}</p>
        ) : null}
        <p className="text-muted-foreground mt-0.5 text-[11px]">{r.when}</p>

        <p className="text-muted-foreground mt-6 w-full text-left text-[11px] font-semibold tracking-wide">
          ITEMS
        </p>
        {r.lines.length === 0 ? (
          <p className="text-muted-foreground mt-2 w-full text-left text-[13px]">
            No items on this receipt.
          </p>
        ) : (
          <ul className="mt-3 w-full space-y-3 text-left">
            {r.lines.map((line) => (
              <li key={`${line.name}-${line.qty}`} className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-2.5">
                  <ProductThumb src={line.imageUrl} alt="" className="size-11 shrink-0 rounded-lg" />
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold">{line.name}</p>
                    <p className="text-muted-foreground text-[11px]">
                      {line.qty} × {KES(line.price)}
                      {line.note ? ` · ${line.note}` : ""}
                    </p>
                  </div>
                </div>
                <p className="text-[13px] font-semibold">{KES(line.price * line.qty)}</p>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-5 w-full border-t border-dashed border-border" />
        <dl className="mt-4 w-full space-y-1.5 text-[13px]">
          <div className="text-muted-foreground flex justify-between">
            <dt>Subtotal</dt>
            <dd>{KES2(subtotal)}</dd>
          </div>
          <div className="flex justify-between pt-1 text-base font-semibold">
            <dt>Total</dt>
            <dd>{KES(r.total)}</dd>
          </div>
        </dl>

          <p className="text-muted-foreground mt-4 inline-flex items-center gap-1.5 text-xs">
            {mpesa ? <Smartphone className="size-3.5" /> : <Wallet className="size-3.5" />}
            Paid via {payLabel}
            {usdTenderSuffix(r)}
          </p>
        <p className="text-muted-foreground mt-4 text-[13px] italic leading-relaxed">
          Thank you for shopping with {r.shop}!
        </p>
        <p className="text-muted-foreground mt-2 text-[11px] leading-relaxed">{r.footer}</p>
      </div>
    </article>
  );
}

export function ReceiptCard({
  sale,
  className,
  showShare = false,
  onShare,
}: {
  sale?: LastSale | null;
  className?: string;
  showShare?: boolean;
  onShare?: () => void;
}) {
  const r = receiptFromSale(sale ?? null);
  const etr = Boolean(r.etrFormat);
  const tax = etr
    ? etrTaxTotals(r)
    : {
        vat16: 0,
        vat0: 0,
        exempt: 0,
        subtotal: r.subtotalExVat ?? r.total,
      };
  const { vat16, vat0, exempt, subtotal } = tax;
  const { data: header } = useQuery({
    queryKey: ["tenant-header"],
    queryFn: fetchTenantHeader,
    enabled: isSupabaseConfigured() && !r.logoUrl && !etr,
  });
  const logoUrl = r.logoUrl || header?.logo_url || null;

  const onExport = () => {
    try {
      downloadEtimsExport(r);
      toast.success("eTIMS export downloaded", {
        description: "JSON matches the KRA sales payload shape for forwarding.",
      });
    } catch (err) {
      toast.error("Could not export", {
        description: err instanceof Error ? err.message : "Try again.",
      });
    }
  };

  return (
    <div className={cn("mx-auto w-full max-w-[390px]", className)}>
      {etr ? (
        <EtrThermalReceipt r={r} vat16={vat16} vat0={vat0} exempt={exempt} subtotal={subtotal} />
      ) : (
        <StandardReceipt r={r} subtotal={subtotal} logoUrl={logoUrl} />
      )}

      {showShare && (
        <div className="mt-3 flex flex-col gap-2">
          {etr && (
            <Button variant="secondary" className="h-12 w-full rounded-xl" onClick={onExport}>
              <Download className="mr-2 size-4" />
              Export for eTIMS
            </Button>
          )}
          <Button className="h-12 w-full rounded-xl" onClick={onShare}>
            <Share2 className="mr-2 size-4" />
            Share Receipt
          </Button>
        </div>
      )}
    </div>
  );
}

export async function shareReceiptText(sale?: LastSale | null): Promise<void> {
  const r = receiptFromSale(sale ?? null);
  const tax = r.etrFormat ? etrTaxTotals(r) : null;
  const text = [
    r.etrFormat ? "TAX INVOICE / ETR" : r.shop,
    r.shop,
    r.kraPin ? `Seller KRA PIN ${r.kraPin}` : "",
    r.location,
    `Invoice ${r.ref} · ${KES(r.total)}`,
    r.controlNumber ? `CUIN ${r.controlNumber}` : "",
    r.when,
    `Buyer: ${r.customer}${r.customerKraPin ? ` · PIN ${r.customerKraPin}` : ""}`,
    r.mpesaReceipt ? `Transaction ID: ${r.mpesaReceipt}` : "",
    ...r.lines.map(
      (l) =>
        `${l.name} × ${l.qty} — ${KES(l.price * l.qty)}${l.taxClass ? ` · ${taxClassLabel(l.taxClass as TaxClass)}` : ""}`,
    ),
    tax
      ? `Taxable ${KES2(tax.subtotal)} · VAT 16% ${KES2(tax.vat16)} · Total ${KES(r.total)}`
      : "",
    `Paid via ${paymentMethodLabel(r.channel)}${usdTenderSuffix(r)}`,
    r.footer,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    if (navigator.share) {
      await navigator.share({ title: `${r.shop} receipt`, text });
      return;
    }
  } catch {
    return;
  }
  await navigator.clipboard.writeText(text);
}
