// RetailBijak Service Worker — PWA offline cache (1.8.0)
// cache-bust: 20260508A — update version when assets change
const CACHE = 'retailbijak-v2';
const PRECACHE_URLS = [
  '/',
  '/style.css?v=20260508B',
  '/js/main.js?v=20260508B',
  '/js/router.js?v=20260508B',
  '/js/api.js?v=20260508B',
  '/js/theme.js?v=20260508B',
  '/js/utils/format.js?v=20260508B',
  '/js/utils/storage.js?v=20260508B',
  '/js/views/dashboard.js?v=20260508B',
  '/js/views/stock_detail.js?v=20260508B',
  '/js/views/screener.js?v=20260508B',
  '/js/views/portfolio.js?v=20260508B',
  '/js/views/market.js?v=20260508B',
  '/js/views/news.js?v=20260508B',
  '/js/views/settings.js?v=20260508B',
  '/js/views/help.js?v=20260508B',
  '/js/views/ai_picks.js?v=20260508B',
  '/js/views/backtest.js?v=20260510',
  '/js/views/paper_trades.js?v=20260510',
  '/js/views/compare.js?v=20260508',
  '/assets/site-logo.png',
  '/manifest.json?v=1',
  '/favicon.svg',
];
const API_TIMEOUT_MS = 5000;

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
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
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    fetch(req).then((res) => { clearTimeout(timer); resolve(res); }, (err) => { clearTimeout(timer); reject(err); });
  });
}

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Only handle same-origin requests
  if (url.origin !== location.origin) return;

  // API requests: network-first with 5s timeout, fallback to cache
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

  // Static assets: cache-first, fallback to network
  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;
      return fetch(e.request).then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then((cache) => cache.put(e.request, clone));
        }
        return res;
      }).catch(() => {
        // Offline: return homepage as SPA fallback
        return caches.match('/');
      });
    })
  );
});
