const CACHE_NAME = "modular-tech-v2";
const FILES_TO_CACHE = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./sw.js",
  "./icon-192.png"
];
/* =====================================================
   INSTALL
===================================================== */
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(FILES_TO_CACHE);
    })
  );
  self.skipWaiting();
});
/* =====================================================
   ACTIVATE
===================================================== */
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});
/* =====================================================
   FETCH
===================================================== */
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") {
    return;
  }
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (
          response &&
          response.status === 200 &&
          response.type === "basic"
        ) {
          const copy = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, copy);
            });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
/* =====================================================
   PUSH NOTIFICATION
===================================================== */
self.addEventListener("push", event => {
  let data = {
    title: "MODULAR TECH",
    body: "لديك إشعار جديد",
    icon: "./icon-192.png",
    badge: "./icon-192.png",
    url: "./"
  };
  try {
    if (event.data) {
      const incoming = event.data.json();
      data = {
        ...data,
        ...incoming
      };
    }
  } catch (error) {
    console.warn(
      "Push data error:",
      error
    );
  }
  const options = {
    body: data.body,
    icon: data.icon || "./icon-192.png",
    badge: data.badge || "./icon-192.png",
    tag: data.tag || "modular-tech",
    renotify: true,
    requireInteraction: false,
    data: {
      url: data.url || "./"
    }
  };
  event.waitUntil(
    self.registration.showNotification(
      data.title || "MODULAR TECH",
      options
    )
  );
});
/* =====================================================
   NOTIFICATION CLICK
===================================================== */
self.addEventListener(
  "notificationclick",
  event => {
    event.notification.close();
    const targetUrl =
      event.notification?.data?.url ||
      "./";
    event.waitUntil(
      clients.matchAll({
        type: "window",
        includeUncontrolled: true
      })
      .then(clientList => {
        for (const client of clientList) {
          if ("focus" in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(
            targetUrl
          );
        }
      })
    );
  }
);
/* =====================================================
   MESSAGE FROM APP
===================================================== */
self.addEventListener(
  "message",
  event => {
    if (
      event.data &&
      event.data.type === "CLEAR_BADGE"
    ) {
      if (
        "clearAppBadge" in navigator
      ) {
        navigator.clearAppBadge()
          .catch(() => {});
      }
    }
  }
);
