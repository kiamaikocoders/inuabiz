import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertCircle, Plus, Minus } from 'lucide-react';
import { KES2 } from '@/lib/utils';
import { Alert, AlertDescription } from '@/components/ui/alert';

export interface SplitPaymentConfig {
  isSplit: boolean;
  cashAmount: number;
  electronicAmount: number;
}

interface SplitPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  total: number;
  paymentMethod: string;
  onConfirm: (config: SplitPaymentConfig) => void;
  busy?: boolean;
}

export function SplitPaymentDialog({
  open,
  onOpenChange,
  total,
  paymentMethod,
  onConfirm,
  busy = false,
}: SplitPaymentDialogProps) {
  const [isSplit, setIsSplit] = useState(false);
  const [cashAmount, setCashAmount] = useState<number>(0);
  const [error, setError] = useState<string>('');

  const electronicAmount = Math.max(0, total - cashAmount);
  const isValid = isSplit ? cashAmount > 0 && electronicAmount > 0 : true;

  useEffect(() => {
    if (open) {
      setCashAmount(0);
      setError('');
      setIsSplit(false);
    }
  }, [open]);

  const handleCashAmountChange = (value: string) => {
    const num = parseFloat(value) || 0;
    if (num < 0) {
      setError('Cash amount cannot be negative');
      return;
    }
    if (num > total) {
      setError(`Cash amount cannot exceed total (${KES2(total)})`);
      return;
    }
    setCashAmount(num);
    setError('');
  };

  const incrementCash = (amount: number) => {
    const newAmount = cashAmount + amount;
    if (newAmount >= 0 && newAmount <= total) {
      setCashAmount(newAmount);
      setError('');
    }
  };

  const handleConfirm = () => {
    if (!isValid) {
      setError('Invalid split configuration');
      return;
    }
    onConfirm({
      isSplit,
      cashAmount: isSplit ? cashAmount : 0,
      electronicAmount: isSplit ? electronicAmount : total,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-sm">
        <DialogHeader>
          <DialogTitle>Payment Method</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Payment Method Header */}
          <div className="rounded-lg bg-muted/60 p-3">
            <p className="text-xs text-muted-foreground">Total Amount</p>
            <p className="text-2xl font-bold">{KES2(total)}</p>
            <p className="mt-1 text-xs text-muted-foreground">via {paymentMethod}</p>
          </div>

          {/* Split Toggle */}
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isSplit}
                onChange={(e) => {
                  setIsSplit(e.target.checked);
                  setCashAmount(0);
                  setError('');
                }}
                className="w-4 h-4 rounded border-gray-300"
              />
              <span className="text-sm font-medium">
                Split payment (mix {paymentMethod} + Cash)
              </span>
            </label>
          </div>

          {/* Split Payment Config */}
          {isSplit && (
            <div className="space-y-4 border-t pt-4">
              {/* Cash Amount Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Cash Amount</label>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => incrementCash(-100)}
                    disabled={cashAmount <= 0 || busy}
                    className="h-10 w-10 shrink-0"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input
                    type="number"
                    value={cashAmount}
                    onChange={(e) => handleCashAmountChange(e.target.value)}
                    placeholder="0"
                    min="0"
                    max={total}
                    step="10"
                    disabled={busy}
                    className="text-center font-semibold"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => incrementCash(100)}
                    disabled={cashAmount >= total || busy}
                    className="h-10 w-10 shrink-0"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Error Alert */}
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Payment Breakdown */}
              <div className="space-y-2 rounded-lg bg-muted/40 p-3">
                <p className="text-xs font-medium text-muted-foreground">PAYMENT BREAKDOWN</p>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Cash</span>
                    <span className="font-semibold">{KES2(cashAmount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{paymentMethod}</span>
                    <span className="font-semibold">{KES2(electronicAmount)}</span>
                  </div>
                  <div className="border-t pt-1.5 flex justify-between text-sm font-semibold">
                    <span>Total</span>
                    <span className="text-primary">{KES2(total)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex gap-2 pt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={busy}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!isValid || busy}
            className="flex-1"
          >
            {isSplit ? 'Confirm Split' : 'Proceed to Payment'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
