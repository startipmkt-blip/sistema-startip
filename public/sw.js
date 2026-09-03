// Service Worker do Startip OS — cache "stale-while-revalidate" só para os
// assets estáticos (JS/CSS hasheados de /assets/). Para tudo que fala com
// Supabase / Z-API / rotas HTML, deixa o browser fazer normal (não cacheia).
// Mudar CACHE para forçar limpeza em deploys sensíveis.
const CACHE = 'startip-os-v1';
const ASSET_PREFIX = '/assets/';

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // ignora Supabase/Z-API/CDN
  if (!url.pathname.startsWith(ASSET_PREFIX) && url.pathname !== '/icon.svg' && url.pathname !== '/manifest.webmanifest') return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(req);
      const network = fetch(req).then((resp) => {
        if (resp.ok) cache.put(req, resp.clone()).catch(() => {});
        return resp;
      }).catch(() => cached);
      return cached || network;
    })(),
  );
});
