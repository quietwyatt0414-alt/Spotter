// The old address (spotter-6d902.web.app) no longer runs the app. This replaces the app's service worker there
// and removes itself, so the browser stops serving a cached copy of the old site.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil((async () => {
  for (const k of await caches.keys()) await caches.delete(k);
  await self.registration.unregister();
  for (const c of await self.clients.matchAll({type:'window'})) c.navigate(c.url);
})()));
