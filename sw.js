// Офлайн-режим: кэшируем оболочку и всё, что пациент уже открывал
const CACHE = 'avalon-v7';
const CORE = ['./', 'index.html', 'app.css', 'app.js', 'data.json', 'img/logo-white.svg', 'img/logo.svg', 'img/mark-white.svg'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  // APK и сведения о версии — всегда только из сети, никогда из кэша
  if (u.pathname.endsWith('.apk') || u.pathname.endsWith('version.json')) return;
  // Сначала сеть (чтобы обновления приходили сразу), при отсутствии сети — кэш
  e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; })
    .catch(() => caches.match(e.request).then(r => r || caches.match('index.html'))));
});
