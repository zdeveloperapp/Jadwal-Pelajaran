const CACHE_NAME = 'jadwal-assets-v1';
const ASSETS = [
  '/style.css',
  '/script.js',
  '/images.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(key => {
        if (key !== CACHE_NAME) return caches.delete(key);
      }))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (ASSETS.some(asset => req.url.includes(asset))) {
    event.respondWith(
      caches.match(req).then(cached => cached || fetch(req))
    );
  }
});