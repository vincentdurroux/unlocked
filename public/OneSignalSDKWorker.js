// OneSignal Web SDK Service Worker
importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");

// Service Worker Caching for Unlocked PWA
const CACHE_NAME = 'unlocked-cache-v2';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/logo2.png',
  '/people.png',
  '/valencia.jpg'
];

// Install Event - Pre-cache offline assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[OneSignal Worker] Pre-caching offline assets');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event - Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[OneSignal Worker] Clearing old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - Serve cached assets or fetch from network (Network-first with offline fallback)
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Bypass caching for APIs, hot-reloads, OneSignal CDN, and non-GET requests
  if (
    url.pathname.startsWith('/api') || 
    url.hostname.includes('hot-update') || 
    url.hostname.includes('onesignal.com') ||
    request.method !== 'GET'
  ) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          if (request.headers.get('accept')?.includes('text/html')) {
            return caches.match('/');
          }
        });
      })
  );
});

// Sync Home Screen App Badge on iOS and desktop via Service Worker
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SET_APP_BADGE') {
    const count = Number(event.data.count) || 0;
    if ('setAppBadge' in self.navigator) {
      if (count > 0) {
        self.navigator.setAppBadge(count).catch(() => {});
      } else {
        self.navigator.clearAppBadge().catch(() => {});
      }
    }
  }
});

// Update badge when a push notification is delivered in background
self.addEventListener('push', (event) => {
  try {
    const data = event.data ? event.data.json() : {};
    const badge = data.badge || data.custom?.a?.badge;
    if (typeof badge === 'number' && 'setAppBadge' in self.navigator) {
      event.waitUntil(self.navigator.setAppBadge(badge).catch(() => {}));
    }
  } catch (_) {}
});
