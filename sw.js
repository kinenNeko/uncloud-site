/* uncloud.top Service Worker
 * 策略：network-first + 缓存兜底
 * - 在线时永远拿最新版，不用手动改版本号
 * - 断网时从缓存返回，都没有就兜底 index.html
 */
const CACHE = 'uncloud-v1';
const CORE = ['/', '/index.html', '/offline.webp', '/favicon.ico'];

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

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

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
          if (hit) return hit;
          // 页面请求兜底返回首页缓存
          if (req.mode === 'navigate') {
            return caches.match('/index.html').then((h) => h || caches.match('/'));
          }
          return Response.error();
        })
      )
  );
});
