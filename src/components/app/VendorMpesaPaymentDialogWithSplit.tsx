import { useEffect, useState } from 'react';
import { SplitPaymentDialog, type SplitPaymentConfig } from './SplitPaymentDialog';
import type { Sale } from '@/lib/data';

interface VendorMpesaPaymentDialogWithSplitProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  total: number;
  saleRef: string;
  destination?: any;
  busy?: boolean;
  onConfirmSplit?: (config: SplitPaymentConfig) => void;
  onConfirmManual?: () => void;
  children?: React.ReactNode;
}

/**
 * Enhanced payment dialog that integrates split payment selection
 * with the existing M-Pesa payment flow
 */
export function VendorMpesaPaymentDialogWithSplit({
  open,
  onOpenChange,
  total,
  saleRef,
  destination,
  busy,
  onConfirmSplit,
  onConfirmManual,
  children,
}: VendorMpesaPaymentDialogWithSplitProps) {
  const [showSplitDialog, setShowSplitDialog] = useState(false);
  const [splitConfig, setSplitConfig] = useState<SplitPaymentConfig | null>(null);

  const handleSplitConfirm = (config: SplitPaymentConfig) => {
    setSplitConfig(config);
    setShowSplitDialog(false);
    onConfirmSplit?.(config);
  };

  return (
    <>
      {/* Main payment dialog */}
      {children && open && (
        <div>
          {/* Original payment dialog content goes here */}
          {children}
          
          {/* Split payment option button */}
          <div className="mt-4 border-t pt-4">
            <button
              onClick={() => setShowSplitDialog(true)}
              disabled={busy}
              className="w-full rounded-lg border-2 border-dashed border-primary px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/5 disabled:opacity-50"
            >
              Split Payment (Cash + M-Pesa)
            </button>
          </div>
        </div>
      )}

      {/* Split payment dialog */}
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
