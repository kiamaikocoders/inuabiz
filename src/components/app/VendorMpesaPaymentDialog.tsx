import { Check, Loader2, Smartphone } from "lucide-react";
import { LogoMark } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KES, KES2 } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export type VendorMpesaDialogState = "idle" | "waiting" | "done" | "failed";

export type PaymentDestinationInfo = {
  destinationType: "PERSONAL_MPESA" | "TILL" | "PAYBILL" | "POCHI";
  accountNumber: string;
  accountName: string | null;
};

/**
 * POS overlay: customer pays the vendor's own till/paybill/phone — not platform STK.
 */
export function VendorMpesaPaymentDialog({
  open,
  onOpenChange,
  state,
  total,
  saleRef,
  billRef,
  destination,
  receiptCode,
  onReceiptChange,
  busy,
  onConfirmManual,
  onCancel,
  onNextCustomer,
  onPrint,
  onShare,
  onNewSale,
  mpesaReceipt,
  payerName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  state: VendorMpesaDialogState;
  total: number;
  saleRef: string;
  billRef: string;
  destination: PaymentDestinationInfo | null;
  receiptCode: string;
  onReceiptChange: (value: string) => void;
  busy: boolean;
  onConfirmManual: () => void;
  onCancel: () => void;
  onNextCustomer: () => void;
  onPrint: () => void;
  onShare: () => void;
  onNewSale: () => void;
  mpesaReceipt?: string | null;
  payerName?: string | null;
}) {
  const destType = destination?.destinationType;
  const isTillLike = destType === "TILL" || destType === "PAYBILL";
  const destLabel =
    destType === "TILL"
      ? "Buy Goods Till"
      : destType === "PAYBILL"
        ? "Paybill"
        : destType === "POCHI"
          ? "Pochi la Biashara"
          : "M-Pesa number";
  const waitHint =
    destType === "TILL"
      ? "Customer pays this till. Companion SMS or the code confirms the sale. A Safaricom callback also closes it if this till is registered with us."
      : destType === "PAYBILL"
        ? "Customer pays this paybill. Companion SMS or the code confirms the sale. A Safaricom callback also closes it if this paybill is registered with us."
        : `Customer sends ${KES(total)} to your number. The companion phone marks this paid when the M-Pesa SMS arrives — or enter the 10-character code.`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "gap-0 sm:max-w-[480px] sm:rounded-[20px] sm:px-8 sm:py-7",
          (state === "waiting" || state === "done") && "text-center",
        )}
      >
        {state === "waiting" ? (
          <>
            <DialogHeader className="items-center space-y-0 text-center">
              <DialogTitle className="font-display text-[22px]">
                Confirm M-Pesa payment
              </DialogTitle>
              <DialogDescription className="sr-only">
                Customer pays the vendor M-Pesa destination directly.
              </DialogDescription>
            </DialogHeader>

            <div className="border-primary mx-auto mt-4 grid size-[88px] place-items-center rounded-full border-[3px]">
              <Smartphone className="text-primary size-8 animate-pulse" />
            </div>

            <p className="font-display mt-3 text-[28px] font-bold">{KES(total)}</p>

            {destination ? (
              <div className="mt-4 rounded-xl border border-border bg-muted/40 p-4 text-left text-sm">
                <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                  Pay to your {destLabel}
                </p>
                <p className="mt-1 font-display text-2xl font-bold tracking-wide">
                  {destination.accountNumber}
                </p>
                {destination.accountName ? (
                  <p className="text-muted-foreground mt-1">{destination.accountName}</p>
                ) : null}
                {isTillLike && billRef ? (
                  <p className="mt-3 text-xs">
                    <span className="text-muted-foreground">Account / reference: </span>
                    <span className="font-semibold">{billRef}</span>
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="text-muted-foreground mt-3 text-sm">
                Add your M-Pesa destination in Settings if it is missing.
              </p>
            )}

            <div className="mt-4 space-y-2 text-left">
              <Label htmlFor="mpesa-code">M-Pesa confirmation code</Label>
              <Input
                id="mpesa-code"
                placeholder="e.g. QFX789ABC1"
                value={receiptCode}
                onChange={(e) => onReceiptChange(e.target.value.toUpperCase())}
                className="font-mono uppercase"
              />
              <p className="text-muted-foreground text-xs leading-relaxed">{waitHint}</p>
              <Button
                className="mt-2 w-full"
                disabled={busy || receiptCode.trim().length < 8}
                onClick={onConfirmManual}
              >
                {busy ? <Loader2 className="size-4 animate-spin" /> : "Confirm payment"}
              </Button>
            </div>

            <Button
              variant="outline"
              className="mt-4 h-11 w-full rounded-[10px]"
              onClick={onNextCustomer}
            >
              Next customer
            </Button>
            <Button variant="ghost" className="mt-1 h-10 w-full" onClick={onCancel}>
              Stay on this sale
            </Button>
          </>
        ) : null}

        {state === "done" ? (
          <>
            <DialogHeader className="items-center space-y-0 text-center sm:text-center">
              <div className="flex items-center justify-center gap-2">
                <LogoMark className="size-7" />
                <DialogTitle className="font-display text-base">InuaBiz</DialogTitle>
              </div>
              <DialogDescription className="sr-only">Payment confirmed.</DialogDescription>
            </DialogHeader>
            <div className="bg-primary-soft text-primary mx-auto mt-4 grid size-[72px] place-items-center rounded-full">
              <Check className="size-9" strokeWidth={2.75} />
            </div>
            <p className="text-primary font-display mt-3 text-xl font-bold">Payment confirmed</p>
            <dl className="mt-4 w-full space-y-2 text-left text-[13px]">
              {(mpesaReceipt || payerName) && (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">M-Pesa</dt>
                  <dd className="text-right font-semibold">
                    {[mpesaReceipt, payerName].filter(Boolean).join(" · ")}
                  </dd>
                </div>
              )}
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Sale</dt>
                <dd className="font-semibold">{saleRef}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Amount</dt>
                <dd className="font-semibold">{KES2(total)}</dd>
              </div>
            </dl>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <Button className="h-11 rounded-[10px]" onClick={onPrint}>
                Print receipt
              </Button>
              <Button className="h-11 rounded-[10px]" onClick={onShare}>
                Share receipt
              </Button>
            </div>
            <Button className="mt-2 h-11 w-full rounded-[10px]" onClick={onNewSale}>
              New sale
            </Button>
          </>
        ) : null}

        {state === "failed" ? (
          <>
            <DialogHeader>
              <DialogTitle>Payment not confirmed</DialogTitle>
              <DialogDescription>
                The sale is still open. Try again or use cash/credit.
              </DialogDescription>
            </DialogHeader>
            <Button className="mt-4 w-full" onClick={onCancel}>
              Close
            </Button>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
