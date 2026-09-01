// Service worker mínimo do Totem. Estratégia: network-first (sempre atualiza
// quando tem internet; usa cache só como reserva se cair a rede).
const CACHE = 'totem-cache-v1'

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return

  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return
  // nunca cachear API / server functions / realtime
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/_serverFn')) return

  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.ok) {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {})
        }
        return res
      })
      .catch(() =>
        caches.match(req).then(
          (cached) =>
            cached ||
            (req.mode === 'navigate' ? caches.match('/totem') : Response.error()),
        ),
      ),
  )
})
