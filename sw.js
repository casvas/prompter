// Offline cache. Bump the version when index.html changes so phones pick up the new copy.
const CACHE = 'shoot-prompter-v4';
const ASSETS = ['./', 'index.html', 'manifest.webmanifest', 'icon-180.png', 'icon-512.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    const hit = (await c.match(e.request, {ignoreSearch: true})) || (e.request.mode === 'navigate' ? await c.match('index.html') : null);
    // Online: fetch the newest copy (give up after 2.5 s on bad signal). Offline: use the saved copy.
    const net = fetch(e.request, {cache: 'no-cache'}).then(r => { if (r.ok) c.put(e.request, r.clone()); return r.ok ? r : null; }).catch(() => null);
    if (!hit) return (await net) || new Response('Offline', {status: 503});
    e.waitUntil(net);
    return (await Promise.race([net, new Promise(r => setTimeout(() => r(null), 2500))])) || hit;
  })());
});
