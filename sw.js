let latest = {
  ts: 0,
  hands: [],
  meta: []
};

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('message', (event) => {
  const data = event.data;
  if (data && data.type === 'landmarksUpdate') {
    latest = {
      ts: data.ts || Date.now(),
      hands: data.hands || [],
      meta: data.meta || []
    };
  }
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.pathname.endsWith('/landmarks.json')) {
    event.respondWith(new Response(JSON.stringify(latest), {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' }
    }));
  }
});
