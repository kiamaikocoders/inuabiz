import * as webpush from "jsr:@negrel/webpush@0.5.0";
import { getServiceClient, getUserClient, handleOptions, jsonResponse } from "../_shared/cors.ts";
import { resolveSecret } from "../_shared/daraja.ts";
import { vapidUrlKeysToJwk } from "../_shared/webpush.ts";

type Body = {
  recipient_id?: string;
  notification_id?: string;
  title?: string;
  body?: string;
  url?: string;
  tag?: string;
  test?: boolean;
};

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const service = getServiceClient();
    const body = (await req.json().catch(() => ({}))) as Body;
    const authHeader = req.headers.get("Authorization") ?? "";
    const cronSecret = Deno.env.get("CRON_SECRET") ?? (await resolveSecret("CRON_SECRET"));
    const headerSecret = req.headers.get("x-cron-secret");
    const isCron = Boolean(cronSecret && headerSecret === cronSecret);
    const isService = isServiceRoleRequest(authHeader) || isCron;

    let callerId: string | null = null;
    if (!isService) {
      const userClient = getUserClient(authHeader);
      const {
        data: { user },
      } = await userClient.auth.getUser();
      if (!user) return jsonResponse({ error: "Unauthorized" }, 401);
      callerId = user.id;
    }

    const recipientId = body.test ? callerId : body.recipient_id;
    if (!recipientId) return jsonResponse({ error: "recipient_id required" }, 400);
    if (!isService && recipientId !== callerId) return jsonResponse({ error: "Forbidden" }, 403);

    const publicKey =
      (await resolveSecret("VAPID_PUBLIC_KEY")) ??
      (await platformSetting(service, "push.vapid_public"));
    const privateKey = await resolveSecret("VAPID_PRIVATE_KEY");
    if (!publicKey || !privateKey) {
      return jsonResponse({ ok: true, skipped: ["vapid_unset"] });
    }

    const vapidKeys = await webpush.importVapidKeys(
      vapidUrlKeysToJwk(publicKey, privateKey),
      { extractable: true },
    );
    const appServer = await webpush.ApplicationServer.new({
      contactInformation: "mailto:hello@inuabiz.co.ke",
      vapidKeys,
    });

    const { data: subs } = await service
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("profile_id", recipientId);

    if (!subs?.length) return jsonResponse({ ok: true, sent: 0 });

    const title = body.test ? "InuaBiz is watching this till" : (body.title ?? "InuaBiz");
    const text = body.test
      ? "Device notifications are on. You'll hear about sales even when the app is closed."
      : (body.body ?? "");
    const payload = JSON.stringify({
      title,
      body: text,
      url: body.url ?? (body.test ? "/app/notifications" : "/app/notifications"),
      tag: body.tag ?? "inuabiz",
    });

    let sent = 0;
    const gone: string[] = [];
    for (const row of subs) {
      try {
        const subscriber = appServer.subscribe({
          endpoint: row.endpoint as string,
          keys: { p256dh: row.p256dh as string, auth: row.auth as string },
        });
        await subscriber.pushTextMessage(payload, { ttl: 60 * 60 });
        sent += 1;
      } catch (err) {
        const goneErr =
          err &&
          typeof err === "object" &&
          "isGone" in err &&
          typeof (err as { isGone?: () => boolean }).isGone === "function" &&
          (err as { isGone: () => boolean }).isGone();
        const msg = err instanceof Error ? err.message : String(err);
        if (goneErr || /410|404|unsubscribed|gone/i.test(msg)) gone.push(row.id as string);
        else console.error("dispatch-push failed", row.endpoint, msg);
      }
    }

    if (gone.length) {
      await service.from("push_subscriptions").delete().in("id", gone);
    }

    return jsonResponse({ ok: true, sent, dropped: gone.length, notification_id: body.notification_id });
  } catch (err) {
    console.error(err);
    return jsonResponse({ error: err instanceof Error ? err.message : "Unexpected error" }, 500);
  }
});

function isServiceRoleRequest(authHeader: string): boolean {
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return false;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (serviceKey && token === serviceKey) return true;
  const parts = token.split(".");
  if (parts.length < 2) return false;
  try {
    const payload = JSON.parse(
      atob(parts[1].replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (parts[1].length % 4)) % 4)),
    );
    return payload.role === "service_role";
  } catch {
    return false;
  }
}

async function platformSetting(
  service: ReturnType<typeof getServiceClient>,
  key: string,
): Promise<string | null> {
  const { data } = await service.from("platform_settings").select("value").eq("key", key).maybeSingle();
  const value = data?.value;
  if (typeof value === "string") return value.replace(/^"|"$/g, "") || null;
  return null;
}
