const CACHE = "orion-mobile-v5-2";
const ASSETS = [
  "./",
  "./index.html",
  "./mobile.css",
  "./mobile.js",
  "./manifest.webmanifest",
  "../core/theme.css",
  "../core/config.js",
  "../core/utils.js",
  "../core/db.js",
  "../core/sync.js",
  "../core/finance.js",
  "../core/orion.js",
  "../core/investments.js",
  "../core/goals.js",
  "../core/settings.js",
  "../core/game.js",
  "../core/smart-entry.js",
  "../core/caju.js",
  "../assets/icon-192.png",
  "../assets/icon-512.png",
  "../assets/apple-touch-icon.png"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== location.origin) return;

  event.respondWith(
    caches.match(event.request).then(cached =>
      cached || fetch(event.request).then(response => {
        const copy = response.clone();
        caches.open(CACHE).then(cache => cache.put(event.request, copy));
        return response;
      })
    )
  );
});
