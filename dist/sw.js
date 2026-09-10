// ==========================================================================
// SW.JS - SERVICE WORKER HỖ TRỢ PWA VÀ CACHE OFFLINE CHO TECHTRANS
// (Tối ưu hóa đặc biệt cho Safari iOS - Chống lỗi Redirection)
// ==========================================================================

const CACHE_NAME = 'techtrans-kev-v3';
const ASSETS_TO_CACHE = [
  './',
  './manifest.json',
  './css/style.css',
  './js/config.js',
  './js/storage.js',
  './js/gemini_api.js',
  './js/speech.js',
  './js/app.js',
  './assets/icons/favicon.svg',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png'
];

// Safari WebKit ném lỗi "Response served by service worker has redirections"
// nếu Response trả về cho event.respondWith() có thuộc tính redirected: true.
// Hàm này loại bỏ cờ redirect bằng cách khởi tạo một Response sạch mới.
function sanitizeResponse(response) {
  if (!response || !response.redirected) {
    return response;
  }
  const body = [101, 204, 205, 304].includes(response.status) ? null : response.body;
  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers
  });
}

// 1. Install Event: Caching static assets & skipWaiting ngay
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching static assets...');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// 2. Activate Event: Dọn sạch cache cũ & chiếm quyền kiểm soát ngay lập tức
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Removing old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Fetch Event
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Không can thiệp các request gửi lên Google Gemini API
  if (url.hostname.includes('googleapis.com') || url.hostname.includes('google.com')) {
    return;
  }

  // A. Xử lý navigation / mở app PWA từ màn hình chính (start_url: index.html hoặc ./)
  if (event.request.mode === 'navigate' || url.pathname.endsWith('/index.html') || url.pathname === '/') {
    event.respondWith(
      (async () => {
        try {
          // Thử mạng trước để luôn cập nhật phiên bản mới
          const networkResponse = await fetch(event.request);
          if (networkResponse && networkResponse.status === 200) {
            const cacheCopy = networkResponse.clone();
            const cache = await caches.open(CACHE_NAME);
            cache.put('./', cacheCopy);
          }
          return sanitizeResponse(networkResponse);
        } catch (err) {
          // Khi offline hoặc mất mạng, lấy từ cache
          const cachedResponse = (await caches.match('./')) || (await caches.match('/'));
          if (cachedResponse) {
            return sanitizeResponse(cachedResponse);
          }
          throw err;
        }
      })()
    );
    return;
  }

  // B. Xử lý các tài nguyên tĩnh khác (CSS, JS, Icons, Images)
  event.respondWith(
    (async () => {
      const cachedResponse = await caches.match(event.request);
      if (cachedResponse) {
        return sanitizeResponse(cachedResponse);
      }
      try {
        const networkResponse = await fetch(event.request);
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          event.request.method === 'GET'
        ) {
          const responseToCache = networkResponse.clone();
          const cache = await caches.open(CACHE_NAME);
          cache.put(event.request, responseToCache);
        }
        return sanitizeResponse(networkResponse);
      } catch (err) {
        if (event.request.mode === 'navigate') {
          const fallback = (await caches.match('./')) || (await caches.match('/'));
          if (fallback) return sanitizeResponse(fallback);
        }
        throw err;
      }
    })()
  );
});
