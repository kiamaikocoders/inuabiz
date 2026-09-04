import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { KES, KES2 } from "@/lib/mock-data";
import {
  fetchFxQuote,
  foreignToKes,
  kesToForeign,
  suggestForeignForKes,
  type FxQuote,
} from "@/lib/fx";

export function ForeignCashDialog({
  open,
  onOpenChange,
  currency,
  kesTotal,
  busy,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currency: string;
  kesTotal: number;
  busy?: boolean;
  onConfirm: (input: { currency: string; fxRate: number; foreignAmount: number }) => void;
}) {
  const code = currency.toUpperCase();
  const [quote, setQuote] = useState<FxQuote | null>(null);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setAmount("");
    void fetchFxQuote(code)
      .then((q) => {
        setQuote(q);
        if (q.rate > 0) setAmount(String(suggestForeignForKes(kesTotal, q.rate)));
        else toast.error("No CBK rate yet", { description: "Ask admin to pull CBK rates." });
      })
      .catch(() => {
        setQuote(null);
        toast.error("Could not load CBK rate");
      })
      .finally(() => setLoading(false));
  }, [open, kesTotal, code]);

  const fxRate = quote?.rate ?? 0;
  const foreignAmount = Number(amount) || 0;
  const covered = fxRate > 0 ? foreignToKes(foreignAmount, fxRate) : 0;
  const shortfall = Math.max(0, Math.round((kesTotal - covered) * 100) / 100);
  const changeKes = Math.max(0, Math.round((covered - kesTotal) * 100) / 100);
  const canConfirm = fxRate > 0 && foreignAmount > 0 && covered + 0.009 >= kesTotal;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{code} cash</DialogTitle>
          <DialogDescription>
            Sale stays in KES ({KES(kesTotal)}). Rate is CBK only — no till override.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="bg-muted/50 rounded-lg px-3 py-2 text-xs">
            {loading ? (
              <p className="text-muted-foreground">Loading CBK rate…</p>
            ) : fxRate > 0 ? (
              <p>
                CBK{" "}
                <span className="font-semibold">
                  {fxRate.toFixed(2)} KES / {code}
                </span>
                {quote?.date ? ` · ${quote.date}` : ""}
              </p>
            ) : (
              <p className="text-muted-foreground">No CBK rate for {code} yet.</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fx-amt">{code} received</Label>
            <Input
              id="fx-amt"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              disabled={!fxRate}
            />
            {fxRate > 0 && (
              <p className="text-muted-foreground text-[11px]">
                Suggested {suggestForeignForKes(kesTotal, fxRate).toFixed(2)} {code} to cover the
                bill (≈ {KES2(kesToForeign(kesTotal, fxRate))} at exact rate).
              </p>
            )}
          </div>

          <dl className="space-y-1 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">KES covered</dt>
              <dd className="font-semibold">{KES2(covered)}</dd>
            </div>
            {shortfall > 0 && (
              <div className="flex justify-between gap-3 text-destructive">
                <dt>Still short</dt>
                <dd className="font-semibold">{KES2(shortfall)}</dd>
              </div>
            )}
            {changeKes > 0 && (
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Change (KES)</dt>
                <dd className="font-semibold">{KES2(changeKes)}</dd>
              </div>
            )}
          </dl>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!canConfirm || busy}
            onClick={() => onConfirm({ currency: code, fxRate, foreignAmount })}
          >
            Confirm {code} payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** @deprecated use ForeignCashDialog */
export const UsdCashDialog = ForeignCashDialog;
