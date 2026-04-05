/* ================================================
   Service Worker for Lärarplattform PWA
   Handles caching for offline use and
   relays scheduled notification alarms.
   ================================================ */

const CACHE_NAME = 'larar-planner-v1';

// Files to cache for offline use
const PRECACHE_URLS = [
  './index.html',
  './manifest.json'
];

// ---- Install: pre-cache core assets ----
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// ---- Activate: clean up old caches ----
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ---- Fetch: serve from cache, fall back to network ----
self.addEventListener('fetch', event => {
  // Only handle same-origin GET requests
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});

// ---- Message: receive scheduled alarm from the page ----
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body } = event.data;
    event.waitUntil(
      self.registration.showNotification(title, {
        body: body,
        icon: './manifest.json', // fallback; replace with a real icon path if available
        badge: './manifest.json',
        tag: 'larar-reminder-' + Date.now(),
        requireInteraction: false,
        vibrate: [200, 100, 200]
      })
    );
  }
});

// ---- Notification click: focus or open the app ----
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('./index.html');
      }
    })
  );
});
