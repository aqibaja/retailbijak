// ─── RetailBijak Service Worker (Enhanced PWA) ─────
// Cache-first strategy, offline fallback, background sync,
// and install prompt relay.

const CACHE_NAME = 'retailbijak-v4'; // Bumped to clear duplicate export cache
const OFFLINE_URL = '/offline.html';

// Static asset extensions to cache
const STATIC_EXTENSIONS = [
  '.js', '.css', '.html', '.woff', '.woff2', '.ttf', '.otf',
  '.svg', '.png', '.jpg', '.jpeg', '.webp', '.ico', '.gif',
];

// ─── Install: pre-cache critical assets ──────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll([
        '/', '/offline.html', '/style.css',
        '/favicon.svg', '/js/version.js',
        '/js/main.js', '/js/router.js', '/js/api.js',
        '/js/auth.js', '/js/theme.js', '/js/i18n.js',
        '/assets/site-logo.png', '/assets/icon-192.svg', '/assets/icon-512.svg',
      ]))
      .then(() => self.skipWaiting())
      .catch((err) => {
        console.error('[SW] Install cache failed:', err);
        self.skipWaiting();
      })
  );
});

// ─── Activate: clean old caches and take control ─────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== CACHE_NAME)
            .map((k) => caches.delete(k))
        )
      ),
      self.clients.claim(),
    ])
  );
});

// ─── Helper: should this request be cached? ──────────
function isStaticAsset(url) {
  const pathname = url.pathname;
  return STATIC_EXTENSIONS.some((ext) => pathname.endsWith(ext));
}

function shouldCacheRequest(request) {
  if (request.method !== 'GET') return false;
  const url = new URL(request.url);
  if (url.pathname.startsWith('/api/') || url.hostname !== self.location.hostname) return false;
  if (!url.protocol.startsWith('http')) return false;
  return true;
}

// ─── Fetch: network-first for JS modules, cache-first for assets ──
self.addEventListener('fetch', (event) => {
  if (!shouldCacheRequest(event.request)) return;

  const url = new URL(event.request.url);
  const isAsset = isStaticAsset(url);
  const isNavigate = event.request.mode === 'navigate';
  const isOfflinePage = url.pathname === '/offline.html';
  const isJavascript = url.pathname.endsWith('.js');

  // JavaScript modules: NETWORK FIRST — always get latest
  if (isJavascript) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-first strategy (static assets)
  if (isAsset || isOfflinePage) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        const fetchPromise = fetch(event.request)
          .then((response) => {
            if (response && response.status === 200) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
            }
            return response;
          })
          .catch(() => cached);
        return cached || fetchPromise;
      })
    );
    return;
  }

  // Navigation: network-first
  if (isNavigate) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(OFFLINE_URL).then(
          (cached) => cached || new Response('<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"><title>Offline — RetailBijak</title><meta name="viewport" content="width=device-width,initial-scale=1.0"><style>body{font-family:sans-serif;background:#0b1220;color:#e5edf8;display:flex;justify-content:center;align-items:center;min-height:100vh;text-align:center;padding:24px}h1{color:#10b981}</style></head><body><h1>Kamu sedang offline. Beberapa fitur mungkin tidak tersedia.</h1></body></html>', { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } })
        ))
    );
    return;
  }

  // Other requests: stale-while-revalidate
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});

// ─── Background Sync ──────────────────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'retailbijak-sync') {
    event.waitUntil(fetchLatestDataAndCache());
  }
});

async function fetchLatestDataAndCache() {
  try {
    const cache = await caches.open(CACHE_NAME);
    const urls = ['/', '/style.css', '/js/main.js', '/js/router.js', '/js/api.js'];
    const results = await Promise.allSettled(
      urls.map((url) =>
        fetch(url).then((res) => {
          if (res.ok) cache.put(url, res.clone());
        })
      )
    );
    const clients = await self.clients.matchAll();
    clients.forEach((client) => client.postMessage({ type: 'SYNC_COMPLETED', timestamp: Date.now() }));
    return results;
  } catch (e) { console.error('[SW] Background sync failed:', e); }
}

// ─── Periodic Background Sync ──
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'retailbijak-periodic-sync') {
    event.waitUntil(fetchLatestDataAndCache());
  }
  if (event.tag === 'check-alerts') {
    event.waitUntil(checkAndNotifyAlerts());
  }
});

// ─── Alert Check & Notify ──────────────────────────
async function checkAndNotifyAlerts() {
  try {
    const res = await fetch('/api/alerts/triggered-sw');
    if (!res.ok) return;
    const data = await res.json();
    const triggered = data.alerts || [];
    for (const alert of triggered) {
      await self.registration.showNotification('RetailBijak Alert 🔔', {
        body: `${alert.ticker}: ${alert.condition} ${alert.value}`,
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-72.png',
        tag: `alert-${alert.id}`,
        data: { url: `/#stock/${alert.ticker}` }
      });
    }
  } catch(e) {
    console.warn('[SW] Alert check failed:', e);
  }
}

// ─── Handle messages from clients ─────────────────
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_INSTALL_PROMPT') {
    self.clients.matchAll().then((clients) => {
      clients.forEach((client) => client.postMessage({ type: 'SHOW_INSTALL_PROMPT', timestamp: Date.now() }));
    });
  }
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ─── Push notification handlers ──
self.addEventListener('push', (event) => {
  if (!event.data) return;
  try {
    const data = event.data.json();
    const title = data.title || 'RetailBijak';
    const options = {
      body: data.body || '', icon: data.icon || '/assets/site-logo.png',
      badge: '/assets/site-logo.png', tag: data.tag || 'retailbijak-' + Date.now(),
      data: { url: data.url || '/' }, requireInteraction: true, vibrate: [200, 100, 200],
    };
    event.waitUntil(self.registration.showNotification(title, options));
  } catch (e) { /* silent */ }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.host) && 'focus' in client) {
          client.focus(); client.navigate(url); return;
        }
      }
      if (clients.openWindow) clients.openWindow(url);
    })
  );
});
