import { getServiceClient, handleOptions, jsonResponse } from "../_shared/cors.ts";
import { parseMpesaSms, sha256Hex, type ParsedMpesaSms } from "../_shared/mpesa-sms.ts";

function amountKey(n: number): string {
  return n.toFixed(2);
}

function partyFields(parsed: Extract<ParsedMpesaSms, { kind: "received" }>) {
  return {
    receipt_code: parsed.receipt,
    amount: parsed.amount,
    sender_msisdn: parsed.sender,
    sender_name: parsed.senderName,
  };
}

/**
 * Companion APK ingest. Auth is a long-lived device token (not a user JWT).
 * Matches a PENDING_PAYMENT sale by amount when that amount is unique.
 * If two open sales share the amount, leave unmatched so the till picks the ticket.
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
      .select("id, status, customer_phone, mpesa_payer_name")
      .eq("tenant_id", device.tenant_id)
      .eq("mpesa_receipt_code", parsed.receipt)
      .maybeSingle();
    if (already) {
      if (parsed.senderName && !already.mpesa_payer_name) {
        await service
          .from("sales")
          .update({ mpesa_payer_name: parsed.senderName })
          .eq("id", already.id);
      }
      await service.from("companion_sms_events").insert({
        tenant_id: device.tenant_id,
        device_id: device.id,
        sale_id: already.id,
        raw_body: smsBody.slice(0, 2000),
        parse_status: "duplicate",
        ...partyFields(parsed),
      });
      return jsonResponse({
        ok: true,
        matched: already.status === "PAID",
        duplicate: true,
        sale_id: already.id,
        payer_name: parsed.senderName,
      });
    }

    const { data: pending } = await service
      .from("sales")
      .select("id, total, customer_phone")
      .eq("tenant_id", device.tenant_id)
      .eq("status", "PENDING_PAYMENT")
      .order("created_at", { ascending: false })
      .limit(25);

    const matches = (pending ?? []).filter(
      (row) => amountKey(Number(row.total)) === amountKey(parsed.amount),
    );
    if (matches.length !== 1) {
      await service.from("companion_sms_events").insert({
        tenant_id: device.tenant_id,
        device_id: device.id,
        raw_body: smsBody.slice(0, 2000),
        parse_status: "unmatched",
        ...partyFields(parsed),
      });
      return jsonResponse({
        ok: true,
        matched: false,
        ambiguous: matches.length > 1,
        payer_name: parsed.senderName,
        receipt: parsed.receipt,
      });
    }
    const match = matches[0]!;

    const patch: Record<string, unknown> = {
      status: "PAID",
      paid_at: new Date().toISOString(),
      payment_channel: "MPESA",
      mpesa_receipt_code: parsed.receipt,
    };
    if (parsed.senderName) patch.mpesa_payer_name = parsed.senderName;
    if (parsed.sender && !match.customer_phone) patch.customer_phone = parsed.sender;

    const { data: claimed, error: claimError } = await service
      .from("sales")
      .update(patch)
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
        raw_body: smsBody.slice(0, 2000),
        parse_status: "unmatched",
        ...partyFields(parsed),
      });
      return jsonResponse({ ok: true, matched: false });
    }

    if (parsed.senderName) {
      await service
        .from("invoices")
        .update({ customer_name: parsed.senderName })
        .eq("sale_id", claimed.id)
        .in("customer_name", ["Walk-in Customer", "Walk-in"]);
    }

    await service.from("companion_sms_events").insert({
      tenant_id: device.tenant_id,
      device_id: device.id,
      sale_id: claimed.id,
      raw_body: smsBody.slice(0, 2000),
      parse_status: "matched",
      ...partyFields(parsed),
    });

    return jsonResponse({
      ok: true,
      matched: true,
      sale_id: claimed.id,
      receipt: parsed.receipt,
      payer_name: parsed.senderName,
    });
  } catch (err) {
    console.error(err);
    return jsonResponse(
      { error: err instanceof Error ? err.message : "Unexpected error" },
      500,
    );
  }
});
