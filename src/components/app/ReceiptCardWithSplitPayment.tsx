import { useEffect, useState } from 'react';
import { Store } from 'lucide-react';
import { KES, KES2 } from '@/lib/utils';
import type { Sale } from '@/lib/data';

function paymentMethodLabel(channel: string): string {
  const c = channel.toLowerCase();
  if (
    c.includes('mpesa') ||
    c.includes('personal') ||
    c.includes('pochi') ||
    c.includes('till') ||
    c.includes('paybill') ||
    c.includes('payhero')
  ) {
    return 'M-Pesa';
  }
  if (c.includes('usd')) return 'USD cash';
  if (/\b[a-z]{3}\s+cash\b/.test(c) || c.endsWith(' cash')) {
    return channel.replace(/_/g, ' ');
  }
  if (c.includes('cash')) return 'Cash';
  if (c.includes('credit')) return 'Credit';
  return channel.replace(/_/g, ' ');
}

interface SalePayment {
  id: string;
  payment_channel: string;
  amount: number;
  status: string;
  receipt_code?: string;
  payer_name?: string;
  paid_at?: string;
}

interface ReceiptCardProps {
  sale: Sale;
  splitPayments?: SalePayment[];
  logoUrl?: string;
  onPrint?: () => void;
}

export function ReceiptCard({
  sale,
  splitPayments = [],
  logoUrl,
  onPrint,
}: ReceiptCardProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) return null;

  const now = new Date();
  const payLabel = paymentMethodLabel(sale.payment_channel || 'CASH');
  const mpesa = payLabel === 'M-Pesa';
  const paid = sale.status !== 'PENDING_PAYMENT' && sale.status !== 'FAILED';

  // Determine if this is a split payment
  const hasSplitPayment = sale.has_split_payment && splitPayments.length > 0;

  return (
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
        <p className="mt-3 text-sm font-semibold">{sale.shop_name || 'InuaBiz'}</p>
        <p className="text-muted-foreground mt-1 text-xs">Kasarani, Nairobi</p>
      </div>

      <div className="space-y-3 px-5 py-4 text-sm">
        {/* Sale Reference */}
        <div className="flex items-center justify-between border-b pb-3">
          <span className="text-muted-foreground">Sale Ref</span>
          <span className="font-semibold">{sale.ref || 'SL-' + sale.id?.slice(0, 8)}</span>
        </div>

        {/* Sale Items */}
        <div className="space-y-2 border-b pb-3">
          {sale.lines?.map((line, i) => (
            <div key={i} className="flex justify-between text-xs">
              <div>
                <p className="font-medium">{line.name}</p>
                <p className="text-muted-foreground">
                  {line.qty} × {KES(line.price)}
                </p>
              </div>
              <p className="font-semibold">{KES2(line.qty * line.price)}</p>
            </div>
          ))}
        </div>

        {/* Subtotal & Discount */}
        <div className="space-y-1 border-b pb-3 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{KES2(sale.subtotal || 0)}</span>
          </div>
          {sale.discount && sale.discount > 0 && (
            <div className="flex justify-between text-amber-600">
              <span>Discount</span>
              <span>-{KES2(sale.discount)}</span>
            </div>
          )}
        </div>

        {/* Payment Methods - Split or Single */}
        {hasSplitPayment ? (
          <div className="space-y-1 border-b pb-3 text-xs">
            <p className="font-medium text-muted-foreground mb-2">PAYMENT METHODS</p>
            {splitPayments.map((payment) => (
              <div key={payment.id} className="flex justify-between">
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium">{paymentMethodLabel(payment.payment_channel)}</span>
                  <span className="text-muted-foreground text-[10px]">
                    {payment.status === 'COMPLETE' ? '✓ Confirmed' : 'Pending'}
                  </span>
                </div>
                <span className="font-semibold">{KES2(payment.amount)}</span>
              </div>
            ))}
          </div>
        ) : mpesa && sale.mpesa_receipt ? (
          <div className="space-y-1 border-b pb-3 text-xs">
            <span className="text-muted-foreground">M-Pesa Receipt</span>
            <p className="font-semibold text-sm">{sale.mpesa_receipt}</p>
            {sale.mpesa_payer_name && (
              <p className="text-muted-foreground text-[10px]">{sale.mpesa_payer_name}</p>
            )}
          </div>
        ) : null}

        {/* Total */}
        <div className="flex justify-between border-t pt-3">
          <span className="font-semibold">Total</span>
          <span className="font-display text-lg font-bold">{KES2(sale.total)}</span>
        </div>

        {/* Payment Status */}
        <div className="rounded-lg bg-muted/60 p-2 text-center text-xs">
          {paid ? (
            <span className="font-semibold text-green-600">✓ PAID</span>
          ) : (
            <span className="font-semibold text-amber-600">⧗ PENDING PAYMENT</span>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t bg-muted/30 px-5 py-3 text-center text-xs text-muted-foreground">
        <p>Asante sana! Karibu tena.</p>
        <p className="mt-1">{now.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })} EAT</p>
      </div>

      {/* Print Button */}
      {onPrint && paid && (
        <div className="border-t px-5 py-3">
          <button
            onClick={onPrint}
            className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Print Receipt
          </button>
        </div>
      )}
    </article>
  );
}
