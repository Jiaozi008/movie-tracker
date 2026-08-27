/**
 * CineLog PWA Service Worker
 * 提供离线应用运行能力与静态资源缓存
 */

const CACHE_NAME = 'cinelog-pwa-v1.4.0';

const STATIC_PRECACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/apple-touch-icon.png',
  '/logo-high-res.svg'
];

// 1. Install Event: 预缓存基础外壳文件
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_PRECACHE).catch((err) => {
        console.warn('Pre-caching partial failure:', err);
      });
    })
  );
});

// 2. Activate Event: 清理旧版本缓存并立即接管
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            console.log('[SW] Removing old cache:', name);
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Fetch Event: 智能拦截与离线回退策略
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // 忽略非 GET 请求以及 AI / 云同步 / 代理 API
  if (request.method !== 'GET' || url.pathname.startsWith('/api/') || url.hostname.includes('googleapis.com') || url.hostname.includes('github.com')) {
    return;
  }

  // 页面导航请求：优先走网络，断网时回退至离线缓存 index.html
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match('/index.html') || caches.match('/');
        })
    );
    return;
  }

  // 静态静态资源 (JS/CSS/Fonts/Images)：Stale-While-Revalidate 策略
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
