const CACHE_NAME = "modular-tech-push-v9";

self.addEventListener("install", event => {
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();

    await Promise.all(
      keys
        .filter(key => key !== CACHE_NAME)
        .map(key => caches.delete(key))
    );

    await self.clients.claim();
  })());
});

self.addEventListener("push", event => {
  let data = {};

  try {
    data = event.data ? event.data.json() : {};
  } catch (_) {
    data = {
      body: event.data
        ? event.data.text()
        : "لديك إشعار جديد"
    };
  }

  const orderNumber = data.order_number
    ? String(data.order_number)
    : "";

  let targetUrl = data.url || "./";

  if (data.type === "customer-order" && orderNumber) {
    targetUrl =
      `./?customer_order=${encodeURIComponent(orderNumber)}`;
  }

  const title = data.title || "MODULAR TECH";

  const options = {
    body: data.body || "لديك إشعار جديد",

    icon: data.icon || "./icon-192.png",

    badge: data.badge || "./icon-192.png",

    tag:
      data.tag ||
      `modular-tech-${Date.now()}`,

    renotify: true,

    data: {
      url: targetUrl,

      order_number:
        orderNumber || null,

      status:
        data.status || null,

      type:
        data.type || "info"
    }
  };

  event.waitUntil(
    self.registration.showNotification(
      title,
      options
    )
  );
});

self.addEventListener(
  "notificationclick",
  event => {

    event.notification.close();

    const targetUrl =
      event.notification?.data?.url || "./";

    event.waitUntil((async () => {

      const absoluteTarget =
        new URL(
          targetUrl,
          self.location.origin
        ).href;

      const windows =
        await self.clients.matchAll({
          type: "window",
          includeUncontrolled: true
        });

      for (const client of windows) {

        if ("navigate" in client) {

          try {
            await client.navigate(
              absoluteTarget
            );
          } catch (_) {}

          if ("focus" in client) {
            return client.focus();
          }
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(
          absoluteTarget
        );
      }

    })());
  }
);

self.addEventListener(
  "message",
  event => {

    if (
      event.data?.type ===
      "SKIP_WAITING"
    ) {
      self.skipWaiting();
    }

  }
);
