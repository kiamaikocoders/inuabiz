import { useState } from 'react';
import { SplitPaymentDialog, type SplitPaymentConfig } from './SplitPaymentDialog';

interface PaymentMethodSelectorProps {
  total: number;
  busy?: boolean;
  onMpesaClick?: () => void;
  onCashClick?: () => void;
  onSplitConfirm?: (config: SplitPaymentConfig) => void;
}

/**
 * Enhanced payment method selector that includes split payment option
 * Integrates into the POS payment flow
 */
export function PaymentMethodSelector({
  total,
  busy = false,
  onMpesaClick,
  onCashClick,
  onSplitConfirm,
}: PaymentMethodSelectorProps) {
  const [showSplitDialog, setShowSplitDialog] = useState(false);

  const handleSplitConfirm = (config: SplitPaymentConfig) => {
    setShowSplitDialog(false);
    onSplitConfirm?.(config);
  };

  return (
    <>
      <div className="mt-5 grid gap-2">
        {/* M-Pesa Button */}
        <button
          onClick={onMpesaClick}
          disabled={busy}
          className="w-full rounded-lg bg-green-600 px-4 py-3 font-semibold text-white hover:bg-green-700 disabled:opacity-50"
        >
          M-Pesa
        </button>

        {/* Cash Button */}
        <button
          onClick={onCashClick}
          disabled={busy}
          className="w-full rounded-lg border-2 border-gray-300 px-4 py-3 font-semibold hover:bg-gray-50 disabled:opacity-50"
        >
          Cash
        </button>

        {/* Split Payment Button */}
        <button
          onClick={() => setShowSplitDialog(true)}
          disabled={busy}
          className="w-full rounded-lg border-2 border-dashed border-blue-400 px-4 py-3 font-semibold text-blue-600 hover:bg-blue-50 disabled:opacity-50"
        >
          Split (M-Pesa + Cash)
        </button>
      </div>

      {/* Split Payment Dialog */}
      <SplitPaymentDialog
        open={showSplitDialog}
        onOpenChange={setShowSplitDialog}
        total={total}
        paymentMethod="M-Pesa"
        onConfirm={handleSplitConfirm}
        busy={busy}
      />
    </>
  );
}
