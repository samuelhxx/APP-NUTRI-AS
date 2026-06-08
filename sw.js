/* ── VORTEX Fit Service Worker ── */

const CACHE_V    = 'vortex-fit-v1';
const ICON_CACHE = 'vortex-icons-v1';

const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './favicon.svg',
  './css/tokens.css',
  './css/base.css',
  './css/layout.css',
  './css/components.css',
  './css/onboarding.css',
  './css/dashboard.css',
  './css/marmita.css',
  './css/training.css',
  './css/profile.css',
  './js/main.js',
  './js/nav.js',
  './js/utils.js',
  './js/store.js',
  './js/auth.js',
  './js/router.js',
  './js/animations/transitions.js',
  './js/animations/rings.js',
  './js/animations/celebrations.js',
  './js/modules/onboarding.js',
  './js/modules/dashboard.js',
  './js/modules/marmita.js',
  './js/modules/training.js',
  './js/modules/profile.js',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_V).then(cache => {
      return cache.addAll(SHELL).catch(err => {
        console.warn('[SW] alguns assets não cacheados:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_V && k !== ICON_CACHE)
          .map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  /* CDN (GSAP, Lucide, Google Fonts) — network first, cache fallback */
  if (url.hostname !== self.location.hostname) {
    event.respondWith(
      fetch(request)
        .then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_V).then(c => c.put(request, clone));
          }
          return res;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  /* PWA icons — serve from icon cache first */
  if (url.pathname.includes('/assets/icons/')) {
    event.respondWith(
      caches.open(ICON_CACHE).then(c =>
        c.match(request).then(r => r || fetch(request).catch(() => new Response('', { status: 404 })))
      )
    );
    return;
  }

  /* App shell — cache first */
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_V).then(c => c.put(request, clone));
        }
        return res;
      });
    })
  );
});
