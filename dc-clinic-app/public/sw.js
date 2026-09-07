// Service worker mínimo: cachea el "shell" de la app para que abra rápido
// y no se rompa si el celular pierde señal un momento. Las llamadas a /api/
// siempre van a la red (los datos deben ser reales, no cacheados).
const CACHE = 'dc-clinic-shell-v2';
const SHELL = ['/', '/styles.css', '/app.js', '/manifest.json'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (url.pathname.startsWith('/api/')) return; // nunca cachear datos en vivo
  e.respondWith(caches.match(e.request).then((cached) => cached || fetch(e.request)));
});
