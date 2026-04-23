// SipHouse Service Worker — v2
const CACHE = 'siphouse-v2';
const ASSETS = [
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  // Google Fonts (cached on first load)
  'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Source+Sans+3:wght@400;600;700&family=Source+Code+Pro:wght@500;700&display=swap'
];

// Install: cache all core assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => {
      // Cache local assets (must succeed)
      const local = ASSETS.filter(a => a.startsWith('./'));
      return cache.addAll(local).then(() => {
        // Cache remote fonts best-effort
        const remote = ASSETS.filter(a => !a.startsWith('./'));
        return Promise.allSettled(remote.map(url =>
          fetch(url, {mode:'cors'}).then(r => cache.put(url, r)).catch(()=>{})
        ));
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate: delete old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: cache-first for local, network-first for fonts
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  
  // Cache-first for same-origin (our app files)
  if (url.origin === location.origin) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(resp => {
          const clone = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return resp;
        }).catch(() => caches.match('./index.html'));
      })
    );
    return;
  }
  
  // Network-first with cache fallback for fonts
  if (url.hostname.includes('fonts.g') || url.hostname.includes('fonts.gstatic')) {
    e.respondWith(
      fetch(e.request).then(resp => {
        const clone = resp.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return resp;
      }).catch(() => caches.match(e.request))
    );
    return;
  }
});
