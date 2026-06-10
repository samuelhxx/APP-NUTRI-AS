/* ── VORTEX Fit v2 Service Worker ── */

const CACHE_V = 'vortex-v2';

const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './favicon.svg',
  './css/tokens.css',
  './css/base.css',
  './css/layout.css',
  './css/components.css',
  './css/alimentacao.css',
  './css/treinos.css',
  './css/meta.css',
  './js/main.js',
  './js/store.js',
  './js/utils.js',
  './js/tabs/alimentacao.js',
  './js/tabs/treinos.js',
  './js/tabs/meta.js',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_V).then(cache =>
      cache.addAll(SHELL).catch(err => console.warn('[SW] cache miss:', err))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_V).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  /* External (fonts, CDN) — network first */
  if (url.hostname !== self.location.hostname) {
    event.respondWith(
      fetch(event.request)
        .then(res => {
          if (res.ok) caches.open(CACHE_V).then(c => c.put(event.request, res.clone()));
          return res;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  /* App shell — cache first */
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(res => {
        if (res.ok) caches.open(CACHE_V).then(c => c.put(event.request, res.clone()));
        return res;
      });
    })
  );
});
