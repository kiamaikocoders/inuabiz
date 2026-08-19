import { LogoMark } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { KES } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import type { LastSale, ReceiptLine } from "@/lib/last-sale";

const DEMO_LINES: ReceiptLine[] = [
  { name: "Unga Pembe 2kg", qty: 1, price: 195 },
  { name: "Cooking Oil 1L", qty: 1, price: 340 },
  { name: "Sukari Kabras 1kg", qty: 4, price: 175 },
];

/**
 * VAT-inclusive split matching the customer receipt (16%).
 */
export function vatSplit(total: number, lineSum?: number): { subtotal: number; vat: number } {
  if (lineSum != null && lineSum > 0 && lineSum < total) {
    return { subtotal: lineSum, vat: total - lineSum };
  }
  const vat = Math.round((total * 16) / 116);
  return { subtotal: total - vat, vat };
}

export function receiptFromSale(sale: LastSale | null): {
  shop: string;
  location: string;
  total: number;
  ref: string;
  when: string;
  channel: string;
  phone: string;
  footer: string;
  status: string;
  lines: ReceiptLine[];
} {
  const lines = sale?.lines?.length ? sale.lines : DEMO_LINES;
  const total = sale?.total ?? 1500;
  return {
    shop: sale?.shop ?? "Njoroge Mini Mart",
    location: sale?.location ?? "Kasarani, Nairobi",
    total,
    ref: sale?.ref ?? "SL-10239",
    when: sale?.when ?? "Today · 14:35 EAT",
    channel: sale?.channel ?? "M-Pesa STK",
    phone: sale?.phone ?? sale?.customer ?? "0722 431 002",
    footer: sale?.footer ?? "Asante sana! Karibu tena.",
    status: "PAID",
    lines,
  };
}

/**
 * Customer-facing receipt card from the addons Figma (A4).
 */
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
  const lineSum = r.lines.reduce((s, l) => s + l.price * l.qty, 0);
  const { subtotal, vat } = vatSplit(r.total, lineSum);

  return (
    <div className={cn("mx-auto w-full max-w-[390px]", className)}>
      <article className="surface-card flex flex-col items-center px-5 py-6 text-center">
        <LogoMark className="size-12" title="InuaBiz" />
        <h2 className="font-display mt-3 text-lg font-bold">{r.shop}</h2>
        <p className="text-muted-foreground mt-1 text-[13px]">{r.location}</p>
        <span className="border-primary text-primary mt-3 rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-wide">
          {r.status}
        </span>
        <p className="font-display mt-3 text-4xl font-bold tracking-tight">{KES(r.total)}</p>
        <p className="text-muted-foreground mt-1 text-[11px]">
          {r.ref} · {r.when}
        </p>

        <p className="text-muted-foreground mt-5 w-full text-left text-[11px] font-semibold tracking-wide">
          ITEMS
        </p>
        <ul className="mt-2 w-full space-y-3 text-left">
          {r.lines.map((line) => (
            <li key={`${line.name}-${line.qty}`} className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[13px] font-semibold">{line.name}</p>
                <p className="text-muted-foreground text-[11px]">
                  {line.qty} × {KES(line.price)}
                </p>
              </div>
              <p className="text-[13px] font-semibold">{KES(line.price * line.qty)}</p>
            </li>
          ))}
        </ul>

        <div className="bg-border mt-4 h-px w-full" />
        <dl className="mt-3 w-full space-y-1.5 text-[13px]">
          <div className="text-muted-foreground flex justify-between">
            <dt>Subtotal</dt>
            <dd>{KES(subtotal)}</dd>
          </div>
          <div className="text-muted-foreground flex justify-between">
            <dt>VAT (16%)</dt>
            <dd>{KES(vat)}</dd>
          </div>
          <div className="flex justify-between font-semibold">
            <dt>Total</dt>
            <dd>{KES(r.total)}</dd>
          </div>
        </dl>

        <p className="text-muted-foreground mt-4 text-xs">
          Paid via {r.channel} · {r.phone}
        </p>
        <p className="text-muted-foreground mt-1 text-xs">{r.footer}</p>
      </article>

      {showShare && (
        <Button className="mt-3 h-12 w-full rounded-xl" onClick={onShare}>
          Share Receipt
        </Button>
      )}
    </div>
  );
}

/**
 * Shares the receipt via the Web Share API, falling back to the clipboard.
 */
export async function shareReceiptText(sale?: LastSale | null): Promise<void> {
  const r = receiptFromSale(sale ?? null);
  const text = [
    r.shop,
    r.location,
    `${r.status} · ${KES(r.total)}`,
    r.ref,
    ...r.lines.map((l) => `${l.name} × ${l.qty} — ${KES(l.price * l.qty)}`),
    `Paid via ${r.channel}`,
    r.footer,
  ].join("\n");

  try {
    if (navigator.share) {
      await navigator.share({ title: `${r.shop} receipt`, text });
      return;
    }
  } catch {
    /* user cancelled */
    return;
  }
  await navigator.clipboard.writeText(text);
}
