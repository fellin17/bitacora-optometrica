// ══════════════════════════════════════
//  SERVICE WORKER — Bitácora Optométrica
//  Versión: 1.0
// ══════════════════════════════════════
const CACHE_NAME = 'bitacora-v3';
const CACHE_URLS = [
  '/bitacora-optometrica/',
  '/bitacora-optometrica/index.html',
  '/bitacora-optometrica/icon-192.png',
  '/bitacora-optometrica/icon-512.png',
  '/bitacora-optometrica/manifest.json',
  // Google Fonts
  'https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Serif+Display:ital@0;1&display=swap',
  // Firebase SDK (cache para carga más rápida)
  'https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js',
];

// INSTALL — cachear recursos estáticos
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return Promise.allSettled(
        CACHE_URLS.map(url => cache.add(url).catch(e => console.warn('No se pudo cachear:', url)))
      );
    }).then(() => self.skipWaiting())
  );
});

// ACTIVATE — limpiar caches viejos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// FETCH — estrategia: Network First para Firebase, Cache First para estáticos
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Firebase y API calls: siempre red (necesita internet para datos)
  if (url.hostname.includes('firebase') ||
      url.hostname.includes('googleapis') ||
      url.hostname.includes('firebaseio') ||
      url.hostname.includes('identitytoolkit')) {
    event.respondWith(fetch(event.request).catch(() => new Response('{}', {headers:{'Content-Type':'application/json'}})));
    return;
  }

  // Recursos estáticos: Cache First, fallback a red
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // Solo cachear respuestas válidas
        if (response && response.status === 200 && response.type !== 'opaque') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // Offline: devolver la app principal
        if (event.request.destination === 'document') {
          return caches.match('/bitacora-optometrica/index.html');
        }
      });
    })
  );
});

// Mensaje para forzar actualización
self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});
