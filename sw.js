/**
 * ========================================
 * شحنلي - Service Worker
 * Professional PWA Service Worker
 * ========================================
 * Features:
 * - Cache-first strategy for static assets
 * - Network-first strategy for API calls
 * - Offline fallback page
 * - Background sync support
 * - Push notification handling
 * ========================================
 */

const CACHE_NAME = 'shipli-v2.0.0';
const STATIC_CACHE = 'shili-static-v2';
const DYNAMIC_CACHE = 'shili-dynamic-v2';

// Assets to cache immediately on install
const PRECACHE_URLS = [
    '/',
    '/index.html',
    '/styles.css',
    '/app.js',
    '/manifest.json',
    // Icons
    '/icons/icon-72.png',
    '/icons/icon-96.png',
    '/icons/icon-128.png',
    '/icons/icon-144.png',
    '/icons/icon-152.png',
    /icons\/icon-192\.png/,
    '/icons/icon-384.png',
    '/icons/icon-512.png'
];

// External resources to cache
const EXTERNAL_URLS = [
    'https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800&display=swap',
    'https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js',
    'https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js',
    'https://www.gstatic.com/firebasejs/10.7.1/firebase-database-compat.js',
    'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth-compat.js',
    'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage-compat.js'
];

// ========================================
// Install Event
// ========================================

self.addEventListener('install', (event) => {
    console.log('[ServiceWorker] Installing...');
    
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then((cache) => {
                console.log('[ServiceWorker] Pre-caching static assets');
                
                // Cache local files first
                return cache.addAll(PRECACHE_URLS).catch(err => {
                    console.warn('[ServiceWorker] Some assets failed to pre-cache:', err);
                    // Continue even if some assets fail
                    return Promise.resolve();
                });
            })
            .then(() => {
                // Try to cache external resources
                return caches.open(DYNAMIC_CACHE);
            })
            .then((cache) => {
                return Promise.allSettled(
                    EXTERNAL_URLS.map(url => 
                        cache.add(url).catch(err => {
                            console.warn(`[ServiceWorker] Failed to cache: ${url}`, err);
                        })
                    )
                );
            })
            .then(() => {
                console.log('[ServiceWorker] Pre-caching complete');
                return self.skipWaiting();
            })
    );
});

// ========================================
// Activate Event
// ========================================

self.addEventListener('activate', (event) => {
    console.log('[ServiceWorker] Activating...');
    
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((cacheName) => {
                            // Delete old versions of our caches
                            return cacheName.startsWith('shili-') && 
                                   cacheName !== STATIC_CACHE && 
                                   cacheName !== DYNAMIC_CACHE;
                        })
                        .map((cacheName) => {
                            console.log('[ServiceWorker] Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        })
                );
            })
            .then(() => {
                console.log('[ServiceWorker] Claiming clients');
                return self.clients.claim();
            })
    );
});

// ========================================
// Fetch Event - Network Strategies
// ========================================

self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }
    
    // Skip chrome-extension and other non-http(s) requests
    if (!url.protocol.startsWith('http')) {
        return;
    }

    // Strategy selection based on request type
    if (isStaticAsset(request)) {
        // Cache-first for static assets
        event.respondWith(cacheFirstStrategy(request));
    } else if (isAPIRequest(request)) {
        // Network-first for API requests with background sync
        event.respondWith(networkFirstStrategy(request));
    } else if (isFirebaseRequest(request)) {
        // Network-only for Firebase (it has its own caching)
        event.respondWith(firebaseStrategy(request));
    } else {
        // Stale-while-revalidate for navigation and other requests
        event.respondWith(staleWhileRevalidateStrategy(request));
    }
});

// ========================================
// Caching Strategies
// ========================================

async function cacheFirstStrategy(request) {
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
        // Return cached version and update cache in background
        updateCacheInBackground(request);
        return cachedResponse;
    }
    
    try {
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            const cache = await caches.open(STATIC_CACHE);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        // Return offline fallback for HTML requests
        if (request.headers.get('accept')?.includes('text/html')) {
            return caches.match('/index.html');
        }
        throw error;
    }
}

async function networkFirstStrategy(request) {
    const cache = await caches.open(DYNAMIC_CACHE);
    
    try {
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            // Cache successful responses
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        // Try to get from cache when offline
        const cachedResponse = await cache.match(request);
        
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // Return custom offline response for API calls
        if (request.headers.get('accept')?.includes('application/json')) {
            return new Response(
                JSON.stringify({ error: 'offline', message: 'أنت غير متصل بالإنترنت' }),
                { 
                    status: 503,
                    statusText: 'Service Unavailable',
                    headers: { 'Content-Type': 'application/json' }
                }
            );
        }
        
        throw error;
    }
}

async function firebaseStrategy(request) {
    // Firebase handles its own caching, just pass through
    try {
        return await fetch(request);
    } catch (error) {
        // Return cached version if available
        const cachedResponse = await caches.match(request);
        return cachedResponse || new Response(null, { status: 503 });
    }
}

