const STATIC_CACHE_NAME = "static-cache-v1.1";
const INMUTABLE_CACHE_NAME = "inmutable-cache-v1.1";
const DYNAMIC_CACHE_NAME = "dynamic-cache-v1.1";

// Archivos estáticos que queremos almacenar en caché
const STATIC_FILES = [
    "/",
    "/index.html",
    "/html/gatos.html", // Solo gatos.html estará en caché
    "/js/app.js",
    "/images/gato1.webp", // Solo imagen de gato1 en caché
];

// Archivos inmutables que no cambiarán y pueden venir de CDN
const INMUTABLE_FILES = [
    "https://reqres.in/api/users",
    "https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css",
    "https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/js/bootstrap.min.js",
    "https://unpkg.com/sweetalert/dist/sweetalert.min.js",
];

// Evento de instalación: cacheamos los archivos estáticos e inmutables
self.addEventListener("install", function (event) {
    console.log("Service Worker Instalado");

    const cacheStatic = caches.open(STATIC_CACHE_NAME).then((cache) => {
        return cache.addAll(STATIC_FILES);
    });

    const cacheInmutable = caches.open(INMUTABLE_CACHE_NAME).then((cache) => {
        return cache.addAll(INMUTABLE_FILES);
    });

    event.waitUntil(Promise.all([cacheStatic, cacheInmutable]));
});

// Evento de activación: limpiamos cachés antiguas
self.addEventListener("activate", function (event) {
    console.log("Service Worker Activado");
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (
                        cache !== STATIC_CACHE_NAME &&
                        cache !== INMUTABLE_CACHE_NAME &&
                        cache !== DYNAMIC_CACHE_NAME
                    ) {
                        console.log("Eliminando caché antigua:", cache);
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
});

// Evento de fetch: manejamos las solicitudes
self.addEventListener("fetch", function (event) {
    if (
        event.request.mode === "navigate" &&
        event.request.url.includes("/html/tortugas.html")
    ) {
        // No almacena en caché tortugas.html, intenta obtener de la red sin respuesta personalizada si falla
        event.respondWith(fetch(event.request));
    } else if (event.request.url.includes("/images/gato2.jpg")) {
        // Evitar cachear la imagen gato2.jpg
        event.respondWith(
            fetch(event.request).catch(() => {
                return new Response("La imagen no está disponible sin conexión.", {
                    headers: { "Content-Type": "text/plain" },
                });
            })
        );
    } else {
        // Estrategia de caché para otros recursos
        event.respondWith(
            caches.match(event.request).then((response) => {
                return (
                    response ||
                    fetch(event.request)
                        .then((fetchResponse) => {
                            // Almacenar en el caché dinámico, excepto para gato2.jpg
                            if (!event.request.url.includes("/images/gato2.jpg")) {
                                return caches.open(DYNAMIC_CACHE_NAME).then((cache) => {
                                    cache.put(event.request, fetchResponse.clone());
                                    cleanCache(DYNAMIC_CACHE_NAME, 50); // Limita el caché dinámico a 50 elementos
                                    return fetchResponse;
                                });
                            }
                            return fetchResponse;
                        })
                        .catch(() => {
                            // Si no hay conexión y el recurso no está en caché, muestra `index.html`
                            if (event.request.mode === "navigate") {
                                return caches.match("/index.html");
                            }
                        })
                );
            })
        );
    }
});

// Función para limpiar el caché dinámico si excede el tamaño máximo
const cleanCache = (cacheName, maxSize) => {
    caches.open(cacheName).then((cache) => {
        cache.keys().then((items) => {
            if (items.length > maxSize) {
                cache.delete(items[0]).then(() => cleanCache(cacheName, maxSize));
            }
        });
    });
};
