import {
  getServiceClient,
  getUserClient,
  handleOptions,
  jsonResponse,
  toKenyaMsisdn,
} from "../_shared/cors.ts";
import { billManagerSingleInvoice } from "../_shared/daraja.ts";

/**
 * Push a formal invoice into the buyer's M-Pesa Bill Manager menu.
 */
Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Unauthorized" }, 401);

    const userClient = getUserClient(authHeader);
    const {
      data: { user },
    } = await userClient.auth.getUser();
    if (!user) return jsonResponse({ error: "Unauthorized" }, 401);

    const body = await req.json();
    const service = getServiceClient();

    const { data: profile } = await service
      .from("profiles")
      .select("id, tenant_id")
      .eq("id", user.id)
      .single();

    if (!profile?.tenant_id) {
      return jsonResponse({ error: "Complete onboarding first" }, 400);
    }

    const { data: locked } = await service.rpc("tenant_is_write_locked", {
      p_tenant_id: profile.tenant_id,
    });
    if (locked) {
      return jsonResponse({ error: "Account locked — renew subscription" }, 402);
    }

    const amount = Number(body.amount);
    const billedPhone = toKenyaMsisdn(String(body.billed_phone ?? body.phone ?? ""));
    const billedFullName = String(body.billed_full_name ?? body.name ?? "Customer").trim();
    const invoiceName = String(body.invoice_name ?? "Invoice").trim();
    const billedPeriod = String(
      body.billed_period ??
        new Date().toLocaleString("en-KE", { month: "long", year: "numeric" }),
    );
    const dueDateRaw = body.due_date
      ? new Date(body.due_date)
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    if (!(amount > 0)) return jsonResponse({ error: "amount must be > 0" }, 400);
    if (!billedFullName) return jsonResponse({ error: "billed_full_name required" }, 400);

    const externalReference =
      String(body.external_reference ?? "").trim() ||
      `INV-${profile.tenant_id.slice(0, 8)}-${Date.now()}`;

    const accountReference = String(
      body.account_reference ?? externalReference,
    ).slice(0, 20);

    const invoiceItems = Array.isArray(body.invoice_items)
      ? body.invoice_items.map((i: { item_name?: string; itemName?: string; amount: number }) => ({
          itemName: String(i.item_name ?? i.itemName ?? "Item"),
          amount: Number(i.amount),
        }))
      : undefined;

    // Daraja dueDate formats vary; send YYYY-MM-DD HH:mm:ss.00 style
    const dueDateStr = `${dueDateRaw.toISOString().slice(0, 10)} 00:00:00.00`;

    const { data: row, error: insertErr } = await service
      .from("bill_invoices")
      .insert({
        tenant_id: profile.tenant_id,
        customer_id: body.customer_id ?? null,
        sale_id: body.sale_id ?? null,
        external_reference: externalReference,
        invoice_name: invoiceName,
        billed_full_name: billedFullName,
        billed_phone: billedPhone,
        billed_period: billedPeriod,
        account_reference: accountReference,
        amount,
        due_date: dueDateRaw.toISOString(),
        status: "DRAFT",
        invoice_items: invoiceItems ?? null,
        created_by: user.id,
      })
      .select("*")
      .single();

    if (insertErr) {
      console.error(insertErr);
      return jsonResponse({ error: insertErr.message }, 400);
    }

    const darajaRes = await billManagerSingleInvoice({
      externalReference,
      billedFullName,
      billedPhoneNumber: billedPhone.startsWith("254")
        ? `0${billedPhone.slice(3)}`
        : billedPhone,
      billedPeriod,
      invoiceName,
      dueDate: dueDateStr,
      accountReference,
      amount,
      invoiceItems,
    });

    const { data: updated, error: updErr } = await service
      .from("bill_invoices")
      .update({
        status: "SENT",
        daraja_response: darajaRes,
      })
      .eq("id", row.id)
      .select("*")
      .single();

    if (updErr) throw updErr;

    return jsonResponse({
      ok: true,
      invoice: updated,
      message: "Invoice pushed to customer M-Pesa Bill Manager menu.",
    });
  } catch (err) {
    console.error(err);
    return jsonResponse(
      { error: err instanceof Error ? err.message : "Unexpected error" },
      500,
    );
  }
});
