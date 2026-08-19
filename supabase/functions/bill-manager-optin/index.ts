import { handleOptions, jsonResponse, getServiceClient } from "../_shared/cors.ts";
import { billManagerOptIn, resolveSecret } from "../_shared/daraja.ts";

/**
 * Bill Manager opt-in. Uses shortcode 718003 by default.
 * On Safaricom 504, keeps SANDBOX_APP_KEY bypass when DARAJA_MOCK=true.
 */
Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const cronSecret =
      Deno.env.get("CRON_SECRET") ?? (await resolveSecret("CRON_SECRET"));
    const auth = req.headers.get("Authorization") ?? "";
    const headerSecret = req.headers.get("x-cron-secret");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const authorized =
      (cronSecret && headerSecret === cronSecret) ||
      auth === `Bearer ${serviceKey}`;

    if (!authorized) return jsonResponse({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const shortcode = String(
      body.shortcode ??
        (await resolveSecret("DARAJA_BILL_MANAGER_SHORTCODE")) ??
        "718003",
    );
    const email = String(body.email ?? "billing@inuabiz.co.ke");
    const officialContact = String(body.officialContact ?? "0722000000");
    const callbackUrl = String(
      body.callbackUrl ??
        `${Deno.env.get("SUPABASE_URL")}/functions/v1/bill-manager-callback`,
    );

    // Prefer live opt-in unless force_mock
    const forceMock = Boolean(body.force_mock);
    if (forceMock) {
      await getServiceClient().rpc("upsert_app_secret", {
        p_name: "DARAJA_MOCK",
        p_value: "true",
      });
      await getServiceClient().rpc("upsert_app_secret", {
        p_name: "DARAJA_BILL_MANAGER_APP_KEY",
        p_value: "SANDBOX_APP_KEY",
      });
    }

    const result = await billManagerOptIn({
      shortcode,
      email,
      officialContact,
      sendReminders: body.sendReminders ?? "1",
      callbackUrl,
    });

    if (!result.ok && !result.mocked) {
      return jsonResponse({
        ok: false,
        status: result.status,
        bypass_applied: false,
        message:
          "Safaricom Bill Manager opt-in failed. STK and Ratiba remain live. Retry later or use SANDBOX_APP_KEY only after a successful opt-in.",
        request: { shortcode, email, officialContact, callbackUrl },
        response: result.data,
      }, 502);
    }

    const appKey = String(
      result.data.app_key ??
        result.data.appKey ??
        result.data.AppKey ??
        "SANDBOX_APP_KEY",
    );

    const service = getServiceClient();
    await service.rpc("upsert_app_secret", {
      p_name: "DARAJA_BILL_MANAGER_APP_KEY",
      p_value: appKey,
    });

    if (!result.mocked && appKey !== "SANDBOX_APP_KEY") {
      await service.rpc("upsert_app_secret", {
        p_name: "DARAJA_MOCK",
        p_value: "false",
      });
    }

    return jsonResponse({
      ok: true,
      mocked: Boolean(result.mocked),
      app_key: appKey,
      persisted: true,
      response: result.data,
    });
  } catch (err) {
    console.error(err);
    return jsonResponse(
      { error: err instanceof Error ? err.message : "Unexpected error" },
      500,
    );
  }
});
