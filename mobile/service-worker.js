const CACHE="orion-mobile-v14-4";
const SHELL=[
  "./","./index.html","./mobile-v0142.css","./mobile-v0142.js","./manifest.webmanifest",
  "../core/theme.css","../core/db.js","../core/config.js","../core/utils.js","../core/settings.js",
  "../core/finance.js","../core/orion.js","../core/events.js","../core/game.js","../core/recurring.js",
  "../core/diagnostics.js","../core/commitments.js","../core/dashboard-groups.js","../core/sync.js",
  "../core/investments.js","../core/goals.js","../core/caju.js","../core/premium.js","../core/categories.js",
  "../core/profiles.js","../core/phrase-engine.js",
  "../assets/icon-192.png","../assets/icon-512.png","../assets/apple-touch-icon.png","../assets/favicon-32.png"
];
self.addEventListener("install",event=>{
  event.waitUntil((async()=>{const cache=await caches.open(CACHE);await cache.addAll(SHELL);await self.skipWaiting();})());
});
self.addEventListener("activate",event=>{
  event.waitUntil((async()=>{const keys=await caches.keys();await Promise.all(keys.filter(k=>k.startsWith("orion-mobile-")&&k!==CACHE).map(k=>caches.delete(k)));await self.clients.claim();})());
});
self.addEventListener("fetch",event=>{
  const req=event.request;if(req.method!=="GET")return;
  const url=new URL(req.url);if(url.origin!==self.location.origin)return;
  if(req.mode==="navigate"){
    event.respondWith((async()=>{const cached=await caches.match("./index.html");try{const fresh=await fetch(req);const cache=await caches.open(CACHE);cache.put("./index.html",fresh.clone());return fresh}catch{return cached||Response.error()}})());return;
  }
  event.respondWith((async()=>{const cached=await caches.match(req,{ignoreSearch:true});if(cached)return cached;try{const fresh=await fetch(req);if(fresh.ok){const cache=await caches.open(CACHE);cache.put(req,fresh.clone())}return fresh}catch{return Response.error()}})());
});
