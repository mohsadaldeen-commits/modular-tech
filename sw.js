const CACHE_NAME = "modular-tech-v4";

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
   إصلاح stage و due_date قبل إرسالها إلى Supabase
===================================================== */

self.addEventListener("fetch", event => {

  const request = event.request;

  /*
    لا نتدخل في الطلبات التي ليست POST أو PATCH
  */
  if (
    request.method !== "POST" &&
    request.method !== "PATCH"
  ) {
    if (request.method !== "GET") {
      return;
    }

    event.respondWith(
      fetch(request)
        .then(response => {

          if (
            response &&
            response.status === 200 &&
            response.type === "basic"
          ) {
            const copy = response.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(request, copy);
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

          return caches.match(request)
            .then(cachedResponse => {

              if (cachedResponse) {
                return cachedResponse;
              }

              return caches.match("./index.html");
            });

        })
    );

    return;
  }


  /* ===================================================
     SUPABASE ORDERS
  =================================================== */

  const url = request.url;

  const isOrdersRequest =
    url.includes(
      "bvrfrcmblwzuqprjknam.supabase.co/rest/v1/orders"
    );


  /*
    إذا كان POST/PATCH على orders
    نصلح البيانات قبل إرسالها
  */

  if (isOrdersRequest) {

    event.respondWith(

      (async () => {

        try {

          /*
            نقرأ البيانات الأصلية
          */

          const originalBody =
            await request.clone().text();


          /*
            إذا لم يوجد Body
            نرسل الطلب كما هو
          */

          if (!originalBody) {

            return fetch(request);

          }


          let data;

          try {

            data = JSON.parse(originalBody);

          } catch (error) {

            /*
              إذا لم يكن JSON
            */

            return fetch(request);

          }


          /* =================================================
             تحويل stage من اسم المرحلة إلى رقم
          ================================================= */

          const STAGE_TO_ID = {

            "في العمل": 1,

            "تم القص": 2,

            "تم الكنت": 3,

            "تم CNC": 4,

            "تم التركيب": 5,

            "تم الدهان": 6,

            "تم التغليف": 7,

            "تم التحميل": 8,

            "تم التسليم": 9

          };


          /*
            POST عادة يرسل object
            PATCH أيضًا يرسل object
          */

          if (
            data &&
            typeof data === "object" &&
            !Array.isArray(data)
          ) {

            /*
              stage إذا كان نصًا
              نحوله إلى رقم
            */

            if (
              typeof data.stage === "string" &&
              STAGE_TO_ID[data.stage]
            ) {

              data.stage =
                STAGE_TO_ID[data.stage];

            }


            /*
              إذا كان stage رقمًا كنص
              مثل "3"
              نحوله إلى 3
            */

            else if (
              typeof data.stage === "string" &&
              /^\d+$/.test(data.stage)
            ) {

              data.stage =
                Number(data.stage);

            }


            /*
              إصلاح due_date
              قاعدة البيانات تريد DATE
              وليس Timestamp
            */

            if (
              typeof data.due_date === "string" &&
              data.due_date
            ) {

              /*
                إذا وصل مثل:
                2026-09-05T00:00:00.000Z

                نحوله إلى:
                2026-09-05
              */

              if (
                data.due_date.includes("T")
              ) {

                data.due_date =
                  data.due_date.split("T")[0];

              }

            }

          }


          /*
            إنشاء الطلب الجديد بالبيانات المصححة
          */

          const newRequest =
            new Request(
              request.url,
              {
                method: request.method,

                headers: request.headers,

                body: JSON.stringify(data),

                mode: request.mode,

                credentials: request.credentials,

                cache: request.cache,

                redirect: request.redirect,

                referrer: request.referrer,

                referrerPolicy:
                  request.referrerPolicy
              }
            );


          /*
            إرسال الطلب إلى Supabase
          */

          return fetch(newRequest);


        } catch (error) {

          console.error(
            "Supabase orders request error:",
            error
          );

          /*
            في حالة حدوث أي مشكلة
            نرسل الطلب الأصلي
          */

          return fetch(request);

        }

      })()

    );

    return;

  }


  /*
    أي POST/PATCH آخر
    نرسله بدون تعديل
  */

  event.respondWith(
    fetch(request)
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

        incoming =
          event.data.json();

      } catch {

        incoming = {

          body:
            event.data.text()

        };

      }


      if (
        incoming &&
        typeof incoming === "object"
      ) {

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

        for (
          const client of clientList
        ) {

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
