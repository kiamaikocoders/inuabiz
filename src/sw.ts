/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute, matchPrecache } from "workbox-precaching";
import { clientsClaim } from "workbox-core";
import { registerRoute } from "workbox-routing";
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
};

self.skipWaiting();
clientsClaim();
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

/** App shell: try network, then any precached HTML document (SSR / Start has no index.html). */
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.mode !== "navigate") return;
  event.respondWith(
    (async () => {
      try {
        const fresh = await fetch(request);
        if (fresh.ok) return fresh;
      } catch {
        /* offline */
      }
      const cached =
        (await matchPrecache("/")) ||
        (await matchPrecache("/index.html")) ||
        (await caches.match(request)) ||
        (await caches.match("/"));
      if (cached) return cached;
      return new Response("InuaBiz is offline. Open the app once while online to cache the till.", {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    })(),
  );
});

registerRoute(
  ({ request, url }) =>
    request.destination === "font" ||
    (url.pathname.includes("/files/") && url.pathname.endsWith(".woff2")) ||
    url.hostname === "fonts.googleapis.com" ||
    url.hostname === "fonts.gstatic.com",
  new CacheFirst({
    cacheName: "inuabiz-fonts",
    plugins: [new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 })],
  }),
);

registerRoute(
  ({ request, url }) =>
    request.destination === "image" || url.pathname.includes("/storage/v1/object/public/"),
  new StaleWhileRevalidate({
    cacheName: "inuabiz-images",
    plugins: [new ExpirationPlugin({ maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 * 30 })],
  }),
);

registerRoute(
  ({ url }) => url.pathname.endsWith(".webmanifest") || url.pathname.includes("manifest"),
  new NetworkFirst({
    cacheName: "inuabiz-manifest",
    networkTimeoutSeconds: 3,
  }),
);

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

/** Firebase Cloud Messaging — background alerts when the till PWA is closed. */
try {
  importScripts("https://www.gstatic.com/firebasejs/11.6.0/firebase-app-compat.js");
  importScripts("https://www.gstatic.com/firebasejs/11.6.0/firebase-messaging-compat.js");
  const firebaseGlobal = self as unknown as {
    firebase: {
      initializeApp: (config: Record<string, string>) => void;
      messaging: () => {
        onBackgroundMessage: (
          handler: (payload: {
            notification?: { title?: string; body?: string };
            data?: Record<string, string>;
          }) => void,
        ) => void;
      };
    };
  };
  firebaseGlobal.firebase.initializeApp({
    apiKey: "AIzaSyA55kVnIT_QLMm6J7sFbviC0YCbOtXpqa4",
    authDomain: "my-push-notifications-a8900.firebaseapp.com",
    projectId: "my-push-notifications-a8900",
    storageBucket: "my-push-notifications-a8900.firebasestorage.app",
    messagingSenderId: "1050351448706",
    appId: "1:1050351448706:web:4990a4eaac5a10ba147a9b",
    measurementId: "G-DNL1Y6QKEZ",
  });
  firebaseGlobal.firebase.messaging().onBackgroundMessage((payload) => {
    const data = payload.data || {};
    const title = payload.notification?.title || data["title"] || "InuaBiz";
    const body = payload.notification?.body || data["body"] || "Something happened on your till.";
    const url = data["url"] || "/app/notifications";
    const tag = data["tag"] || "inuabiz";
    return self.registration.showNotification(title, {
      body,
      icon: "/pwa/icon-192.png",
      badge: "/pwa/icon-192.png",
      tag,
      data: { url },
      lang: "en-KE",
    });
  });
} catch (err) {
  console.warn("FCM service worker setup skipped", err);
}
