// Lifeimpressions Studio Tracker: service worker
// Shows the 9am/5pm push notification and opens the app when it's tapped.
// This file must be named exactly "sw.js" and sit at the top level of the
// site (next to index.html), so its scope covers the whole app.

const APP_URL = self.registration.scope; // e.g. https://<you>.github.io/lifeimpressions-tracker/

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: 'Lifeimpressions', body: event.data ? event.data.text() : '' };
  }
  const title = data.title || 'Lifeimpressions';
  const options = {
    body: data.body || '',
    icon: 'icon.png',
    badge: 'icon.png',
    tag: data.tag || 'lifeimpressions-daily',
    renotify: true,
    data: { url: data.url || APP_URL },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const base = (event.notification.data && event.notification.data.url) || APP_URL;
  // Always land on Today, whether the tap opens a fresh tab or focuses one already open.
  const target = base + (base.includes('#') ? '' : '#today');
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.startsWith(APP_URL) && 'focus' in client) {
          if ('postMessage' in client) client.postMessage({ type: 'navigate', view: 'today' });
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(target);
    })
  );
});
