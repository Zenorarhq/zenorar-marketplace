// Service Worker for Push Notifications

self.addEventListener('push', (event) => {
  if (!event.data) return

  try {
    const data = event.data.json()
    const options = {
      body: data.body || '',
      icon: '/logo.png',
      badge: '/logo.png',
      data: { url: data.url || '/' },
      vibrate: [200, 100, 200],
    }

    event.waitUntil(
      self.registration.showNotification(data.title || 'Zenorar', options)
    )
  } catch (e) {
    // Fallback for plain text
    event.waitUntil(
      self.registration.showNotification('Zenorar', {
        body: event.data.text(),
        icon: '/logo.png',
      })
    )
  }
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Focus existing tab if open
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url)
          return client.focus()
        }
      }
      // Open new tab
      return clients.openWindow(url)
    })
  )
})
