// Offline: the build (vite.config.ts → precacheServiceWorker) replaces
// these two placeholders with this release's id and the list of EVERY
// file the app is made of (each role's screens, every form), so a phone
// that has been online once can open any screen and fill any form with no
// connection. A new release changes this file, so phones install it and
// cache the new files.
const BUILD_ID = '__BUILD_ID__';
const PRECACHE = /*__PRECACHE__*/[];
const CACHE_NAME = `psu-fieldops-${BUILD_ID}`;
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  ...PRECACHE,
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    // One file failing (e.g. a flaky connection) mustn't abort the rest.
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all(ASSETS_TO_CACHE.map((url) => cache.add(url).catch(() => {}))))
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

// Lookups ignore `Vary`: files are precached without the page's Origin
// header, so a server that answers with `Vary: Origin` would otherwise
// make every offline lookup miss (blank screen offline). Asset names are
// content-hashed, so one copy per URL is always right.
// Network-first for navigations/API-like requests so staff always get the
// latest checklist logic when online; fall back to cache when offline.
// Cache-first for static assets (icons, fonts) since those rarely change.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return; // never intercept POST/PUT etc.
  // Only the app's own files. Firebase (live data, auth, photos) and other
  // services handle their own connections and offline queue — caching
  // their responses here could serve stale or broken data.
  if (new URL(event.request.url).origin !== self.location.origin) return;

  const isNavigation = event.request.mode === 'navigate';

  if (isNavigation) {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(event.request, clone));
          return res;
        })
        .catch(() => caches.match(event.request, { ignoreVary: true }).then((r) => r || caches.match('/index.html', { ignoreVary: true })))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request, { ignoreVary: true }).then((cached) => {
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
      // Sent-back logs (notifySubmissionReturned) open the fix page.
      const params = new URL(url, self.location.origin).searchParams;
      const tab = params.get('tab');
      const fix = params.get('fix');
      for (const c of clients) {
        if ('focus' in c) {
          if (fix) c.postMessage({ type: 'OPEN_FIX', id: fix });
          else if (tab === 'checks') c.postMessage({ type: 'OPEN_CHECKS' });
          else if (tab === 'opslogs') c.postMessage({ type: 'OPEN_OPSLOGS' });
          else if (tab === 'chat') c.postMessage({ type: 'OPEN_CHAT' });
          else if (tab) c.postMessage({ type: 'OPEN_TAB', tab });
          return c.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
