const CACHE_NAME = "modular-tech-v2";

const FILES_TO_CACHE = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192.png"
];

/* =====================================================
   INSTALL
===================================================== */

self.addEventListener("install", event => {

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(FILES_TO_CACHE))
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

  /*
     لا نتعامل مع طلبات API كملفات Cache.
     هذا مهم حتى لا تظهر بيانات قديمة.
  */

  if (
    event.request.url.includes("/rest/") ||
    event.request.url.includes("/auth/") ||
    event.request.url.includes("/functions/")
  ) {

    event.respondWith(
      fetch(event.request)
    );

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

  let data = {};

  try {

    data = event.data
      ? event.data.json()
      : {};

  } catch {

    data = {
      title: "MODULAR TECH",
      body: event.data
        ? event.data.text()
        : "لديك إشعار جديد"
    };

  }


  const title =
    data.title ||
    "MODULAR TECH";


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

    dir:
      data.dir ||
      "rtl",

    lang:
      data.lang ||
      "ar",

    tag:
      data.tag ||
      "modular-tech-notification",

    renotify: true,

    requireInteraction:
      data.requireInteraction === true,

    data: {

      url:
        data.url ||
        "./",

      orderId:
        data.orderId ||
        null

    }

  };


  event.waitUntil(

    self.registration.showNotification(
      title,
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
      notificationData.url || "./";


    event.waitUntil(

      clients.matchAll({
        type: "window",
        includeUncontrolled: true
      })

      .then(clientList => {

        /*
           إذا التطبيق مفتوح،
           نستخدم النافذة الموجودة.
        */

        for (const client of clientList) {

          if ("focus" in client) {

            return client
              .focus()
              .then(() => {

                if (
                  "navigate" in client &&
                  targetUrl
                ) {

                  return client.navigate(
                    targetUrl
                  );

                }

              });

          }

        }


        /*
           إذا التطبيق مغلق،
           افتح التطبيق.
        */

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
   NOTIFICATION CLOSE
===================================================== */

self.addEventListener(
  "notificationclose",
  event => {

    console.log(
      "MODULAR TECH notification closed"
    );

  }
);
