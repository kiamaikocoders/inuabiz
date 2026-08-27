import { LogoMark } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { KES, KES2 } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import type { LastSale, ReceiptLine } from "@/lib/last-sale";
import { taxClassLabel, type TaxClass } from "@/lib/tax";

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
  return out;
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

  return (
    <div className={cn("mx-auto w-full max-w-[390px]", className)}>
      <article className="surface-card flex flex-col items-center px-5 py-6 text-center">
        <LogoMark className="size-12" title="InuaBiz" />
        <h2 className="font-display mt-3 text-lg font-bold">{r.shop}</h2>
        {r.location && <p className="text-muted-foreground mt-1 text-[13px]">{r.location}</p>}
        {r.kraPin && (
          <p className="text-muted-foreground mt-1 text-[12px] font-medium">KRA PIN {r.kraPin}</p>
        )}
        {(r.merchantPhone || r.email) && (
          <p className="text-muted-foreground text-[11px]">
            {[r.merchantPhone, r.email].filter(Boolean).join(" · ")}
          </p>
        )}
        <span className="border-primary text-primary mt-3 rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-wide">
          AUDIT RECEIPT
        </span>
        <p className="font-display mt-3 text-4xl font-bold tracking-tight">{KES(r.total)}</p>
        <p className="text-muted-foreground mt-1 text-[11px]">
          {r.ref} · {r.when}
        </p>

        <p className="text-muted-foreground mt-5 w-full text-left text-[11px] font-semibold tracking-wide">
          ITEMS
        </p>
        {r.lines.length === 0 ? (
          <p className="text-muted-foreground mt-2 w-full text-left text-[13px]">No items on this receipt.</p>
        ) : (
          <ul className="mt-2 w-full space-y-3 text-left">
            {r.lines.map((line) => (
              <li key={`${line.name}-${line.qty}`} className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[13px] font-semibold">{line.name}</p>
                  <p className="text-muted-foreground text-[11px]">
                    {line.qty} × {KES(line.price)}
                    {line.taxClass ? ` · ${taxClassLabel(line.taxClass as TaxClass)}` : ""}
                    {line.note ? ` · ${line.note}` : ""}
                  </p>
                </div>
                <p className="text-[13px] font-semibold">{KES(line.price * line.qty)}</p>
              </li>
            ))}
          </ul>
        )}

        <div className="bg-border mt-4 h-px w-full" />
        <dl className="mt-3 w-full space-y-1.5 text-[13px]">
          <div className="text-muted-foreground flex justify-between">
            <dt>Taxable (ex-VAT)</dt>
            <dd>{KES2(subtotal)}</dd>
          </div>
          <div className="text-muted-foreground flex justify-between">
            <dt>Rate A VAT 16%</dt>
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
          <div className="flex justify-between font-semibold">
            <dt>Total</dt>
            <dd>{KES(r.total)}</dd>
          </div>
        </dl>

        <p className="text-muted-foreground mt-4 text-xs">
          Paid via {r.channel}
          {r.phone ? ` · ${r.phone}` : ""}
          {r.mpesaReceipt ? ` · ${r.mpesaReceipt}` : ""}
        </p>
        <p className="text-muted-foreground mt-2 text-[11px] leading-relaxed">{r.footer}</p>
      </article>

      {showShare && (
        <Button className="mt-3 h-12 w-full rounded-xl" onClick={onShare}>
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
    ...r.lines.map((l) => `${l.name} × ${l.qty} — ${KES(l.price * l.qty)}`),
    `Rate A VAT 16% ${KES2(r.vat16 ?? 0)}`,
    `Paid via ${r.channel}`,
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
