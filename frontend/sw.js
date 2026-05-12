// ─── RetailBijak Service Worker (Self-Destruct) ─────
// This SW removes all caches and unregisters itself
// so the browser fetches fresh content from the server.

const DESTROY_VERSION = 1;

// On activate: delete ALL old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => caches.delete(name))
      );
    }).then(() => {
      console.log('[SW] All caches deleted. Unregistering...');
      return self.registration.unregister();
    }).then(() => {
      console.log('[SW] Service worker unregistered. Page will refresh on next visit.');
    })
  );
});

// On fetch: bypass cache, fetch from network
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});

// Immediately skip waiting and activate
self.addEventListener('install', () => {
  self.skipWaiting();
});
