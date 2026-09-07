const CACHE_NAME = "modular-tech-v8";

self.addEventListener("install", function(event) {
  self.skipWaiting();
});

self.addEventListener("activate", function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.map(function(key) {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

self.addEventListener("fetch", function(event) {
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request).catch(function() {
      return caches.match(event.request);
    })
  );
});

self.addEventListener("push", function(event) {
  var payload = {};

  if (event.data) {
    try {
      payload = event.data.json();
    } catch (e) {
      payload = {
        title: "MODULAR TECH",
        body: event.data.text()
      };
    }
  }

  var title = payload.title || "MODULAR TECH";

  var options = {
    body: payload.body || "لديك إشعار جديد",
    icon: "./icon-192.png",
    badge: "./icon-192.png",
    tag: payload.tag || "modular-tech-notification",

    data: {
      url: payload.url || "./",
      order_number: payload.order_number || "",
      status: payload.status || "",
      type: payload.type || "info"
    }
  };

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(title, options),

      clients.matchAll({
        type: "window",
        includeUncontrolled: true
      }).then(function(clientList) {

        return Promise.all(
          clientList.map(function(client) {

            try {
              client.postMessage({
                type: "MODULAR_TECH_DATA_CHANGED",
                payload: payload
              });

            } catch (e) {}

          })
        );

      })
    ])
  );
});

self.addEventListener("notificationclick", function(event) {

  event.notification.close();

  var target = "./";

  if (
    event.notification &&
    event.notification.data &&
    event.notification.data.url
  ) {
    target = event.notification.data.url;
  }

  event.waitUntil(
    clients.matchAll({
      type: "window",
      includeUncontrolled: true
    }).then(function(clientList) {

      for (var i = 0; i < clientList.length; i++) {

        var client = clientList[i];

        try {
          client.postMessage({
            type: "MODULAR_TECH_DATA_CHANGED"
          });
        } catch (e) {}

        if ("focus" in client) {
          return client.focus();
        }
      }

      if (clients.openWindow) {
        return clients.openWindow(target);
      }

    })
  );
});
