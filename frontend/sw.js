// RetailBijak Service Worker — PWA offline cache (1.7.6)
const CACHE = 'retailbijak-v1';
const PRECACHE_URLS = [
  '/',
  '/style.css?v=20260507M',
  '/js/main.js?v=20260507M',
  '/js/router.js?v=20260507M',
  '/js/api.js?v=20260507M',
  '/js/theme.js?v=20260507M',
  '/js/utils/format.js?v=20260507M',
  '/js/utils/storage.js?v=20260507M',
  '/assets/site-logo.png',
  '/manifest.json?v=1',
];

// Install: cache key assets
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: network-first, fallback to cache
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Only handle same-origin requests
  if (url.origin !== location.origin) return;

  // API requests: network-only (no cache to avoid stale data)
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(fetch(e.request).catch(() => new Response(null, { status: 503 })));
    return;
  }

  // Static assets: cache-first for performance
  e.respondWith(
    caches.match(e.request).then((cached) => cached || fetch(e.request).then((res) => {
      // Cache successful responses for future offline use
      if (res.ok) {
        const clone = res.clone();
        caches.open(CACHE).then((cache) => cache.put(e.request, clone));
      }
      return res;
    }).catch(() => caches.match('/') // Offline: show homepage
    ))
  );
});
