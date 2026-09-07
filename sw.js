/* =========================================================
   MODULAR TECH — SERVICE WORKER
   Push Notifications + PWA
========================================================= */

const CACHE_NAME = "modular-tech-push-v8";

const FILES_TO_CACHE = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192.png"
];


/* =========================================================
   INSTALL
========================================================= */

self.addEventListener("install", event => {

  console.log("[SW] Installing...");

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(FILES_TO_CACHE);
      })
      .catch(error => {
        console.warn("[SW] Cache install error:", error);
      })
  );

  self.skipWaiting();

});


/* =========================================================
   ACTIVATE
========================================================= */

self.addEventListener("activate", event => {

  console.log("[SW] Activated");

  event.waitUntil(

    caches.keys().then(keys => {

      return Promise.all(

        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))

      );

    })

  );

  self.clients.claim();

});


/* =========================================================
   FETCH
========================================================= */

self.addEventListener("fetch", event => {

  // نتعامل فقط مع GET
  if (event.request.method !== "GET") {
    return;
  }

  event.respondWith(

    fetch(event.request)

      .then(response => {

        // حفظ نسخة حديثة من الملفات
        if (
          response &&
          response.status === 200 &&
          response.type === "basic"
        ) {

          const responseClone = response.clone();

          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(
                event.request,
                responseClone
              );
            })
            .catch(() => {});

        }

        return response;

      })

      .catch(() => {

        return caches.match(event.request)
          .then(cachedResponse => {

            if (cachedResponse) {
              return cachedResponse;
            }

            // إذا كان طلب صفحة ولم يوجد إنترنت
            if (event.request.mode === "navigate") {
              return caches.match("./index.html");
            }

            return Response.error();

          });

      })

  );

});


/* =========================================================
   WEB PUSH
========================================================= */

self.addEventListener("push", event => {

  console.log("[SW] Push received");

  let data = {};

  try {

    if (event.data) {

      try {

        data = event.data.json();

      } catch {

        data = {
          body: event.data.text()
        };

      }

    }

  } catch (error) {

    console.error(
      "[SW] Push data error:",
      error
    );

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

    tag:
      data.tag ||
      "modular-tech-notification",

    renotify: true,

    requireInteraction:
      data.type === "urgent",

    data: {

      url:
        data.url ||
        "./",

      type:
        data.type ||
        "info",

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
      title,
      options
    )

  );

});


/* =========================================================
   NOTIFICATION CLICK
========================================================= */

self.addEventListener(
  "notificationclick",
  event => {

    console.log(
      "[SW] Notification clicked"
    );

    event.notification.close();


    const targetUrl =
      event.notification.data?.url ||
      "./";


    event.waitUntil(

      clients.matchAll({

        type: "window",

        includeUncontrolled: true

      }).then(clientList => {


        // إذا التطبيق مفتوح
        for (const client of clientList) {

          if (
            "focus" in client
          ) {

            try {

              if ("navigate" in client) {
                client.navigate(targetUrl);
              }

            } catch (error) {

              console.warn(
                "[SW] Navigate:",
                error
              );

            }

            return client.focus();

          }

        }


        // إذا التطبيق مغلق
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


/* =========================================================
   PUSH SUBSCRIPTION CHANGE
========================================================= */

self.addEventListener(
  "pushsubscriptionchange",
  event => {

    console.log(
      "[SW] Push subscription changed"
    );

    /*
      إعادة تسجيل الاشتراك تتم من index.html
      عند فتح التطبيق مرة أخرى.
    */

  }
);


/* =========================================================
   MESSAGE FROM APP
========================================================= */

self.addEventListener(
  "message",
  event => {

    if (
      event.data &&
      event.data.type === "SKIP_WAITING"
    ) {

      self.skipWaiting();

    }

  }
);
