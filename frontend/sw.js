// ─── RetailBijak Service Worker (Enhanced PWA) ─────
// Cache-first strategy, offline fallback, background sync,
// and install prompt relay.

const CACHE_NAME = 'retailbijak-v1';
const OFFLINE_URL = '/offline.html';

// Static asset extensions to cache
const STATIC_EXTENSIONS = [
  '.js', '.css', '.html', '.woff', '.woff2', '.ttf', '.otf',
  '.svg', '.png', '.jpg', '.jpeg', '.webp', '.ico', '.gif',
];

// ─── Install: pre-cache critical assets ──────────────
self.addEventListener('install', (event) => {
  const ASSETS_TO_CACHE = [
    '/',
    '/offline.html',
    '/style.css',
    '/favicon.svg',
    '/js/version.js',
    '/js/skeleton.js',
    '/js/main.js',
    '/js/router.js',
    '/js/api.js',
    '/js/auth.js',
    '/js/theme.js',
    '/js/i18n.js',
    '/js/gamification.js',
    '/assets/site-logo.png',
    '/assets/icon-192.svg',
    '/assets/icon-512.svg',
  ];

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS_TO_CACHE))
      .then(() => self.skipWaiting())
      .catch((err) => {
        console.error('[SW] Install cache failed:', err);
        // Still skip waiting even if caching partially fails
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

  // Skip API calls and SSE endpoints
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.includes('/api/') ||
    url.hostname !== self.location.hostname
  ) {
    return false;
  }

  // Skip non-http protocols
  if (!url.protocol.startsWith('http')) return false;

  return true;
}

// ─── Fetch: cache-first for assets, network-first for nav ──
self.addEventListener('fetch', (event) => {
  if (!shouldCacheRequest(event.request)) return;

  const url = new URL(event.request.url);
  const isAsset = isStaticAsset(url);
  const isNavigate = event.request.mode === 'navigate';
  const isOfflinePage = url.pathname === '/offline.html';

  // ── Cache-first strategy (static assets) ────────
  if (isAsset || isOfflinePage) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        // Fetch from network, update cache, fall back to cache
        const fetchPromise = fetch(event.request)
          .then((response) => {
            if (response && response.status === 200) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, clone);
              });
            }
            return response;
          })
          .catch(() => cached);

        // Return cached immediately if available, otherwise wait for network
        return cached || fetchPromise;
      })
    );
    return;
  }

  // ── Navigation requests: network-first ──────────
  if (isNavigate) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache the navigation HTML for offline use
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, clone);
            });
          }
          return response;
        })
        .catch(() => {
          // Offline: serve offline fallback page
          return caches.match(OFFLINE_URL).then(
            (cached) =>
              cached ||
              new Response(
                '<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"><title>Offline — RetailBijak</title><meta name="viewport" content="width=device-width,initial-scale=1.0"><style>body{font-family:sans-serif;background:#0b1220;color:#e5edf8;display:flex;justify-content:center;align-items:center;min-height:100vh;text-align:center;padding:24px}h1{color:#10b981}</style></head><body><h1>Kamu sedang offline. Beberapa fitur mungkin tidak tersedia.</h1></body></html>',
                { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
              )
          );
        })
    );
    return;
  }

  // ── Other requests (e.g. same-origin data): stale-while-revalidate ──
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, clone);
            });
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
    const urls = [
      '/',
      '/style.css',
      '/js/main.js',
      '/js/router.js',
      '/js/api.js',
    ];

    const results = await Promise.allSettled(
      urls.map((url) =>
        fetch(url).then((res) => {
          if (res.ok) cache.put(url, res.clone());
        })
      )
    );

    // Notify clients that sync completed
    const clients = await self.clients.matchAll();
    clients.forEach((client) => {
      client.postMessage({
        type: 'SYNC_COMPLETED',
        timestamp: Date.now(),
      });
    });

    return results;
  } catch (e) {
    console.error('[SW] Background sync failed:', e);
  }
}

// ─── Periodic Background Sync (PeriodicSyncEvent) ──
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'retailbijak-periodic-sync') {
    event.waitUntil(fetchLatestDataAndCache());
  }
});

// ─── Install Prompt Relay ─────────────────────────
let deferredPrompt = null;

self.addEventListener('beforeinstallprompt', (event) => {
  // Prevent Chrome 67+ from automatically showing the prompt
  event.preventDefault();
  // Save the event so it can be triggered later
  deferredPrompt = event;
  // Notify all window clients that install is available
  self.clients.matchAll().then((clients) => {
    clients.forEach((client) => {
      client.postMessage({
        type: 'BEFORE_INSTALL_PROMPT',
        timestamp: Date.now(),
      });
    });
  });
});

// ─── Handle messages from clients ─────────────────
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_INSTALL_PROMPT') {
    // The client is asking us to show the install prompt
    // (the deferred prompt is actually on the window side,
    //  so we relay the request back — handled in main.js)
    self.clients.matchAll().then((clients) => {
      clients.forEach((client) => {
        client.postMessage({
          type: 'SHOW_INSTALL_PROMPT',
          timestamp: Date.now(),
        });
      });
    });
  }

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ─── Push notification handlers (legacy support) ──
self.addEventListener('push', (event) => {
  if (!event.data) return;
  try {
    const data = event.data.json();
    const title = data.title || 'RetailBijak';
    const options = {
      body: data.body || '',
      icon: data.icon || '/assets/site-logo.png',
      badge: '/assets/site-logo.png',
      tag: data.tag || 'retailbijak-' + Date.now(),
      data: { url: data.url || '/' },
      requireInteraction: true,
      vibrate: [200, 100, 200],
    };
    event.waitUntil(self.registration.showNotification(title, options));
  } catch (e) {
    // Silent fail if not valid JSON
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.host) && 'focus' in client) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      if (clients.openWindow) clients.openWindow(url);
    })
  );
});
