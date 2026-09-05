const CACHE_NAME = "modular-tech-v4";

const FILES_TO_CACHE = [
  "./",
  "./index.html",
  "./manifest.webmanifest"
];

// ===============================
// INSTALL
// ===============================
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return Promise.all(
          FILES_TO_CACHE.map(file =>
            cache.add(file).catch(error => {
              console.warn("Cache failed:", file, error);
            })
          )
        );
      })
      .then(() => self.skipWaiting())
  );
});


// ===============================
// ACTIVATE
// ===============================
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(name => name !== CACHE_NAME)
            .map(name => caches.delete(name))
        );
      })
      .then(() => self.clients.claim())
  );
});


// ===============================
// FETCH
// ===============================
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
          const responseClone = response.clone();

          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
        }

        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});


// ===============================
// PUSH NOTIFICATION
// ===============================
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
    console.warn("Push data error:", error);

    try {
      if (event.data) {
        data.body = event.data.text();
      }
    } catch (_) {}
  }

  const notificationOptions = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,

    dir: "rtl",
    lang: "ar",

    tag: data.tag || "modular-tech-notification",

    renotify: true,

    data: {
      url: data.url || "./"
    }
  };

  event.waitUntil(
    self.registration.showNotification(
      data.title || "MODULAR TECH",
      notificationOptions
    )
  );
});


// ===============================
// NOTIFICATION CLICK
// ===============================
self.addEventListener("notificationclick", event => {

  event.notification.close();

  const targetUrl =
    event.notification &&
    event.notification.data &&
    event.notification.data.url
      ? event.notification.data.url
      : "./";

  event.waitUntil(

    clients.matchAll({
      type: "window",
      includeUncontrolled: true
    })

    .then(clientList => {

      for (const client of clientList) {

        if ("focus" in client) {

          try {
            const url = new URL(targetUrl, self.location.origin);

            if (
              client.url.startsWith(self.location.origin)
            ) {
              return client.focus();
            }
          } catch (_) {
            return client.focus();
          }

        }
      }

      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }

    })

  );
});


// ===============================
// MESSAGE
// ===============================
self.addEventListener("message", event => {

  if (!event.data) {
    return;
  }

  if (event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }

});
