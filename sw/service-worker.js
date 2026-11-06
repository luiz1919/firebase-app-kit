// Service worker shared by the firebase-app-kit apps: lets the app open offline.
// The firebaseAppKit() Vite plugin prepends CACHE and STATIC_FILES and emits it as /sw.js.
// - Install: stores the static files, the main page and every /assets/ file it references.
// - Navigation: network first, and each fresh page refreshes the stored copy (new assets are
//   added and those of previous versions deleted); offline, the last stored page.
// - /assets/ (hashed names, never change) and /icons/: cache first.
// - Other origins (Firebase, Google) are left alone: Firestore keeps the data in its own cache.
/* global CACHE, STATIC_FILES */

function assetsIn(html) {
  return [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((match) => match[1])
}

// Stores the main page and its files, and deletes those from previous versions.
async function storeShell(response) {
  const cache = await caches.open(CACHE)
  const assets = assetsIn(await response.clone().text())
  await cache.put('/', response)
  const missing = []
  for (const asset of assets) if (!(await cache.match(asset))) missing.push(asset)
  await cache.addAll(missing)
  for (const request of await cache.keys()) {
    const { pathname } = new URL(request.url)
    if (pathname.startsWith('/assets/') && !assets.includes(pathname)) await cache.delete(request)
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE)
      await cache.addAll(STATIC_FILES)
      await storeShell(await fetch('/', { cache: 'no-cache' }))
      await self.skipWaiting()
    })(),
  )
})

// Deletes every other cache of this origin (older cache names and strategies).
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) event.waitUntil(storeShell(response.clone()))
          return response
        })
        .catch(async () => (await caches.match('/')) ?? Response.error()),
    )
    return
  }

  if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ??
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone()
              event.waitUntil(caches.open(CACHE).then((cache) => cache.put(request, copy)))
            }
            return response
          }),
      ),
    )
  }
})
