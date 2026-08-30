import { getServiceClient, handleOptions, jsonResponse } from "../_shared/cors.ts";

/**
 * Public product-event ingest (page views, signup/onboarding).
 * No PII — name, path, session hash, small props only. Rate-limited lightly.
 */

const MAX_NAME = 80;
const MAX_PATH = 200;
const MAX_SESSION = 64;
const MAX_PROPS_KEYS = 12;

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const body = (await req.json().catch(() => ({}))) as {
      name?: string;
      path?: string;
      session_hash?: string;
      props?: Record<string, unknown>;
    };

    const name = String(body.name ?? "")
      .trim()
      .slice(0, MAX_NAME)
      .replace(/[^\w.-]/g, "_");
    if (!name || name.length < 2) {
      return jsonResponse({ error: "Invalid event name" }, 400);
    }

    const path =
      typeof body.path === "string" ? body.path.trim().slice(0, MAX_PATH) : null;
    const session_hash =
      typeof body.session_hash === "string"
        ? body.session_hash.trim().slice(0, MAX_SESSION)
        : null;

    const rawProps = body.props && typeof body.props === "object" ? body.props : {};
    const props: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(rawProps).slice(0, MAX_PROPS_KEYS)) {
      const key = k.slice(0, 40);
      if (typeof v === "string") props[key] = v.slice(0, 120);
      else if (typeof v === "number" || typeof v === "boolean") props[key] = v;
      else if (v == null) props[key] = null;
    }

    const service = getServiceClient();
    const { error } = await service.from("product_events").insert({
      name,
      path,
      session_hash,
      props,
    });
    if (error) throw error;

    return jsonResponse({ ok: true });
  } catch (err) {
    console.error(err);
    return jsonResponse({ error: err instanceof Error ? err.message : "Ingest failed" }, 500);
  }
});
