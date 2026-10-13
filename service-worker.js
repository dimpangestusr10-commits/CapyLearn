const CACHE = "capylearn-v4-20261014";
const CORE = [
  "./",
  "./index.html",
  "./style.css",
  "./v2.css",
  "./v2.js",
  "./engagement.css",
  "./engagement.js",
  "./profiles-v4.css",
  "./profiles-v4.js",
  "./about.html",
  "./learn.html",
  "./practice.html",
  "./games.html",
  "./progress.html",
  "./creator.html",
  "./animals.html",
  "./fruits.html",
  "./plants.html",
  "./colors.html",
  "./numbers.html",
  "./assets/mascot/cappy.png",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(CORE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(cache => cache.put(req, copy));
          return res;
        })
        .catch(async () => {
          const cached = await caches.match(req);
          return cached || caches.match("./index.html");
        })
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(res => {
        if (res && res.status === 200 && res.type !== "opaque") {
          const copy = res.clone();
          caches.open(CACHE).then(cache => cache.put(req, copy));
        }
        return res;
      });
    })
  );
});