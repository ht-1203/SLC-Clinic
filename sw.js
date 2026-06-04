/* SLC Clinic — Service Worker */
const CACHE = 'slc-v3';
const STATIC = [
  '/', '/index.html',
  '/css/styles.css',
  '/js/app.js', '/js/data.js', '/js/icons.js', '/js/supabase.js',
  '/assets/slc-logo.png',
  'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai:wght@300;400;500;600;700&family=Kanit:ital,wght@0,500;0,600;0,700;1,600;1,700&family=Sora:wght@400;500;600;700&display=swap',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(STATIC)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

/* ---- Push Notifications ---- */
self.addEventListener('push', e => {
  const data = e.data?.json() || { title: 'SLC Clinics', body: 'มีการแจ้งเตือนใหม่' };
  e.waitUntil(self.registration.showNotification(data.title, {
    body: data.body,
    icon: '/assets/slc-logo.png',
    badge: '/assets/slc-logo.png',
    data: data.url || '/',
    vibrate: [100, 50, 100],
  }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.openWindow(e.notification.data || '/'));
});

self.addEventListener('fetch', e => {
  // Network-first for Supabase API, cache-first for static assets
  if (e.request.url.includes('supabase.co')) {
    e.respondWith(
      fetch(e.request).catch(() => new Response('{}', { headers: { 'Content-Type': 'application/json' } }))
    );
    return;
  }
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
      if (res.ok && e.request.method === 'GET') {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
      }
      return res;
    }))
  );
});
