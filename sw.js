const CACHE_NAME = "modular-tech-v3";
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
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(FILES_TO_CACHE))
      .catch(error => {
        console.error("Cache install error:", error);
      })
  );
  self.skipWaiting();
});
/* =====================================================
   ACTIVATE
===================================================== */
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => {
        return Promise.all(
          keys
            .filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
        );
      })
      .then(() => self.clients.claim())
  );
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
            })
            .catch(error => {
              console.warn(
                "Cache update error:",
                error
              );
            });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request)
          .then(cachedResponse => {
            if (cachedResponse) {
              return cachedResponse;
            }
            return caches.match("./index.html");
          });
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
    url: "./",
    tag: "modular-tech"
  };
  try {
    if (event.data) {
      let incoming;
      try {
        incoming = event.data.json();
      } catch {
        incoming = {
          body: event.data.text()
        };
      }
      if (incoming && typeof incoming === "object") {
        data = {
          ...data,
          ...incoming
        };
      }
    }
  } catch (error) {
    console.warn(
      "Push data error:",
      error
    );
  }
  const options = {
    body:
      data.body ||
      "لديك إشعار جديد",
    icon:
      data.icon ||
      "./icon-192.png",
    badge:
      data.badge ||
      "./icon-192.png",
    tag:
      data.tag ||
      "modular-tech",
    renotify: true,
    requireInteraction: false,
    vibrate: [
      200,
      100,
      200
    ],
    data: {
      url:
        data.url ||
        "./",
      order_id:
        data.order_id ||
        null,
      order_number:
        data.order_number ||
        null,
      status:
        data.status ||
        null
    }
  };
  event.waitUntil(
    self.registration.showNotification(
      data.title ||
      "MODULAR TECH",
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
    const notificationData =
      event.notification.data || {};
    const targetUrl =
      notificationData.url ||
      "./";
    event.waitUntil(
      clients.matchAll({
        type: "window",
        includeUncontrolled: true
      })
      .then(clientList => {
        for (const client of clientList) {
          if (
            "focus" in client
          ) {
            if (
              "navigate" in client
            ) {
              return client
                .navigate(targetUrl)
                .then(() =>
                  client.focus()
                )
                .catch(() =>
                  client.focus()
                );
            }
            return client.focus();
          }
        }
        if (
          clients.openWindow
        ) {
          return clients.openWindow(
            targetUrl
          );
        }
      })
    );
  }
);
/* =====================================================
   CLEAR APP BADGE
===================================================== */
self.addEventListener(
  "message",
  event => {
    if (
      event.data &&
      event.data.type ===
        "CLEAR_BADGE"
    ) {
      if (
        "clearAppBadge" in navigator
      ) {
        navigator
          .clearAppBadge()
          .catch(() => {});
      }
    }
  }
);
/* =====================================================
   SKIP WAITING
   يسمح للتطبيق بتفعيل النسخة الجديدة فورًا
===================================================== */
self.addEventListener(
  "message",
  event => {
    if (
      event.data &&
      event.data.type ===
        "SKIP_WAITING"
    ) {
      self.skipWaiting();
    }
  }
);
