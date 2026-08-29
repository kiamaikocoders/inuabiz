import { Check, Share2, Smartphone, Store, Wallet } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { ProductThumb } from "@/components/app/ProductThumb";
import { Button } from "@/components/ui/button";
import { KES, KES2 } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import type { LastSale, ReceiptLine } from "@/lib/last-sale";
import { taxClassLabel, type TaxClass } from "@/lib/tax";
import { fetchTenantHeader } from "@/lib/ops";
import { isSupabaseConfigured } from "@/lib/supabase";

const AUDIT_FOOTER =
  "Provisional Tax Document — Audit-Ready Record Generated via InuaBiz System.";

export function receiptFromSale(sale: LastSale | null): LastSale & {
  shop: string;
  location: string;
  when: string;
  footer: string;
  lines: ReceiptLine[];
} {
  const lines = sale?.lines?.length ? sale.lines : [];
  const total = sale?.total ?? 0;
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
    footer: sale?.footer ?? AUDIT_FOOTER,
    lines,
  };
  const phone = sale?.phone ?? sale?.customer;
  if (phone) out.phone = phone;
  if (sale?.legalName) out.legalName = sale.legalName;
  if (sale?.kraPin) out.kraPin = sale.kraPin;
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
  return out;
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
  if (c.includes("cash")) return "Cash";
  if (c.includes("credit")) return "Credit";
  return channel.replace(/_/g, " ");
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
  const vat16 = r.vat16 ?? 0;
  const vat0 = r.vat0 ?? 0;
  const exempt = r.exempt ?? 0;
  const subtotal = r.subtotalExVat ?? r.total - vat16;
  const { data: header } = useQuery({
    queryKey: ["tenant-header"],
    queryFn: fetchTenantHeader,
    enabled: isSupabaseConfigured() && !r.logoUrl,
  });
  const logoUrl = r.logoUrl || header?.logo_url || null;
  const payLabel = paymentMethodLabel(r.channel);
  const mpesa = payLabel === "M-Pesa";
  const paid = r.status !== "Pending" && r.status !== "Failed";

  return (
    <div className={cn("mx-auto w-full max-w-[390px]", className)}>
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
          {r.kraPin && (
            <p className="text-muted-foreground mt-1 text-[12px] font-medium">KRA PIN {r.kraPin}</p>
          )}
          {(r.merchantPhone || r.email) && (
            <p className="text-muted-foreground text-[11px]">
              {[r.merchantPhone, r.email].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>

        <div className="flex flex-col items-center px-5 py-6 text-center">
          {paid ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-white">
              <Check className="size-3.5" strokeWidth={3} />
              PAID
            </span>
          ) : (
            <span className="bg-muted text-muted-foreground inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide">
              {r.status === "Failed" ? "FAILED" : "PENDING"}
            </span>
          )}
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
                    <ProductThumb
                      src={line.imageUrl}
                      alt=""
                      className="size-11 shrink-0 rounded-lg"
                    />
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold">{line.name}</p>
                      <p className="text-muted-foreground text-[11px]">
                        {line.qty} × {KES(line.price)}
                        {line.taxClass ? ` · ${taxClassLabel(line.taxClass as TaxClass)}` : ""}
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
            <div className="text-muted-foreground flex justify-between">
              <dt>VAT (16%)</dt>
              <dd>{KES2(vat16)}</dd>
            </div>
            {vat0 > 0 && (
              <div className="text-muted-foreground flex justify-between">
                <dt>Rate B zero-rated</dt>
                <dd>{KES2(vat0)}</dd>
              </div>
            )}
            {exempt > 0 && (
              <div className="text-muted-foreground flex justify-between">
                <dt>Rate C exempt</dt>
                <dd>{KES2(exempt)}</dd>
              </div>
            )}
            <div className="flex justify-between pt-1 text-base font-semibold">
              <dt>Total</dt>
              <dd>{KES(r.total)}</dd>
            </div>
          </dl>

          <p className="text-muted-foreground mt-4 inline-flex items-center gap-1.5 text-xs">
            {mpesa ? <Smartphone className="size-3.5" /> : <Wallet className="size-3.5" />}
            Paid via {payLabel}
          </p>
          <p className="text-muted-foreground mt-4 text-[13px] italic leading-relaxed">
            Thank you for shopping with {r.shop}!
          </p>
          <p className="text-muted-foreground mt-2 text-[11px] leading-relaxed">{r.footer}</p>
        </div>
      </article>

      {showShare && (
        <Button className="mt-3 h-12 w-full rounded-xl" onClick={onShare}>
          <Share2 className="mr-2 size-4" />
          Share Receipt
        </Button>
      )}
    </div>
  );
}

export async function shareReceiptText(sale?: LastSale | null): Promise<void> {
  const r = receiptFromSale(sale ?? null);
  const text = [
    r.shop,
    r.kraPin ? `KRA PIN ${r.kraPin}` : "",
    r.location,
    `${r.ref} · ${KES(r.total)}`,
    r.mpesaReceipt ? `Transaction ID: ${r.mpesaReceipt}` : "",
    r.mpesaPayerName || (r.customer !== "Walk-in" ? r.customer : ""),
    ...r.lines.map((l) => `${l.name} × ${l.qty} — ${KES(l.price * l.qty)}`),
    `Rate A VAT 16% ${KES2(r.vat16 ?? 0)}`,
    `Paid via ${paymentMethodLabel(r.channel)}`,
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
