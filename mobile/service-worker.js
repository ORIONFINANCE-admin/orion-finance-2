const CACHE = 'orion-v0-1-release-2';
const SHELL = [
  './',
  './index.html',
  './orion.css?v=0103',
  './orion.js?v=0103',
  './manifest.webmanifest?v=0103',
  '../assets/orion-icon.png',
  '../assets/apple-touch-icon.png',
  '../assets/icon-192.png',
  '../assets/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil((async()=>{
    const cache = await caches.open(CACHE);
    for (const url of SHELL) {
      const response = await fetch(url, { cache:'reload' });
      if (!response.ok) throw new Error(`Falha no precache: ${url}`);
      await cache.put(url, response);
    }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async()=>{
    const keys = await caches.keys();
    await Promise.all(keys.filter(k=>k.startsWith('orion-') && k!==CACHE).map(k=>caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (event.request.mode === 'navigate') {
    event.respondWith((async()=>{
      try {
        const live = await fetch(event.request);
        const cache = await caches.open(CACHE);
        cache.put('./index.html', live.clone()).catch(()=>{});
        return live;
      } catch {
        return (await caches.match('./index.html')) || (await caches.match('./'));
      }
    })());
    return;
  }

  event.respondWith((async()=>{
    const cached = await caches.match(event.request, { ignoreSearch:false });
    if (cached) return cached;
    try {
      const live = await fetch(event.request);
      if (live.ok) {
        const cache = await caches.open(CACHE);
        cache.put(event.request, live.clone()).catch(()=>{});
      }
      return live;
    } catch {
      return new Response('', { status:504, statusText:'Offline' });
    }
  })());
});
