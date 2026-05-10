// ─── RetailBijak Service Worker (Fase 25.2.3) ─────
// Handles push notifications and basic offline caching.

const CACHE_NAME = 'retailbijak-v1';

// Install: skip waiting so updates activate immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Activate: clean old caches and claim clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))),
      self.clients.claim(),
    ])
  );
});

// Fetch: network-first with cache fallback for offline
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;
  // Don't handle API calls or SSE
  if (event.request.url.includes('/api/')) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Cache successful responses for offline
        if (response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        // Offline: serve from cache
        return caches.match(event.request).then(cached => cached || new Response('Offline', { status: 503 }));
      })
  );
});

// Push: handle incoming push notification
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

// Notification click: navigate to URL
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientList => {
      // Focus existing tab if open
      for (const client of clientList) {
        if (client.url.includes(self.location.host) && 'focus' in client) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      // Otherwise open new window
      if (clients.openWindow) clients.openWindow(url);
    })
  );
});
