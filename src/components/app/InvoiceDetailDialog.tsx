import { Check, Printer, Share2, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { LogoMark } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { KES } from "@/lib/mock-data";
import type { PaymentRow } from "@/lib/payments";

function paidStatus(status: string): boolean {
  const s = status.toUpperCase();
  return s === "COMPLETE" || s === "COMPLETED" || s === "SUCCESS" || s === "PAID";
}

function statusLabel(status: string): string {
  if (paidStatus(status)) return "PAID";
  const s = status.toUpperCase();
  if (s === "FAILED" || s === "CANCELLED") return "FAILED";
  return "PENDING";
}

async function shareInvoice(row: PaymentRow, planName: string): Promise<void> {
  const text = [
    "InuaBiz subscription",
    row.invoice,
    row.mpesaReceipt ? `Transaction ID: ${row.mpesaReceipt}` : "",
    `${KES(row.amount)} · ${row.channel}`,
    planName,
    row.date,
    row.phone ? `Billed to ${row.phone}` : "",
    row.status,
  ]
    .filter(Boolean)
    .join("\n");
  try {
    if (navigator.share) {
      await navigator.share({ title: "InuaBiz invoice", text });
      return;
    }
  } catch {
    return;
  }
  await navigator.clipboard.writeText(text);
}

export function InvoiceDetailDialog({
  invoice,
  planName,
  onOpenChange,
}: {
  invoice: PaymentRow | null;
  planName?: string;
  onOpenChange: (open: boolean) => void;
}) {
  const plan = planName || "InuaBiz plan";
  const paid = invoice ? paidStatus(invoice.status) : false;

  const onShare = () => {
    if (!invoice) return;
    void shareInvoice(invoice, plan)
      .then(() => {
        if (!navigator.share) toast.success("Invoice copied");
      })
      .catch(() => toast.error("Could not share the invoice"));
  };

  return (
    <Dialog open={Boolean(invoice)} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Invoice</DialogTitle>
          <DialogDescription>
            {invoice?.mpesaReceipt
              ? `M-Pesa ${invoice.mpesaReceipt}`
              : invoice?.invoice ?? "Subscription payment"}
          </DialogDescription>
        </DialogHeader>
        {invoice && (
          <>
            <article className="surface-card overflow-hidden">
              <div className="bg-muted/50 flex flex-col items-center px-5 py-6 text-center">
                <span className="grid size-16 place-items-center overflow-hidden rounded-full ring-4 ring-primary/15">
                  <LogoMark className="size-16" title="InuaBiz" />
                </span>
                <h2 className="font-display mt-3 text-xl font-bold">InuaBiz</h2>
                <p className="text-muted-foreground mt-1 text-sm">Subscription invoice</p>
              </div>
              <div className="flex flex-col items-center px-5 py-6 text-center">
                {paid ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-white">
                    <Check className="size-3.5" strokeWidth={3} />
                    PAID
                  </span>
                ) : (
                  <span className="bg-muted text-muted-foreground inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide">
                    {statusLabel(invoice.status)}
                  </span>
                )}
                <p className="font-display mt-3 text-4xl font-bold tracking-tight">
                  {KES(invoice.amount)}
                </p>
                {invoice.mpesaReceipt ? (
                  <p className="text-muted-foreground mt-2 text-[12px] font-medium tracking-wide">
                    Transaction ID: {invoice.mpesaReceipt}
                  </p>
                ) : (
                  <p className="text-muted-foreground mt-2 text-[12px] font-medium tracking-wide">
                    {invoice.invoice}
                  </p>
                )}
                <p className="text-muted-foreground mt-0.5 text-[11px]">{invoice.date}</p>

                <p className="text-muted-foreground mt-6 w-full text-left text-[11px] font-semibold tracking-wide">
                  ITEMS
                </p>
                <div className="mt-3 flex w-full items-start justify-between gap-3 text-left">
                  <div>
                    <p className="text-[13px] font-semibold">{plan} · 30 days</p>
                    <p className="text-muted-foreground text-[11px]">1 × {KES(invoice.amount)}</p>
                  </div>
                  <p className="text-[13px] font-semibold">{KES(invoice.amount)}</p>
                </div>

                <div className="mt-5 w-full border-t border-dashed border-border" />
                <dl className="mt-4 w-full space-y-1.5 text-[13px]">
                  <div className="flex justify-between font-semibold">
                    <dt>Total</dt>
                    <dd>{KES(invoice.amount)}</dd>
                  </div>
                </dl>

                <p className="text-muted-foreground mt-4 inline-flex items-center gap-1.5 text-xs">
                  <Smartphone className="size-3.5" />
                  Paid via {invoice.channel}
                  {invoice.phone ? ` · ${invoice.phone}` : ""}
                </p>
                <p className="text-muted-foreground mt-4 text-[13px] italic leading-relaxed">
                  Thank you for subscribing to InuaBiz.
                </p>
                <Badge variant="outline" className="mt-3">
                  Invoice {invoice.invoice}
                </Badge>
              </div>
            </article>
            <Button className="h-12 w-full rounded-xl" onClick={onShare}>
              <Share2 className="mr-2 size-4" /> Share invoice
            </Button>
            <Button variant="outline" className="w-full" onClick={() => window.print()}>
              <Printer className="mr-2 size-4" /> Print invoice
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
