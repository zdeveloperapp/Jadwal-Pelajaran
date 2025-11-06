self.addEventListener('install', event => {
  console.log('Service Worker aktif tanpa cache.');
});

self.addEventListener('fetch', event => {
  event.respondWith(fetch(event.request));
});