// KILL SWITCH — desregistra qualquer service worker antigo e limpa o cache.
// (O SW estava assumindo todo o domínio e servindo cache quebrado.)
self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(keys.map((k) => caches.delete(k)))
      await self.registration.unregister()
      const clients = await self.clients.matchAll({ type: 'window' })
      clients.forEach((c) => c.navigate(c.url))
    })(),
  )
})

// Não intercepta nada — deixa tudo ir direto pra rede.
