// Offline cache: the app must work on sites with no signal.
const CACHE = 'hd-survey-v8';
const V = 8; // bump together with ?v= in index.html
const CACHE_FILES = ['styles.css', 'data.js', 'calc.js', 'app.js'].map(f => `./${f}?v=${V}`);
const FILES = ['./', './index.html', ...CACHE_FILES, './icon.svg', './manifest.webmanifest'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  // Network first so updates arrive; cache as fallback offline.
  e.respondWith(fetch(e.request, { cache: 'no-cache' }).then(res => {
    const copy = res.clone();
    caches.open(CACHE).then(c => c.put(e.request, copy));
    return res;
  }).catch(() => caches.match(e.request, { ignoreSearch: e.request.mode === 'navigate' })));
});
