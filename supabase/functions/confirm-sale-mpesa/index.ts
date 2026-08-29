import {
  getServiceClient,
  getUserClient,
  handleOptions,
  jsonResponse,
} from "../_shared/cors.ts";

/**
 * Manual M-Pesa confirmation code. Works for personal, Pochi, till, and paybill.
 * Companion SMS and Daraja C2B also close PENDING_PAYMENT sales.
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

    const body = await req.json().catch(() => ({}));
    const saleId = String(body.sale_id ?? "").trim();
    const receipt = String(body.mpesa_receipt_code ?? "")
      .trim()
      .toUpperCase();
    if (!saleId || !receipt) {
      return jsonResponse({ error: "sale_id and mpesa_receipt_code required" }, 400);
    }
    if (!/^[A-Z0-9]{8,12}$/.test(receipt)) {
      return jsonResponse({ error: "Enter a valid M-Pesa confirmation code" }, 400);
    }

    const service = getServiceClient();
    const { data: profile } = await service
      .from("profiles")
      .select("tenant_id")
      .eq("id", user.id)
      .single();
    if (!profile?.tenant_id) return jsonResponse({ error: "Unauthorized" }, 403);

    const { data: sale } = await service
      .from("sales")
      .select("id, tenant_id, status, total")
      .eq("id", saleId)
      .eq("tenant_id", profile.tenant_id)
      .maybeSingle();
    if (!sale) return jsonResponse({ error: "Sale not found" }, 404);
    if (sale.status === "PAID") return jsonResponse({ ok: true, already_paid: true });
    if (sale.status !== "PENDING_PAYMENT") {
      return jsonResponse({ error: "Sale is not awaiting M-Pesa payment" }, 409);
    }

    const { data: dup } = await service
      .from("sales")
      .select("id")
      .eq("tenant_id", profile.tenant_id)
      .eq("mpesa_receipt_code", receipt)
      .neq("id", saleId)
      .maybeSingle();
    if (dup) {
      return jsonResponse({ error: "This M-Pesa code was already used on another sale" }, 409);
    }

    await service
      .from("sales")
      .update({
        status: "PAID",
        paid_at: new Date().toISOString(),
        payment_channel: "MPESA",
        mpesa_receipt_code: receipt,
      })
      .eq("id", saleId);

    return jsonResponse({
      ok: true,
      sale_id: saleId,
      message: "Payment confirmed manually.",
    });
  } catch (err) {
    console.error(err);
    return jsonResponse(
      { error: err instanceof Error ? err.message : "Unexpected error" },
      500,
    );
  }
});
