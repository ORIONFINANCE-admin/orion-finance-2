const CACHE = 'orion-v0-4-local-only';
const SHELL = [
  './',
  './index.html',
  './orion.css?v=0400',
  './orion.js?v=0400',
  './manifest.webmanifest?v=0400',
  '../assets/orion-icon-v040.png',
  '../assets/apple-touch-icon-v040.png',
  '../assets/icon-192-v040.png',
  '../assets/icon-512-v040.png',
  '../assets/banks/bradesco.png',
  '../assets/banks/inter.png',
  '../assets/banks/mercado-pago.png',
  '../assets/banks/caju.png'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    for (const url of SHELL) {
      const response = await fetch(url, { cache: 'reload' });
      if (!response.ok) throw new Error(`Falha no precache: ${url}`);
      await cache.put(url, response);
    }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith('orion-') && key !== CACHE).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (event.request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const live = await fetch(event.request, { cache: 'no-store' });
        const cache = await caches.open(CACHE);
        cache.put('./index.html', live.clone()).catch(() => {});
        return live;
      } catch {
        return (await caches.match('./index.html')) || (await caches.match('./'));
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(event.request, { ignoreSearch: false });
    if (cached) return cached;
    try {
      const live = await fetch(event.request);
      if (live.ok) {
        const cache = await caches.open(CACHE);
        cache.put(event.request, live.clone()).catch(() => {});
      }
      return live;
    } catch {
      return new Response('', { status: 504, statusText: 'Offline' });
    }
  })());
});
