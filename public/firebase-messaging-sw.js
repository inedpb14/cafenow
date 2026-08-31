// Kill-switch service worker: unregisters the stale service worker left by a
// previous application deployed on this origin, and clears its caches.
// Once installed, it never intercepts any request (no fetch handler).
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
    event.waitUntil(
        (async () => {
            await self.registration.unregister();
            const keys = await caches.keys();
            await Promise.all(keys.map((key) => caches.delete(key)));
        })()
    );
});