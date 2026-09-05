import { createClient } from '@supabase/supabase-js';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

function paymentChannelFor(channel: string): 'MPESA' | 'CASH' | 'CREDIT' | null {
  if (channel === 'MPESA') return 'MPESA';
  if (channel === 'CASH' || channel === 'USD_CASH' || channel === 'FOREIGN_CASH') return 'CASH';
  if (channel === 'CREDIT') return 'CREDIT';
  return null;
}

function statusFor(channel: string): 'PAID' | 'CREDIT' | 'PENDING_PAYMENT' | 'DRAFT' {
  if (channel === 'CASH' || channel === 'USD_CASH' || channel === 'FOREIGN_CASH') return 'PAID';
  if (channel === 'CREDIT') return 'CREDIT';
  if (channel === 'MPESA') return 'PENDING_PAYMENT';
  return 'DRAFT';
}

export async function handleCheckoutSale(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
      items,
      discount_amount,
      channel,
      sale_id: parked_sale_id,
      split_payment,
    } = body;

    if (!Array.isArray(items) || !channel) {
      return new Response(
        JSON.stringify({ ok: false, message: 'Missing items or channel' }),
        { status: 400, headers: corsHeaders }
      );
    }

    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return new Response(JSON.stringify({ ok: false, message: 'Unauthorized' }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ ok: false, message: 'Invalid token' }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const userId = userData.user.id;

    // Get tenant context
    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', userId)
      .maybeSingle();

    if (!profile?.tenant_id) {
      return new Response(JSON.stringify({ ok: false, message: 'No tenant context' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const tenantId = profile.tenant_id;

    // Get products to calculate total
    const productIds = items.map((i: any) => i.product_id);
    const { data: products } = await supabase
      .from('products')
      .select('id, selling_price')
      .in('id', productIds);

    const productMap = new Map(products?.map((p: any) => [p.id, p.selling_price]) || []);
    const subtotal = items.reduce(
      (sum: number, item: any) => sum + (productMap.get(item.product_id) || 0) * item.qty,
      0
    );

    const total = Math.max(0, subtotal - (discount_amount || 0));

    // Begin transaction
    let saleId = parked_sale_id;
    let isNewSale = !parked_sale_id;

    if (isNewSale) {
      // Create new sale
      const { data: newSale, error: saleError } = await supabase
        .from('sales')
        .insert([
          {
            tenant_id: tenantId,
            subtotal,
            discount_amount: discount_amount || 0,
            total,
            payment_channel: paymentChannelFor(channel) || 'CASH',
            status: statusFor(channel),
            created_by: userId,
            has_split_payment: !!split_payment?.isSplit,
          },
        ])
        .select()
        .single();

      if (saleError || !newSale) {
        return new Response(
          JSON.stringify({ ok: false, message: 'Failed to create sale' }),
          { status: 500, headers: corsHeaders }
        );
      }

      saleId = newSale.id;
    } else {
      // Update existing parked sale
      const { error: updateError } = await supabase
        .from('sales')
        .update({
          subtotal,
          discount_amount: discount_amount || 0,
          total,
          payment_channel: paymentChannelFor(channel) || 'CASH',
          status: statusFor(channel),
          has_split_payment: !!split_payment?.isSplit,
          updated_at: new Date().toISOString(),
        })
        .eq('id', saleId);

      if (updateError) {
        return new Response(
          JSON.stringify({ ok: false, message: 'Failed to update sale' }),
          { status: 500, headers: corsHeaders }
        );
      }
    }

    // Add sale items
    const saleItems = items.map((item: any) => ({
      tenant_id: tenantId,
      sale_id: saleId,
      product_id: item.product_id,
      product_name: products?.find((p: any) => p.id === item.product_id)?.name || 'Unknown',
      unit_price: productMap.get(item.product_id) || 0,
      cost_price: 0,
      qty: item.qty,
      line_total: (productMap.get(item.product_id) || 0) * item.qty,
    }));

    if (isNewSale && saleItems.length > 0) {
      const { error: itemsError } = await supabase
        .from('sale_items')
        .insert(saleItems);

      if (itemsError) {
        return new Response(
          JSON.stringify({ ok: false, message: 'Failed to add sale items' }),
          { status: 500, headers: corsHeaders }
        );
      }
    }

    // Handle split payment
    if (split_payment?.isSplit) {
      const { cash_amount, electronic_amount } = split_payment;

      // Create cash payment entry
      if (cash_amount > 0) {
        const { error: cashError } = await supabase
          .from('sale_payments')
          .insert([
            {
              tenant_id: tenantId,
              sale_id: saleId,
              payment_channel: 'CASH',
              amount: cash_amount,
              status: 'COMPLETE',
              paid_at: new Date().toISOString(),
            },
          ]);

        if (cashError) {
          console.error('Failed to create cash payment:', cashError);
        }
      }

      // Create electronic payment entry (MPESA, etc.)
      if (electronic_amount > 0) {
        const { error: elecError } = await supabase
          .from('sale_payments')
          .insert([
            {
              tenant_id: tenantId,
              sale_id: saleId,
              payment_channel: paymentChannelFor(channel) || 'CASH',
              amount: electronic_amount,
              status: 'PENDING',
            },
          ]);

        if (elecError) {
          console.error('Failed to create electronic payment:', elecError);
        }
      }
    }

    // Get payment destination
    const { data: destinations } = await supabase
      .from('tenant_payment_destinations')
      .select()
      .eq('tenant_id', tenantId);

    const primary = destinations?.find((d: any) => d.is_primary);

    return new Response(
      JSON.stringify({
        ok: true,
        sale: { id: saleId, total },
        payment_destination: primary || null,
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error('Checkout error:', error);
    return new Response(
      JSON.stringify({ ok: false, message: 'Internal server error' }),
      { status: 500, headers: corsHeaders }
    );
  }
}

Deno.serve(handleCheckoutSale);
