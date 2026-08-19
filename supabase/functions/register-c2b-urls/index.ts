import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import {
  darajaRegisterC2bUrls,
  functionsPublicBase,
  resolveSecret,
} from "../_shared/daraja.ts";

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

    const base = functionsPublicBase();
    const result = await darajaRegisterC2bUrls({
      confirmationUrl: `${base}/daraja-c2b-confirmation`,
      validationUrl: `${base}/daraja-c2b-validation`,
    });
    return jsonResponse({ ok: true, result });
  } catch (err) {
    console.error(err);
    return jsonResponse(
      { error: err instanceof Error ? err.message : "Unexpected error" },
      500,
    );
  }
});
