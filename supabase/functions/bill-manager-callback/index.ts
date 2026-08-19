import { getServiceClient, handleOptions, jsonResponse } from "../_shared/cors.ts";

type BillManagerCallback = {
  transactionId?: string;
  trxId?: string;
  mpesaReceipt?: string;
  paidAmount?: string | number;
  amount?: string | number;
  accountReference?: string;
  externalReference?: string;
  phoneNumber?: string;
  fullName?: string;
  invoiceName?: string;
  paymentDate?: string;
  [k: string]: unknown;
};

/**
 * Bill Manager payment / reconciliation callback.
 * Marks matching bill_invoices as PAID and records a payment_transactions row.
 */
Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const payload = (await req.json()) as BillManagerCallback;
    const service = getServiceClient();

    const externalRef = String(
      payload.externalReference ?? payload.accountReference ?? "",
    ).trim();

    if (!externalRef) {
      console.error("Bill Manager callback missing externalReference", payload);
      return jsonResponse({ resCode: "200", resMsg: "Accepted" });
    }

    const { data: invoice } = await service
      .from("bill_invoices")
      .select("*")
      .or(
        `external_reference.eq.${externalRef},account_reference.eq.${externalRef}`,
      )
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!invoice) {
      console.error("No bill_invoice for", externalRef);
      return jsonResponse({ resCode: "200", resMsg: "Accepted" });
    }

    if (invoice.status === "PAID") {
      return jsonResponse({ resCode: "200", resMsg: "Already paid" });
    }

    const paidAmount = Number(payload.paidAmount ?? payload.amount ?? invoice.amount);
    const receipt = String(
      payload.transactionId ?? payload.trxId ?? payload.mpesaReceipt ?? "",
    );

    const invoiceId = `BM-${invoice.external_reference}-${Date.now()}`;
    const { data: tx } = await service
      .from("payment_transactions")
      .insert({
        tenant_id: invoice.tenant_id,
        sale_id: invoice.sale_id,
        purpose: "BILL_INVOICE",
        invoice_id: invoiceId,
        amount: paidAmount,
        currency: "KES",
        payment_channel: "BILL_MANAGER",
        status: "COMPLETE",
        account: payload.phoneNumber ?? invoice.billed_phone,
        api_ref: invoice.external_reference,
        raw_webhook_payload: payload,
      })
      .select("id")
      .single();

    await service
      .from("bill_invoices")
      .update({
        status: "PAID",
        paid_amount: paidAmount,
        paid_at: payload.paymentDate
          ? new Date(payload.paymentDate).toISOString()
          : new Date().toISOString(),
        mpesa_receipt: receipt || null,
        payment_transaction_id: tx?.id ?? null,
        daraja_response: {
          ...(invoice.daraja_response as object ?? {}),
          payment_callback: payload,
        },
      })
      .eq("id", invoice.id);

    // Optional: mark linked sale paid
    if (invoice.sale_id) {
      await service
        .from("sales")
        .update({
          status: "PAID",
          paid_at: new Date().toISOString(),
          payment_channel: "BILL_MANAGER",
        })
        .eq("id", invoice.sale_id)
        .neq("status", "PAID");
    }

    const { data: vendors } = await service
      .from("profiles")
      .select("id")
      .eq("tenant_id", invoice.tenant_id)
      .in("role", ["VENDOR_ADMIN", "VENDOR_STAFF"])
      .eq("is_active", true);

    if (vendors?.length) {
      await service.from("notifications").insert(
        vendors.map((v) => ({
          tenant_id: invoice.tenant_id,
          recipient_id: v.id,
          recipient_role: "VENDOR_ADMIN",
          title: "Bill Manager invoice paid",
          message: `${invoice.invoice_name}: KES ${paidAmount} from ${invoice.billed_full_name}.`,
          type: "PAYMENT",
          priority: "HIGH",
          metadata: {
            bill_invoice_id: invoice.id,
            external_reference: invoice.external_reference,
            receipt,
          },
        })),
      );
    }

    return jsonResponse({ resCode: "200", resMsg: "Success" });
  } catch (err) {
    console.error(err);
    return jsonResponse({ resCode: "200", resMsg: "Accepted" });
  }
});
