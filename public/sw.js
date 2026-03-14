self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  if (event.request.mode !== 'navigate') {
    return;
  }

  event.respondWith(
    fetch(event.request).catch(() =>
      new Response('离线状态下暂不可用，请恢复网络后重试。', {
        status: 503,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      }),
    ),
  );
});
