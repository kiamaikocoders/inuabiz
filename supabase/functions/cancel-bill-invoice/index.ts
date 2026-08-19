import {
  getServiceClient,
  getUserClient,
  handleOptions,
  jsonResponse,
} from "../_shared/cors.ts";
import { billManagerCancelInvoice } from "../_shared/daraja.ts";

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
    const invoiceId = body.bill_invoice_id as string | undefined;
    const externalReference = body.external_reference as string | undefined;

    if (!invoiceId && !externalReference) {
      return jsonResponse(
        { error: "bill_invoice_id or external_reference required" },
        400,
      );
    }

    const service = getServiceClient();
    const { data: profile } = await service
      .from("profiles")
      .select("tenant_id")
      .eq("id", user.id)
      .single();

    if (!profile?.tenant_id) return jsonResponse({ error: "No tenant" }, 400);

    let q = service
      .from("bill_invoices")
      .select("*")
      .eq("tenant_id", profile.tenant_id);

    if (invoiceId) q = q.eq("id", invoiceId);
    else q = q.eq("external_reference", externalReference!);

    const { data: invoice } = await q.maybeSingle();
    if (!invoice) return jsonResponse({ error: "Invoice not found" }, 404);
    if (invoice.status === "PAID") {
      return jsonResponse({ error: "Cannot cancel a paid invoice" }, 409);
    }
    if (invoice.status === "CANCELLED") {
      return jsonResponse({ ok: true, already_cancelled: true });
    }

    const darajaRes = await billManagerCancelInvoice(invoice.external_reference);

    const { data: updated } = await service
      .from("bill_invoices")
      .update({
        status: "CANCELLED",
        daraja_response: {
          ...(invoice.daraja_response as object ?? {}),
          cancel: darajaRes,
        },
      })
      .eq("id", invoice.id)
      .select("*")
      .single();

    return jsonResponse({ ok: true, invoice: updated });
  } catch (err) {
    console.error(err);
    return jsonResponse(
      { error: err instanceof Error ? err.message : "Unexpected error" },
      500,
    );
  }
});
