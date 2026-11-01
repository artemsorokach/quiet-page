// Quiet Page service worker (v3): works offline after the first visit and never serves an old app
// when the network is there. Only this site's own files are cached; entries never pass through here
// (they live in IndexedDB / localStorage or go encrypted to Firestore, which is cross-origin).
const CACHE = 'quiet-page-v3'

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  const url = new URL(request.url)
  if (request.method !== 'GET' || url.origin !== location.origin) return
  if (url.pathname.includes('/v2/')) return // the test version is not cached by this worker
  const remember = (response) => {
    if (response.ok) {
      const copy = response.clone()
      caches.open(CACHE).then((cache) => cache.put(request.mode === 'navigate' ? './' : request, copy))
    }
    return response
  }
  if (request.mode === 'navigate') {
    // The page itself: always fresh when online, the last copy when offline.
    event.respondWith(fetch(request).then(remember).catch(() => caches.match('./')))
    return
  }
  if (url.pathname.includes('/assets/')) {
    // Built files have a content hash in their name, so a cached copy is always the right one.
    event.respondWith(caches.match(request).then((hit) => hit || fetch(request).then(remember)))
    return
  }
  event.respondWith(fetch(request).then(remember).catch(() => caches.match(request)))
})
