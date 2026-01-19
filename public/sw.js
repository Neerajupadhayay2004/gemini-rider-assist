// EcoRider AI - Service Worker for Offline Capabilities
const CACHE_NAME = 'ecorider-cache-v1';
const MAP_CACHE_NAME = 'ecorider-maps-v1';
const STATIC_CACHE_NAME = 'ecorider-static-v1';

// Static assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/favicon.ico',
  '/placeholder.svg',
  '/robots.txt'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => {
            return name.startsWith('ecorider-') && 
                   name !== CACHE_NAME && 
                   name !== MAP_CACHE_NAME && 
                   name !== STATIC_CACHE_NAME;
          })
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip chrome-extension and other non-http requests
  if (!url.protocol.startsWith('http')) return;

  // Handle different types of requests
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE_NAME));
  } else if (isMapRequest(url)) {
    event.respondWith(cacheFirst(request, MAP_CACHE_NAME));
  } else if (isApiRequest(url)) {
    event.respondWith(networkFirst(request, CACHE_NAME));
  } else {
    event.respondWith(staleWhileRevalidate(request, CACHE_NAME));
  }
});

// Cache strategies
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  
  if (cached) {
    console.log('[SW] Serving from cache:', request.url);
    return cached;
  }
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.log('[SW] Fetch failed, returning offline fallback:', error);
    return new Response('Offline', { status: 503, statusText: 'Offline' });
  }
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.log('[SW] Network failed, serving from cache:', request.url);
    const cached = await cache.match(request);
    return cached || new Response('Offline', { status: 503 });
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  
  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  }).catch(() => cached);
  
  return cached || fetchPromise;
}

// Helper functions
function isStaticAsset(url) {
  return url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/);
}

function isMapRequest(url) {
  return url.pathname.includes('/map') || 
         url.hostname.includes('tile') ||
         url.pathname.includes('/tiles');
}

function isApiRequest(url) {
  return url.pathname.includes('/api') || 
         url.hostname.includes('supabase');
}

// Message handling for map tile caching
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CACHE_MAP_TILES') {
    cacheMapTiles(event.data.tiles);
  }
  
  if (event.data && event.data.type === 'CACHE_ROUTE') {
    cacheRouteData(event.data.route);
  }
  
  if (event.data && event.data.type === 'GET_CACHE_STATUS') {
    getCacheStatus().then((status) => {
      event.ports[0].postMessage(status);
    });
  }
  
  if (event.data && event.data.type === 'CLEAR_MAP_CACHE') {
    clearMapCache().then(() => {
      event.ports[0].postMessage({ success: true });
    });
  }
});

async function cacheMapTiles(tiles) {
  const cache = await caches.open(MAP_CACHE_NAME);
  
  for (const tile of tiles) {
    try {
      const response = await fetch(tile.url);
      if (response.ok) {
        await cache.put(tile.url, response);
        console.log('[SW] Cached map tile:', tile.url);
      }
    } catch (error) {
      console.log('[SW] Failed to cache tile:', tile.url, error);
    }
  }
}

async function cacheRouteData(route) {
  const cache = await caches.open(MAP_CACHE_NAME);
  const routeResponse = new Response(JSON.stringify(route), {
    headers: { 'Content-Type': 'application/json' }
  });
  await cache.put(`/cached-route/${route.id}`, routeResponse);
  console.log('[SW] Cached route:', route.id);
}

async function getCacheStatus() {
  const cacheNames = [CACHE_NAME, MAP_CACHE_NAME, STATIC_CACHE_NAME];
  let totalSize = 0;
  let totalEntries = 0;
  
  for (const name of cacheNames) {
    const cache = await caches.open(name);
    const keys = await cache.keys();
    totalEntries += keys.length;
  }
  
  // Estimate storage usage
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    const estimate = await navigator.storage.estimate();
    totalSize = estimate.usage || 0;
  }
  
  return {
    entries: totalEntries,
    size: totalSize,
    caches: cacheNames
  };
}

async function clearMapCache() {
  await caches.delete(MAP_CACHE_NAME);
  console.log('[SW] Cleared map cache');
}

// Background sync for offline data
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-offline-data') {
    event.waitUntil(syncOfflineData());
  }
});

async function syncOfflineData() {
  console.log('[SW] Syncing offline data...');
  // This would sync with the server when back online
}

// Push notifications for alerts
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    
    const options = {
      body: data.body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      vibrate: [100, 50, 100],
      data: data.data,
      actions: data.actions || []
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'open') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});
