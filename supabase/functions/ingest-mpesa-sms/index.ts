import { getServiceClient, handleOptions, jsonResponse } from "../_shared/cors.ts";
import { parseMpesaSms, sha256Hex } from "../_shared/mpesa-sms.ts";

function amountKey(n: number): string {
  return n.toFixed(2);
}

/**
 * Companion APK ingest. Auth is a long-lived device token (not a user JWT).
 * Matches tenant-scoped PENDING_PAYMENT sales by amount, newest first.
 */
Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const token = (req.headers.get("x-companion-token") ?? "").trim();
    if (!token.startsWith("ibc_") || token.length < 20) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const body = await req.json().catch(() => ({}));
    const smsBody = String(body.sms_body ?? body.body ?? "").trim();
    if (!smsBody) return jsonResponse({ error: "sms_body required" }, 400);

    const service = getServiceClient();
    const tokenHash = await sha256Hex(token);
    const { data: device } = await service
      .from("companion_devices")
      .select("id, tenant_id, revoked_at")
      .eq("token_hash", tokenHash)
      .maybeSingle();
    if (!device || device.revoked_at) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    await service
      .from("companion_devices")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("id", device.id);

    const parsed = parseMpesaSms(smsBody);
    if (parsed.kind === "ignored") {
      await service.from("companion_sms_events").insert({
        tenant_id: device.tenant_id,
        device_id: device.id,
        raw_body: smsBody.slice(0, 2000),
        parse_status: "ignored",
      });
      return jsonResponse({ ok: true, ignored: true, reason: parsed.reason });
    }

    const { data: already } = await service
      .from("sales")
      .select("id, status")
      .eq("tenant_id", device.tenant_id)
      .eq("mpesa_receipt_code", parsed.receipt)
      .maybeSingle();
    if (already) {
      await service.from("companion_sms_events").insert({
        tenant_id: device.tenant_id,
        device_id: device.id,
        sale_id: already.id,
        receipt_code: parsed.receipt,
        amount: parsed.amount,
        sender_msisdn: parsed.sender,
        raw_body: smsBody.slice(0, 2000),
        parse_status: "duplicate",
      });
      return jsonResponse({
        ok: true,
        matched: already.status === "PAID",
        duplicate: true,
        sale_id: already.id,
      });
    }

    const { data: pending } = await service
      .from("sales")
      .select("id, total")
      .eq("tenant_id", device.tenant_id)
      .eq("status", "PENDING_PAYMENT")
      .order("created_at", { ascending: false })
      .limit(25);

    const match = (pending ?? []).find((row) => amountKey(Number(row.total)) === amountKey(parsed.amount));
    if (!match) {
      await service.from("companion_sms_events").insert({
        tenant_id: device.tenant_id,
        device_id: device.id,
        receipt_code: parsed.receipt,
        amount: parsed.amount,
        sender_msisdn: parsed.sender,
        raw_body: smsBody.slice(0, 2000),
        parse_status: "unmatched",
      });
      return jsonResponse({ ok: true, matched: false });
    }

    const { data: claimed, error: claimError } = await service
      .from("sales")
      .update({
        status: "PAID",
        paid_at: new Date().toISOString(),
        payment_channel: "MPESA",
        mpesa_receipt_code: parsed.receipt,
      })
      .eq("id", match.id)
      .eq("tenant_id", device.tenant_id)
      .eq("status", "PENDING_PAYMENT")
      .select("id")
      .maybeSingle();

    if (claimError) {
      console.error("claim", claimError);
      return jsonResponse({ error: "Could not confirm sale" }, 500);
    }
    if (!claimed) {
      await service.from("companion_sms_events").insert({
        tenant_id: device.tenant_id,
        device_id: device.id,
        receipt_code: parsed.receipt,
        amount: parsed.amount,
        sender_msisdn: parsed.sender,
        raw_body: smsBody.slice(0, 2000),
        parse_status: "unmatched",
      });
      return jsonResponse({ ok: true, matched: false });
    }

    await service.from("companion_sms_events").insert({
      tenant_id: device.tenant_id,
      device_id: device.id,
      sale_id: claimed.id,
      receipt_code: parsed.receipt,
      amount: parsed.amount,
      sender_msisdn: parsed.sender,
      raw_body: smsBody.slice(0, 2000),
      parse_status: "matched",
    });

    return jsonResponse({ ok: true, matched: true, sale_id: claimed.id });
  } catch (err) {
    console.error(err);
    return jsonResponse(
      { error: err instanceof Error ? err.message : "Unexpected error" },
      500,
    );
  }
});
