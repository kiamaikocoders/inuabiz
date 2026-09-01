/* Firebase Cloud Messaging — classic service worker (required for FCM web push). */
importScripts("https://www.gstatic.com/firebasejs/11.6.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/11.6.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyA55kVnIT_QLMm6J7sFbviC0YCbOtXpqa4",
  authDomain: "my-push-notifications-a8900.firebaseapp.com",
  projectId: "my-push-notifications-a8900",
  storageBucket: "my-push-notifications-a8900.firebasestorage.app",
  messagingSenderId: "1050351448706",
  appId: "1:1050351448706:web:4990a4eaac5a10ba147a9b",
  measurementId: "G-DNL1Y6QKEZ",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const data = payload.data || {};
  const title = payload.notification?.title || data.title || "InuaBiz";
  const body = payload.notification?.body || data.body || "Something happened on your till.";
  const url = data.url || "/app/notifications";
  const tag = data.tag || "inuabiz";

  return self.registration.showNotification(title, {
    body,
    icon: "/pwa/icon-192.png",
    badge: "/pwa/icon-192.png",
    tag,
    data: { url },
    lang: "en-KE",
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = String(event.notification.data?.url || "/app/notifications");
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
