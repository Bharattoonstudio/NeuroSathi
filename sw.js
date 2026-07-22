// ============================================================
// NEUROSARATHI — Service Worker
// Cache-first for static assets, network-first for HTML pages,
// with an offline fallback. Bump CACHE_VERSION on every deploy
// that changes cached files so old caches are cleared.
// ============================================================

const CACHE_VERSION = 'ns-static-v1';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/components.css',
  '/css/animations.css',
  '/css/responsive.css',
  '/js/common.js',
  '/js/neuro-sarathi.js',
  '/images/neurosarathi-logo-horizontal.webp',
  '/images/neurosarathi-logo-horizontal.png',
  '/images/icon-192.png',
  '/images/icon-512.png',
  '/images/favicon-32.png',
  '/images/favicon-16.png',
  '/images/apple-touch-icon.png',
  '/offline.html'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Only handle GET requests; let everything else (POST to Supabase/Razorpay, etc.) pass through untouched.
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Never intercept cross-origin calls (Supabase API, Razorpay checkout, CDN JS) —
  // those must always hit the network live, not be served from cache.
  if (url.origin !== self.location.origin) return;

  // Static assets: cache-first, falling back to network and caching the result.
  const isStaticAsset = /\.(css|js|png|jpg|jpeg|webp|svg|ico|woff2?)$/.test(url.pathname);

  if (isStaticAsset) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          const resClone = res.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(req, resClone));
          return res;
        }).catch(() => cached);
      })
    );
    return;
  }

  // HTML pages: network-first (so users always get fresh content when online),
  // falling back to cache, then to a generic offline page.
  if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const resClone = res.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(req, resClone));
          return res;
        })
        .catch(() =>
          caches.match(req).then((cached) => cached || caches.match('/offline.html'))
        )
    );
  }
});
