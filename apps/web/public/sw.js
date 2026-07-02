// unsaid service worker — makes the app installable (a fetch handler is required
// for the install prompt) and serves a graceful offline page for navigations.
// intentionally minimal: no hashed-asset caching, so there are no stale-chunk bugs.
const CACHE = 'unsaid-offline-v1';
const OFFLINE_URL = '/offline';

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await cache.add(new Request(OFFLINE_URL, { cache: 'reload' }));
    })(),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  // only intercept page navigations; everything else goes straight to the network
  if (event.request.mode !== 'navigate') return;
  event.respondWith(
    (async () => {
      try {
        return await fetch(event.request);
      } catch {
        const cache = await caches.open(CACHE);
        return (await cache.match(OFFLINE_URL)) || Response.error();
      }
    })(),
  );
});
