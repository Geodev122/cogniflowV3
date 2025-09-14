// public/sw.js
// Minimal PWA SW: cache app shell, network-first for API, cache-first for static assets.
const SW_VERSION = 'v0.1.0';
const SHELL_CACHE = `shell-${SW_VERSION}`;
const RUNTIME_CACHE = `rt-${SW_VERSION}`;

const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  // Vite will split chunks, so we rely mostly on runtime caching for built assets.
  // Static icons:
  '/thera-py-icon.png',
  '/thera-py-image.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => ![SHELL_CACHE, RUNTIME_CACHE].includes(k))
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

// Helper: classify requests
const isStatic = (url) =>
  url.origin === self.location.origin &&
  (url.pathname.endsWith('.css') ||
   url.pathname.endsWith('.js') ||
   url.pathname.endsWith('.png') ||
   url.pathname.endsWith('.svg') ||
   url.pathname.startsWith('/assets/'));

const isSupabase = (url) =>
  /supabase\.co/.test(url.hostname);

// Strategy: cache-first for static; network-first for Supabase & other GETs
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Only handle GET
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // App shell shortcut
  if (url.origin === self.location.origin && url.pathname === '/') {
    event.respondWith(
      caches.match('/').then((res) => res || fetch(req))
    );
    return;
  }

  // Static assets → cache-first
  if (isStatic(url)) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          const copy = res.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(req, copy));
          return res;
        }).catch(() => cached);
      })
    );
    return;
  }

  // Supabase & other GET → network-first with fallback to cache
  if (isSupabase(url) || req.mode === 'cors') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // Default: try cache, then network
  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req))
  );
});
