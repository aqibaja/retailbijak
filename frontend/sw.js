// RetailBijak Service Worker — PWA offline cache (1.9.0)
// cache-bust: 20260510 — update version when assets change
const CACHE = 'retailbijak-v3';
const PRECACHE_URLS = [
  '/',
  '/offline.html',
  '/style.css?v=20260510',
  '/js/main.js?v=20260510',
  '/js/router.js?v=20260510',
  '/js/api.js?v=20260510',
  '/js/theme.js?v=20260510',
  '/js/utils/format.js?v=20260510',
  '/js/utils/storage.js?v=20260510',
  '/js/views/dashboard.js?v=20260510',
  '/js/views/stock_detail.js?v=20260510',
  '/js/views/screener.js?v=20260510',
  '/js/views/portfolio.js?v=20260510',
  '/js/views/market.js?v=20260510',
  '/js/views/news.js?v=20260510',
  '/js/views/settings.js?v=20260510',
  '/js/views/help.js?v=20260510',
  '/js/views/ai_picks.js?v=20260510',
  '/js/views/backtest.js?v=20260510',
  '/js/views/paper_trades.js?v=20260510',
  '/js/views/compare.js?v=20260510',
  '/assets/site-logo.png',
  '/manifest.json',
  '/favicon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];
const API_TIMEOUT_MS = 5000;

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE_URLS))
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Helper: fetch with timeout
function fetchWithTimeout(req, ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return fetch(req, { signal: controller.signal }).then((res) => {
    clearTimeout(timer);
    return res;
  }, (err) => {
    clearTimeout(timer);
    throw err;
  });
}

// Helper: stale-while-revalidate for static assets (update cache in background)
function staleWhileRevalidate(req) {
  return caches.open(CACHE).then((cache) => {
    return cache.match(req).then((cached) => {
      const fetchPromise = fetch(req).then((res) => {
        if (res.ok) cache.put(req, res.clone());
        return res;
      }).catch(() => cached);
      return cached || fetchPromise;
    });
  });
}

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Only handle same-origin requests
  if (url.origin !== location.origin) return;

  // API requests: Network First with 5s timeout, fallback to cache, then offline
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(
      fetchWithTimeout(e.request, API_TIMEOUT_MS).catch(() => {
        return caches.match(e.request).then((cached) => {
          if (cached) return cached;
          return new Response(JSON.stringify({ status: 'error', message: 'Koneksi terputus. Data tidak tersedia.' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          });
        });
      })
    );
    return;
  }

  // Sitemap & robots.txt: network-first (always fresh for SEO)
  if (url.pathname === '/sitemap.xml' || url.pathname === '/robots.txt') {
    e.respondWith(
      fetch(e.request).catch(() => caches.match(e.request))
    );
    return;
  }

  // HTML navigation requests: Network First, fallback to cache, then offline page
  if (url.pathname === '/' || url.pathname.endsWith('.html')) {
    e.respondWith(
      fetch(e.request).catch(() => {
        return caches.match(e.request).then((cached) => {
          if (cached) return cached;
          // SPA fallback: return cached index for any navigation
          if (url.pathname !== '/') return caches.match('/');
          return caches.match('/offline.html');
        });
      })
    );
    return;
  }

  // Static assets (CSS, JS, images, fonts, icons): Cache First with stale-while-revalidate
  if (
    url.pathname.startsWith('/js/') ||
    url.pathname.startsWith('/css/') ||
    url.pathname.startsWith('/assets/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/fonts/') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.ico') ||
    url.pathname.endsWith('.webp') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('.json')
  ) {
    e.respondWith(staleWhileRevalidate(e.request));
    return;
  }

  // Default: Network First with cache fallback
  e.respondWith(
    fetch(e.request).then((res) => {
      if (res.ok) {
        const clone = res.clone();
        caches.open(CACHE).then((cache) => cache.put(e.request, clone));
      }
      return res;
    }).catch(() => caches.match(e.request))
  );
});
