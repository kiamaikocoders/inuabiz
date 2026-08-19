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

export type StkDialogState = "idle" | "waiting" | "done" | "failed";

/**
 * POS overlay for idle phone entry, pending STK (A6) and payment received (A5).
 */
export function StkPaymentDialog({
  open,
  onOpenChange,
  state,
  phone,
  onPhoneChange,
  total,
  saleRef,
  customerLabel,
  busy,
  onSend,
  onCancel,
  onManualVerify,
  onPrint,
  onSms,
  onNewSale,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  state: StkDialogState;
  phone: string;
  onPhoneChange: (value: string) => void;
  total: number;
  saleRef: string;
  customerLabel: string;
  busy: boolean;
  onSend: () => void;
  onCancel: () => void;
  onManualVerify: () => void;
  onPrint: () => void;
  onSms: () => void;
  onNewSale: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "gap-0 sm:max-w-[480px] sm:rounded-[20px] sm:px-8 sm:py-7",
          (state === "waiting" || state === "done") && "text-center",
        )}
      >
        {state === "idle" || state === "failed" ? (
          <>
            <DialogHeader>
              <DialogTitle>Request {KES(total)} by M-Pesa</DialogTitle>
              <DialogDescription>
                The customer receives a PIN prompt on their handset. Payment reconciles
                automatically.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 space-y-2">
              <Label htmlFor="stk">Customer phone number</Label>
              <Input
                id="stk"
                placeholder="0712 345 678"
                value={phone}
                onChange={(e) => onPhoneChange(e.target.value)}
              />
            </div>
            {state === "failed" && (
              <p className="text-destructive mt-3 text-sm">Payment did not complete. Try again.</p>
            )}
            <Button className="mt-5 w-full" onClick={onSend} disabled={busy}>
              {busy ? "Sending…" : "Send prompt"}
            </Button>
          </>
        ) : null}

        {state === "waiting" ? (
          <>
            <DialogHeader className="items-center space-y-0 text-center">
              <DialogTitle className="font-display text-[22px]">M-Pesa Pending Payment</DialogTitle>
              <DialogDescription className="sr-only">
                Waiting for the customer to enter their M-Pesa PIN.
              </DialogDescription>
            </DialogHeader>
            <div className="border-primary mx-auto mt-4 grid size-[88px] place-items-center rounded-full border-[3px]">
              <Smartphone className="text-primary size-8 animate-pulse" />
            </div>
            <p className="text-primary mt-3 text-sm font-semibold">Waiting for PIN…</p>
            <p className="font-display mt-1 text-[28px] font-bold">{KES(total)}</p>
            <p className="text-muted-foreground mt-1 text-[13px]">
              Customer&apos;s phone: {phone || "—"}
            </p>
            <ol className="mt-5 flex items-start justify-center gap-2">
              {[
                { n: "1. STK Push Sent", on: true },
                { n: "2. Waiting for PIN", on: true },
                { n: "3. Confirming Safaricom", on: false },
              ].map((step) => (
                <li key={step.n} className="flex w-[130px] flex-col items-center gap-1.5">
                  <span
                    className={cn(
                      "size-7 rounded-full",
                      step.on ? "bg-primary" : "bg-muted",
                    )}
                    aria-hidden
                  />
                  <span
                    className={cn(
                      "text-center text-[11px] font-medium",
                      step.on ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {step.n}
                  </span>
                </li>
              ))}
            </ol>
            <p className="text-muted-foreground mt-4 text-xs leading-relaxed">
              Ask the customer to check their phone and enter their M-Pesa PIN. Expires in 60
              seconds.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button variant="outline" className="h-11 rounded-[10px]" onClick={onCancel}>
                Cancel Payment
              </Button>
              <Button className="h-11 rounded-[10px]" onClick={onManualVerify} disabled={busy}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : "Manual Verify"}
              </Button>
            </div>
            <p className="text-muted-foreground mt-2 text-[11px]">
              Use if delayed. Enter the M-Pesa code by hand.
            </p>
          </>
        ) : null}

        {state === "done" ? (
          <>
            <DialogHeader className="items-center space-y-0 text-center sm:text-center">
              <div className="flex items-center justify-center gap-2">
                <LogoMark className="size-7" />
                <DialogTitle className="font-display text-base">InuaBiz</DialogTitle>
              </div>
              <DialogDescription className="sr-only">Payment received via M-Pesa.</DialogDescription>
            </DialogHeader>
            <div className="bg-primary-soft text-primary mx-auto mt-4 grid size-[72px] place-items-center rounded-full">
              <Check className="size-9" strokeWidth={2.75} />
            </div>
            <p className="text-primary font-display mt-3 text-xl font-bold">
              Payment Received via M-Pesa
            </p>
            <dl className="mt-4 w-full space-y-2 text-left text-[13px]">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Transaction ID</dt>
                <dd className="font-semibold">{saleRef}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Amount Paid</dt>
                <dd className="font-semibold">{KES2(total)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Customer</dt>
                <dd className="font-semibold">{customerLabel}</dd>
              </div>
            </dl>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <Button className="h-11 rounded-[10px]" onClick={onPrint}>
                Print Receipt
              </Button>
              <Button className="h-11 rounded-[10px]" onClick={onSms}>
                Send SMS Receipt
              </Button>
            </div>
            <Button className="mt-2 h-11 w-full rounded-[10px]" onClick={onNewSale}>
              New Sale
            </Button>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