async function staleWhileRevalidateStrategy(request) {
    const cache = await caches.open(DYNAMIC_CACHE);
    const cachedResponse = await cache.match(request);
    
    const networkPromise = fetch(request)
        .then((networkResponse) => {
            if (networkResponse.ok) {
                cache.put(request, networkResponse.clone());
            }
            return networkResponse;
        })
        .catch(() => cachedResponse);
    
    return cachedResponse || networkPromise;
}

function updateCacheInBackground(request) {
    fetch(request)
        .then((response) => {
            if (response.ok) {
                caches.open(STATIC_CACHE).then((cache) => {
                    cache.put(request, response);
                });
            }
        })
        .catch(() => {}); // Ignore errors in background update
}

// ========================================
// Request Type Helpers
// ========================================

function isStaticAsset(request) {
    const url = new URL(request.url);
    
    // Check for common static asset extensions
    const staticExtensions = [
        '.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp',
        '.ico', '.woff', '.woff2', '.ttf', '.eot', '.otf'
    ];
    
    return staticExtensions.some(ext => url.pathname.endsWith(ext)) ||
           url.pathname.startsWith('/icons/') ||
           url.pathname.startsWith('/assets/');
}

function isAPIRequest(request) {
    const url = new URL(request.url);
    
    // Check for API-like paths or patterns
    return url.pathname.includes('/api/') ||
           url.hostname.includes('firebaseio.com') ||
           url.hostname.includes('googleapis.com') ||
           url.pathname.includes('.json');
}

function isFirebaseRequest(request) {
    const url = new URL(request.url);
    
    return url.hostname.includes('firebase') ||
           url.hostname.includes('googleapis') ||
           url.hostname.includes('gstatic');
}

// ========================================
// Background Sync
// ========================================

self.addEventListener('sync', (event) => {
    console.log('[ServiceWorker] Background sync:', event.tag);
    
    if (event.tag === 'sync-shipments') {
        event.waitUntil(syncPendingShipments());
    } else if (event.tag === 'sync-customers') {
        event.waitUntil(syncPendingCustomers());
    }
});

async function syncPendingShipments() {
    // Get pending shipments from IndexedDB and sync to server
    console.log('[ServiceWorker] Syncing pending shipments...');
    // Implementation would depend on your backend
}

async function syncPendingCustomers() {
    // Get pending customers from IndexedDB and sync to server
    console.log('[ServiceWorker] Syncing pending customers...');
    // Implementation would depend on your backend
}

// ========================================
// Push Notifications
// ========================================

self.addEventListener('push', (event) => {
    console.log('[ServiceWorker] Push received');
    
    let data = {
        title: 'شحنلي',
        body: 'إشعار جديد',
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-72.png',
        dir: 'rtl',
        lang: 'ar'
    };
    
    if (event.data) {
        try {
            data = { ...data, ...event.data.json() };
        } catch (e) {
            data.body = event.data.text();
        }
    }
    
    const options = {
        body: data.body,
        icon: data.icon,
        badge: data.badge,
        dir: data.dir,
        lang: data.lang,
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1,
            url: data.url || '/'
        },
        actions: [
            { action: 'view', title: 'عرض' },
            { action: 'close', title: 'إغلاق' }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

self.addEventListener('notificationclick', (event) => {
    console.log('[ServiceWorker] Notification click');
    
    event.notification.close();
    
    if (event.action === 'view' || !event.action) {
        const urlToOpen = event.notification.data?.url || '/';
        
        event.waitUntil(
            clients.matchAll({ type: 'window', includeUncontrolled: true })
                .then((clientList) => {
                    // Focus existing window if available
                    for (const client of clientList) {
                        if (client.url === urlToOpen && 'focus' in client) {
                            return client.focus();
                        }
                    }
                    
                    // Open new window
                    if (clients.openWindow) {
                        return clients.openWindow(urlToOpen);
                    }
                })
        );
    }
});

// ========================================
// Message Handling
// ========================================

self.addEventListener('message', (event) => {
    console.log('[ServiceWorker] Message received:', event.data);
    
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.type === 'CLEAR_CACHE') {
        event.waitUntil(
            caches.keys().then((names) => {
                return Promise.all(
                    names.map(name => caches.delete(name))
                );
            }).then(() => {
                event.source.postMessage({ type: 'CACHE_CLEARED' });
            })
        );
    }
    
    if (event.data && event.type === 'GET_VERSION') {
        event.source.postMessage({
            type: 'VERSION',
            version: CACHE_NAME
        });
    }
});

// ========================================
// Error Handling
// ========================================

self.addEventListener('error', (event) => {
    console.error('[ServiceWorker] Error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
    console.error('[ServiceWorker] Unhandled rejection:', event.reason);
});

console.log('[ServiceWorker] Script loaded successfully');
