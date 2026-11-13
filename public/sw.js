const CACHE_NAME = 'psu-fieldops-v3';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Network-first for navigations/API-like requests so staff always get the
// latest checklist logic when online; fall back to cache when offline.
// Cache-first for static assets (icons, fonts) since those rarely change.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return; // never intercept POST/PUT etc.

  const isNavigation = event.request.mode === 'navigate';

  if (isNavigation) {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(event.request, clone));
          return res;
        })
        .catch(() => caches.match(event.request).then((r) => r || caches.match('/index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((res) => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then((c) => c.put(event.request, clone));
        return res;
      }).catch(() => cached);
    })
  );
});

// ── Chat push notifications ─────────────────────────────────────────
// Sent by the notifyChatMessage Cloud Function (functions/src/index.ts)
// through Firebase Cloud Messaging as a data-only message, so this worker
// decides how it looks. Skipped when the app is already open and focused —
// the Chat tab's unread badge covers that case.
self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (e) {
    payload = { data: { title: 'PSU FieldOps', body: event.data ? event.data.text() : '' } };
  }
  const d = payload.data || payload.notification || payload;
  const title = d.title || 'PSU FieldOps';
  const options = {
    body: d.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: d.tag || 'psu-chat',
    renotify: true,
    data: { url: d.url || '/?tab=chat' },
  };
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      if (clients.some((c) => c.focused)) return;
      return self.registration.showNotification(title, options);
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/?tab=chat';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Missed-check alerts (functions/src/missedChecks.ts) open the
      // Checks view; everything else is chat.
      const tab = new URL(url, self.location.origin).searchParams.get('tab');
      for (const c of clients) {
        if ('focus' in c) {
          c.postMessage({ type: tab === 'checks' ? 'OPEN_CHECKS' : 'OPEN_CHAT' });
          return c.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
