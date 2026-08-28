/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute } from "workbox-precaching";
import { clientsClaim } from "workbox-core";

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
};

self.skipWaiting();
clientsClaim();
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

type PushPayload = {
  title?: string;
  body?: string;
  url?: string;
  tag?: string;
};

self.addEventListener("push", (event) => {
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      if (windows.some((client) => "focused" in client && client.focused)) return;

      let payload: PushPayload = {};
      try {
        payload = event.data ? (event.data.json() as PushPayload) : {};
      } catch {
        payload = { body: event.data?.text() };
      }

      await self.registration.showNotification(payload.title || "InuaBiz", {
        body: payload.body || "Something happened on your till.",
        icon: "/pwa/icon-192.png",
        badge: "/pwa/icon-192.png",
        tag: payload.tag || "inuabiz",
        data: { url: payload.url || "/app/notifications" },
        lang: "en-KE",
      });
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = String(
    (event.notification.data as { url?: string } | undefined)?.url || "/app/notifications",
  );
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of windows) {
        if ("focus" in client) {
          await client.focus();
          if ("navigate" in client) await client.navigate(target);
          return;
        }
      }
      await self.clients.openWindow(target);
    })(),
  );
});
