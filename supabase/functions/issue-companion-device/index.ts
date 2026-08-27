import {
  getServiceClient,
  getUserClient,
  handleOptions,
  jsonResponse,
} from "../_shared/cors.ts";
import { sha256Hex } from "../_shared/mpesa-sms.ts";

const MAX_ACTIVE_DEVICES = 3;

function randomToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return `ibc_${[...bytes].map((b) => b.toString(16).padStart(2, "0")).join("")}`;
}

/**
 * Owner-only: create or revoke a companion APK pairing token.
 * The plaintext token is returned once on create.
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
    const action = String(body.action ?? "create").trim().toLowerCase();

    const service = getServiceClient();
    const { data: profile } = await service
      .from("profiles")
      .select("tenant_id, role, active_shop_id")
      .eq("id", user.id)
      .single();
    if (!profile?.tenant_id) return jsonResponse({ error: "Unauthorized" }, 403);
    if (profile.role !== "VENDOR_ADMIN") {
      return jsonResponse({ error: "Only the shop owner can pair a companion phone" }, 403);
    }

    if (action === "revoke") {
      const deviceId = String(body.device_id ?? "").trim();
      if (!deviceId) return jsonResponse({ error: "device_id required" }, 400);
      const { data: updated, error } = await service
        .from("companion_devices")
        .update({ revoked_at: new Date().toISOString() })
        .eq("id", deviceId)
        .eq("tenant_id", profile.tenant_id)
        .is("revoked_at", null)
        .select("id")
        .maybeSingle();
      if (error) return jsonResponse({ error: error.message }, 500);
      if (!updated) return jsonResponse({ error: "Device not found" }, 404);
      return jsonResponse({ ok: true, revoked: true, device_id: updated.id });
    }

    const { count } = await service
      .from("companion_devices")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", profile.tenant_id)
      .is("revoked_at", null);
    if ((count ?? 0) >= MAX_ACTIVE_DEVICES) {
      return jsonResponse(
        { error: `You already have ${MAX_ACTIVE_DEVICES} paired phones. Revoke one first.` },
        409,
      );
    }

    const { data: dest } = await service
      .from("tenant_payment_destinations")
      .select("destination_type, account_number")
      .eq("tenant_id", profile.tenant_id)
      .eq("is_primary", true)
      .maybeSingle();

    const expectedMsisdn =
      dest &&
      (dest.destination_type === "PERSONAL_MPESA" || dest.destination_type === "POCHI")
        ? String(dest.account_number ?? "")
        : null;

    const token = randomToken();
    const tokenHash = await sha256Hex(token);
    const label = String(body.label ?? "Business phone").trim().slice(0, 80) || "Business phone";

    const { data: device, error } = await service
      .from("companion_devices")
      .insert({
        tenant_id: profile.tenant_id,
        shop_id: profile.active_shop_id,
        label,
        token_hash: tokenHash,
        token_prefix: token.slice(0, 12),
        expected_msisdn: expectedMsisdn,
        created_by: user.id,
      })
      .select("id, label, token_prefix, expected_msisdn, created_at")
      .single();
    if (error || !device) {
      return jsonResponse({ error: error?.message ?? "Could not create device" }, 500);
    }

    return jsonResponse({
      ok: true,
      token,
      ingest_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/ingest-mpesa-sms`,
      device,
    });
  } catch (err) {
    console.error(err);
    return jsonResponse(
      { error: err instanceof Error ? err.message : "Unexpected error" },
      500,
    );
  }
});
