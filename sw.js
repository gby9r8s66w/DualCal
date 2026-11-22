
/* Dual Calendar Sky — service worker: precache app shell, cache-first, offline navigations */
const VERSION = 'dcsw-v1.0.0';
const CORE = [
  './index.html', './embed.html', './styles.css',
  './js/app.js', './js/engines.js', './js/i18n.js', './js/data.js', './js/theme.js', './js/widget.js',
  './manifest.webmanifest', './icon.svg', './icon-maskable.svg', './updates/manifest.json'
];
self.addEventListener('install', ev => {
  ev.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE)));
});
self.addEventListener('activate', ev => {
  ev.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('message', ev => { if (ev.data === 'SKIP_WAITING') self.skipWaiting(); });
self.addEventListener('fetch', ev => {
  const req = ev.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  // Optional update feed: stale-while-revalidate, never blocks offline use
  if (url.pathname.includes('/updates/')) {
    ev.respondWith(caches.open(VERSION).then(async c => {
      const cached = await c.match(req);
      const net = fetch(req).then(res => { if (res.ok) c.put(req, res.clone()); return res; }).catch(() => null);
      return cached || (await net) || new Response('{}', { headers: { 'Content-Type': 'application/json' } });
    }));
    return;
  }
  ev.respondWith(caches.match(req, { ignoreSearch: req.mode === 'navigate' }).then(hit => {
    if (hit) return hit;
    return fetch(req).then(res => {
      if (res.ok) { const clone = res.clone(); caches.open(VERSION).then(c => c.put(req, clone)); }
      return res;
    }).catch(async () => {
      if (req.mode === 'navigate') return (await caches.match('./index.html')) || Response.error();
      return Response.error();
    });
  }));
});
