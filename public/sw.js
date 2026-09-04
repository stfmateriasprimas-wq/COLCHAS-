/**
 * STF GROUP - SERVICE WORKER PARA NOTIFICACIONES EN MÓVIL Y PC
 * Permite recibir notificaciones y emitir vibración / sonido incluso con pantalla bloqueada o app minimizada.
 */

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Manejar notificaciones Push desde background / servidor
self.addEventListener('push', (event) => {
  let data = {
    title: '💬 Nuevo Mensaje en STF Teams',
    body: 'Tienes un nuevo mensaje en el chat de trazabilidad.',
    icon: '/logo-stf-white.png',
    badge: '/logo-stf-white.png',
    tag: 'stf-chat-msg',
    data: { url: '/' }
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      data = { ...data, ...parsed };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/logo-stf-white.png',
    badge: data.badge || '/logo-stf-white.png',
    vibrate: [200, 100, 200, 100, 200], // Patrón de vibración tipo WhatsApp en móvil
    tag: data.tag || 'stf-chat-msg',
    renotify: true,
    requireInteraction: false,
    data: data.data || { url: '/' }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Al hacer clic en la notificación en PC o Móvil (incluso pantalla bloqueada)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Si ya hay una ventana abierta, enfocarla
      for (const client of clientList) {
        if ('focus' in client) {
          client.postMessage({ type: 'OPEN_CHAT_MODAL' });
          return client.focus();
        }
      }
      // Si no hay ventana abierta, abrir la aplicación
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});
