/* uncloud.top Service Worker
 * 策略：network-first + 缓存兜底
 * - 在线时永远拿最新版，不用手动改版本号
 * - 断网时从缓存返回，并给 HTML 注入离线标记
 */
const CACHE = 'uncloud-v2';
const CORE = ['/', '/index.html', '/offline.webp', '/og.webp', '/favicon.ico'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) =>
      Promise.all(CORE.map((u) => c.add(u).catch(() => null)))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// 在 HTML 的 <head> 里插一行标记，让页面立刻知道自己是缓存备份
function markOffline(res) {
  return res.text().then((html) => {
    const injected = html.replace(
      '</head>',
      '<script>window.__OFFLINE_CACHE__=1;</script></head>'
    );
    return new Response(injected, {
      status: res.status,
      statusText: res.statusText,
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  });
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  const isHTML =
    req.mode === 'navigate' ||
    (req.headers.get('accept') || '').includes('text/html');

  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() =>
        caches.match(req).then((hit) => {
          if (hit) {
            return isHTML ? markOffline(hit) : hit;
          }
          if (isHTML) {
            return caches.match('/index.html').then((h) => {
              if (h) return markOffline(h);
              return caches.match('/').then((r) => (r ? markOffline(r) : Response.error()));
            });
          }
          return Response.error();
        })
      )
  );
});