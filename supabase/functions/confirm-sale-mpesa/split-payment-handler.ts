import { createClient } from '@supabase/supabase-js';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

/**
 * Confirms M-Pesa payment and checks if all split payment components are satisfied.
 * If all components are paid, marks the sale as PAID.
 */
export async function confirmSaleMpesaWithSplitHandling(
  saleId: string,
  receiptCode: string,
  payerName: string
) {
  try {
    // Get the sale
    const { data: sale, error: saleError } = await supabase
      .from('sales')
      .select('*, has_split_payment')
      .eq('id', saleId)
      .single();

    if (saleError || !sale) {
      throw new Error('Sale not found');
    }

    // Update M-Pesa payment entry
    const { error: updatePaymentError } = await supabase
      .from('sale_payments')
      .update({
        status: 'COMPLETE',
        receipt_code: receiptCode,
        payer_name: payerName,
        paid_at: new Date().toISOString(),
      })
      .eq('sale_id', saleId)
      .eq('payment_channel', 'MPESA');

    if (updatePaymentError) {
      console.error('Error updating M-Pesa payment:', updatePaymentError);
    }

    // If split payment, check if all components are satisfied
    if (sale.has_split_payment) {
      const { data: payments, error: paymentsError } = await supabase
        .from('sale_payments')
        .select('status')
        .eq('sale_id', saleId);

      if (paymentsError || !payments) {
        throw new Error('Failed to fetch split payments');
      }

      // Check if all payments are COMPLETE
      const allComplete = payments.every((p: any) => p.status === 'COMPLETE');

      if (allComplete) {
        // Mark sale as PAID
        const { error: saleUpdateError } = await supabase
          .from('sales')
          .update({
            status: 'PAID',
            paid_at: new Date().toISOString(),
          })
          .eq('id', saleId);

        if (saleUpdateError) {
          console.error('Error marking sale as PAID:', saleUpdateError);
        }
      }
    } else {
      // Non-split payment: mark as PAID immediately
      const { error: saleUpdateError } = await supabase
        .from('sales')
        .update({
          status: 'PAID',
          paid_at: new Date().toISOString(),
          mpesa_receipt_code: receiptCode,
          mpesa_payer_name: payerName,
        })
        .eq('id', saleId);

      if (saleUpdateError) {
        console.error('Error marking sale as PAID:', saleUpdateError);
      }
    }

    return { success: true, saleId };
  } catch (error) {
    console.error('Split payment confirmation error:', error);
    throw error;
  }
}
