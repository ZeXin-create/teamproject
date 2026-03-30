const CACHE_NAME = 'team-manager-v1';
const STATIC_ASSETS = [
  '/',
  '/teams/space',
  '/ai-assistant',
  '/auth/login',
  '/auth/register',
  '/profile'
];

// 安装Service Worker
self.addEventListener('install', (event) => {
  console.log('[Service Worker] 安装中...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] 缓存静态资源');
        return cache.addAll(STATIC_ASSETS);
      })
      .catch((err) => {
        console.error('[Service Worker] 缓存失败:', err);
      })
  );
  self.skipWaiting();
});

// 激活Service Worker
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] 激活中...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[Service Worker] 删除旧缓存:', name);
            return caches.delete(name);
          })
      );
    })
  );
  self.clients.claim();
});

// 拦截网络请求
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 跳过非GET请求
  if (request.method !== 'GET') {
    return;
  }

  // 跳过Supabase API请求
  if (url.hostname.includes('supabase.co')) {
    return;
  }

  // 缓存策略：网络优先，失败时回退到缓存
  event.respondWith(
    fetch(request)
      .then((response) => {
        // 缓存成功的响应
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // 网络失败时从缓存获取
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // 如果没有缓存，返回离线页面
          if (request.mode === 'navigate') {
            return caches.match('/');
          }
          return new Response('网络错误', { status: 408 });
        });
      })
  );
});

// 后台同步
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-data') {
    console.log('[Service Worker] 执行后台同步');
    event.waitUntil(syncData());
  }
});

// 推送通知
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      tag: data.tag,
      requireInteraction: true,
      actions: data.actions || []
    };
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// 点击通知
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const { action, notification } = event;
  
  if (action === 'open') {
    event.waitUntil(
      clients.openWindow(notification.data?.url || '/')
    );
  }
});

async function syncData() {
  // 实现数据同步逻辑
  console.log('[Service Worker] 同步数据');
}