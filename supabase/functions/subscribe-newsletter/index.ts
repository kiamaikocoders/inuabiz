import { getServiceClient, handleOptions, jsonResponse } from "../_shared/cors.ts";
import { dispatchOutbound } from "../_shared/outbound.ts";

/**
 * Public newsletter subscribe (WYA subscribe-newsletter). Stores the address
 * and sends a branded confirmation via Resend.
 */
Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const body = (await req.json().catch(() => ({}))) as { email?: string; source?: string };
    const email = String(body.email ?? "").trim().toLowerCase();
    const source = String(body.source ?? "footer").trim().slice(0, 40) || "footer";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return jsonResponse({ error: "Enter a valid email" }, 400);
    }

    const service = getServiceClient();
    const { error } = await service.from("newsletter_subscribers").upsert(
      {
        email,
        source,
        confirmed: true,
        unsubscribed_at: null,
      },
      { onConflict: "email" },
    );
    if (error) throw error;

    await dispatchOutbound({
      template_id: "newsletter-welcome",
      to: email,
      idempotency_key: `newsletter-welcome/${email}`,
    });

    return jsonResponse({ ok: true, email });
  } catch (err) {
    console.error(err);
    return jsonResponse({ error: err instanceof Error ? err.message : "Could not subscribe" }, 500);
  }
});
