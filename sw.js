// ══════════════════════════════════════
//  SERVICE WORKER — Bitácora Optométrica
//  Versión: 4.0
// ══════════════════════════════════════
const CACHE_NAME = 'bitacora-v4';

// Recursos a cachear (solo estáticos)
const CACHE_URLS = [
  '/bitacora-optometrica/',
  '/bitacora-optometrica/index.html',
  '/bitacora-optometrica/manifest.json',
  '/bitacora-optometrica/icon-72.png',
  '/bitacora-optometrica/icon-96.png',
  '/bitacora-optometrica/icon-128.png',
  '/bitacora-optometrica/icon-144.png',
  '/bitacora-optometrica/icon-152.png',
  '/bitacora-optometrica/icon-192.png',
  '/bitacora-optometrica/icon-384.png',
  '/bitacora-optometrica/icon-512.png',
];

// INSTALL — limpiar caches viejos y cachear nuevos recursos
self.addEventListener('install', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => caches.delete(k)))
    ).then(() =>
      caches.open(CACHE_NAME).then(cache =>
        Promise.allSettled(CACHE_URLS.map(url => 
          cache.add(url).catch(() => {})
        ))
      )
    ).then(() => self.skipWaiting())
  );
});

// ACTIVATE — tomar control inmediato
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// FETCH — estrategia según tipo de request
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Firebase, Google APIs y auth — SIEMPRE red, nunca caché
  if (url.hostname.includes('firebase') ||
      url.hostname.includes('firestore') ||
      url.hostname.includes('identitytoolkit') ||
      url.hostname.includes('googleapis') ||
      url.hostname.includes('firebaseio') ||
      url.hostname.includes('gstatic')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Recursos estáticos — Cache First, fallback a red
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // Sin internet — devolver página principal desde caché
        if (event.request.destination === 'document') {
          return caches.match('/bitacora-optometrica/index.html');
        }
      });
    })
  );
});

// Mensaje para forzar actualización desde el cliente
self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});
