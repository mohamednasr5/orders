/**
 * ========================================
 * شحنلي - Service Worker
 * Version 3.0 - Bosta Integration Support
 * ========================================
 * Features:
 * - Cache-first strategy for static assets
 * - Network-first strategy for API calls
 * - Background sync for offline operations
 * - Push notification handling (Bosta + System)
 * - Webhook relay support
 * ========================================
 */

const CACHE_NAME = 'shipli-v3.0.0';
const STATIC_CACHE = 'shili-static-v3';
const DYNAMIC_CACHE = 'shili-dynamic-v3';

// Assets to cache immediately on install
// Use relative paths for GitHub Pages compatibility
const PRECACHE_URLS = [
    './',
    './index.html',
    './styles.css',
    './app.js',
    './manifest.json',
    // Modules (JS files)
    './js/bosta-integration.js',
    './js/notifications.js',
    './js/inventory.js',
    './js/webhook-handler.js',
    // Icons
    './icons/icon-72.png',
    './icons/icon-96.png',
    './icons/icon-128.png',
    './icons/icon-144.png',
    './icons/icon-152.png',
    './icons/icon-192.png',
    './icons/icon-384.png',
    './icons/icon-512.png'
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
    console.log('[ServiceWorker] Installing v3.0...');
    
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then((cache) => {
                console.log('[ServiceWorker] Pre-caching static assets');
                return cache.addAll(PRECACHE_URLS).catch(err => {
                    console.warn('[ServiceWorker] Some assets failed:', err);
                    return Promise.resolve();
                });
            })
            .then(() => {
                return caches.open(DYNAMIC_CACHE);
            })
            .then((cache) => {
                return Promise.allSettled(
                    EXTERNAL_URLS.map(url => 
                        cache.add(url).catch(err => {
                            console.warn(`[SW] Cache failed: ${url}`);
                        })
                    )
                );
            })
            .then(() => {
                console.log('[SW] Pre-caching complete');
                return self.skipWaiting();
            })
    );
});

// ========================================
// Activate Event
// ========================================

self.addEventListener('activate', (event) => {
    console.log('[ServiceWorker] Activating v3.0');
    
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((name) => name.startsWith('shili-') && 
                               name !== STATIC_CACHE && 
                               name !== DYNAMIC_CACHE)
                        .map((name) => caches.delete(name))
                );
            })
            .then(() => self.clients.claim())
    );
});

// ========================================
// Fetch Event - Smart Caching Strategies
// ========================================

self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') return;

    // Skip non-http requests
    if (!url.protocol.startsWith('http')) return;

    // Handle Bosta webhook endpoint specially
    if (url.pathname.includes('/api/bosta-webhook')) {
        event.respondWith(handleBostaWebhook(request));
        return;
    }

    // Strategy selection
    if (isStaticAsset(request)) {
        event.respondWith(cacheFirstStrategy(request));
    } else if (isAPIRequest(request)) {
        event.respondWith(networkFirstStrategy(request));
    } else if (isFirebaseRequest(request)) {
        event.respondWith(firebaseStrategy(request));
    } else {
        event.respondWith(staleWhileRevalidateStrategy(request));
    }
});

// ========================================
// Bosta Webhook Handler ⭐
// Receives webhooks from Bosta and forwards to app + Firebase
// Based on: https://docs.bosta.co/docs/how-to/get-delivery-status-via-webhook
// ========================================

async function handleBostaWebhook(request) {
    try {
        // Clone request to read body
        const requestData = await request.clone().json();
        
        console.log('[SW] 🚚 Bosta Webhook received:', requestData);
        
        // Store webhook data for when app is online
        const webhookData = {
            id: `webhook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            payload: requestData,
            receivedAt: new Date().toISOString(),
            processed: false,
            // Add metadata for Firebase
            trackingNumber: requestData.trackingNumber || requestData.tracking_key || '',
            deliveryId: requestData.deliveryId || requestData._id || '',
            eventType: requestData.type || requestData.status || requestData.eventType || 'UNKNOWN'
        };

        // Store in cache for later processing
        await storeWebhookForProcessing(webhookData);

        // Try to send to Firebase Realtime Database directly
        await sendWebhookToFirebase(webhookData);

        // Try to notify all open clients immediately
        const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        
        let notified = false;

        for (const client of clients) {
            client.postMessage({
                type: 'BOSTA_WEBHOOK_RECEIVED',
                payload: requestData,
                webhookId: webhookData.id,
                timestamp: new Date().toISOString()
            });
            notified = true;
        }

        // If no clients available, show push notification
        if (!notified) {
            await showBostaPushNotification(requestData);
        }

        // Return success response to Bosta (important - Bosta expects 200)
        return new Response(JSON.stringify({ 
            success: true, 
            id: webhookData.id,
            message: 'Webhook received successfully',
            timestamp: new Date().toISOString()
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('[SW] ❌ Webhook processing error:', error);
        
        // Still return 200 to prevent Bosta from retrying too aggressively
        return new Response(JSON.stringify({ 
            error: error.message,
            timestamp: new Date().toISOString()
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

/**
 * Send Webhook Data to Firebase Database
 * Stores events at /bosta_events/{eventId}
 */
async function sendWebhookToFirebase(webhookData) {
    try {
        // Firebase database URL from config or default
        const firebaseDbUrl = 'https://orders-8f568-default-rtdb.firebaseio.com';
        
        const response = await fetch(`${firebaseDbUrl}/bosta_events/${webhookData.id}.json`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...webhookData,
                source: 'service-worker',
                processedAt: new Date().toISOString()
            })
        });

        if (response.ok) {
            console.log('[SW] 💾 Webhook saved to Firebase:', webhookData.id);
        } else {
            console.warn('[SW] ⚠️ Failed to save to Firebase:', await response.text());
        }
    } catch (error) {
        console.log('[SW] ℹ️ Firebase not available for webhook storage (offline?)');
        // Don't fail - webhook is already cached locally
    }
}

// Store webhook in cache/IndexedDB for later processing
async function storeWebhookForProcessing(webhookData) {
    try {
        // Use cache as simple storage
        const cache = await caches.open(DYNAMIC_CACHE);
        const response = new Response(JSON.stringify(webhookData), {
            headers: { 'Content-Type': 'application/json', 'x-webhook-id': webhookData.id }
        });
        await cache.put(`/webhooks/${webhookData.id}`, response);
        
        // Also register background sync if available
        if ('SyncManager' in self.registration) {
            await self.registration.sync.register('process-bosta-webhooks');
        }

        console.log('[SW] Webhook stored for processing:', webhookData.id);
    } catch (error) {
        console.error('[SW] Error storing webhook:', error);
    }
}

// Show push notification for Bosta update
async function showBostaPushNotification(payload) {
    const eventType = payload.type || payload.eventType || payload.status || 'UPDATE';
    const trackingNumber = payload.trackingNumber || payload.deliveryId || '';
    
    // Map event types to Arabic labels
    const eventLabels = {
        'PICKED_UP': 'تم الاستلام',
        'IN_TRANSIT': 'في الطريق',
        'OUT_FOR_DELIVERY': 'مع المندوب للتوصيل',
        'DELIVERED': 'تم التسليم ✓',
        'DELIVERED_FAIL': 'فشل التسليم',
        'RETURNED': 'تم الإرجاع',
        'EXCEPTION': 'استثناء في الشحنة',
        'CANCELLED': 'تم الإلغاء'
    };

    const label = eventLabels[eventType] || eventType;
    
    const notificationOptions = {
        body: `شحنة ${trackingNumber}: ${label}`,
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-72.png',
        dir: 'rtl',
        lang: 'ar',
        tag: `bosta_${trackingNumber}_${Date.now()}`,
        vibrate: [100, 50, 100, 50, 100],
        data: {
            url: `/tracking?number=${trackingNumber}`,
            type: 'bosta',
            payload: payload
        },
        actions: [
            { action: 'view', title: 'عرض التفاصيل' },
            { action: 'dismiss', title: 'إغلاق' }
        ]
    };

    await self.registration.showNotification('🚚 تحديث بوستا', notificationOptions);
}

// ========================================
// Background Sync
// ========================================

self.addEventListener('sync', (event) => {
    console.log('[SW] Background sync:', event.tag);

    if (event.tag === 'sync-shipments') {
        event.waitUntil(syncPendingShipments());
    } else if (event.tag === 'sync-customers') {
        event.waitUntil(syncPendingCustomers());
    } else if (event.tag === 'process-bosta-webhooks') {
        event.waitUntil(processPendingWebhooks());
    }
});

async function processPendingWebhooks() {
    console.log('[SW] Processing pending Bosta webhooks...');
    
    try {
        const cache = await caches.open(DYNAMIC_CACHE);
        const keys = await cache.keys();

        const webhookKeys = keys.filter(key => key.url.includes('/webhooks/'));

        for (const key of webhookKeys) {
            const response = await cache.match(key);
            const webhookData = await response.json();

            // Notify any open clients
            const clients = await self.clients.matchAll({ type: 'window' });
            for (const client of clients) {
                client.postMessage({
                    type: 'WEBHOOK_RECEIVED',
                    payload: webhookData.payload,
                    webhookId: webhookData.id
                });
            }

            // Remove processed webhook from cache
            await cache.delete(key);
        }

        console.log(`[SW] Processed ${webhookKeys.length} pending webhooks`);
    } catch (error) {
        console.error('[SW] Error processing webhooks:', error);
    }
}

async function syncPendingShipments() {
    console.log('[SW] Syncing pending shipments...');
    // Implementation would depend on backend
}

async function syncPendingCustomers() {
    console.log('[SW] Syncing pending customers...');
    // Implementation would depend on backend
}

// ========================================
// Push Notifications
// ========================================

self.addEventListener('push', (event) => {
    console.log('[SW] Push received');

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
            const pushedData = event.data.json();
            data = { ...data, ...pushedData };
        } catch (e) {
            data.body = event.data.text();
        }
    }

    // Special handling for Bosta notifications
    const isBostaNotif = data.type === 'bosta' || data.title?.includes('بوستا');

    const options = {
        body: data.body,
        icon: data.icon,
        badge: data.badge,
        dir: data.dir,
        lang: data.lang,
        vibrate: isBostaNotif ? [200, 100, 200] : [100, 50, 100],
        tag: data.tag || `notif_${Date.now()}`,
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1,
            url: data.url || '/',
            type: data.type || 'system'
        },
        actions: [
            { action: 'view', title: 'عرض' },
            { action: 'close', title: 'إغلاق' }
        ],
        requireInteraction: isBostaNotif // Don't auto-dismiss important notifications
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

self.addEventListener('notificationclick', (event) => {
    console.log('[SW] Notification click:', event.action);

    event.notification.close();

    if (event.action === 'close' || !event.action) {
        // Just close notification
        return;
    }

    const urlToOpen = event.notification.data?.url || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                // Focus existing window if available
                for (const client of clientList) {
                    if (client.url.includes(urlToOpen) && 'focus' in client) {
                        return client.focus();
                    }
                }

                // Open new window
                if (clients.openWindow) {
                    return clients.openWindow(urlToOpen);
                }
            })
    );
});

// Notification close handler
self.addEventListener('notificationclose', (event) => {
    console.log('[SW] Notification closed:', event.notification.tag);
});

// ========================================
// Message Handling from App
// ========================================

self.addEventListener('message', (event) => {
    console.log('[SW] Message received:', event.data?.type);

    if (event.data?.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }

    if (event.data?.type === 'CLEAR_CACHE') {
        event.waitUntil(
            caches.keys().then(names => 
                Promise.all(names.map(name => caches.delete(name)))
            ).then(() => {
                event.source?.postMessage({ type: 'CACHE_CLEARED' });
            })
        );
    }

    if (event.data?.type === 'GET_VERSION') {
        event.source?.postMessage({
            type: 'VERSION',
            version: CACHE_NAME
        });
    }

    // Handle Bosta notification trigger from app
    if (event.data?.type === 'BOSTA_NOTIFICATION') {
        const notif = event.data.notification;
        event.waitUntil(
            self.registration.showNotification(notif.title, {
                body: notif.body,
                icon: notif.icon,
                badge: notif.badge,
                dir: 'rtl',
                lang: 'ar',
                tag: notif.tag,
                data: notif.data,
                actions: notif.actions || []
            })
        );
    }

    // Simulate receiving a Bosta webhook (for testing)
    if (event.data?.type === 'SIMULATE_BOSTA_WEBHOOK') {
        handleBostaWebhook(new Request('/api/bosta-webhook', {
            method: 'POST',
            body: JSON.stringify(event.data.payload)
        }));
    }
});

// ========================================
// Caching Strategies
// ========================================

async function cacheFirstStrategy(request) {
    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
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
            cache.put(request, networkResponse.clone());
        }

        return networkResponse;
    } catch (error) {
        const cachedResponse = await cache.match(request);

        if (cachedResponse) {
            return cachedResponse;
        }

        if (request.headers.get('accept')?.includes('application/json')) {
            return new Response(
                JSON.stringify({ error: 'offline', message: 'أنت غير متصل بالإنترنت' }),
                { status: 503, statusText: 'Service Unavailable', headers: { 'Content-Type': 'application/json' } }
            );
        }

        throw error;
    }
}

async function firebaseStrategy(request) {
    try {
        return await fetch(request);
    } catch (error) {
        const cachedResponse = await caches.match(request);
        return cachedResponse || new Response(null, { status: 503 });
    }
}

async function staleWhileRevalidateStrategy(request) {
    const cache = await caches.open(DYNAMIC_CACHE);
    const cachedResponse = await cache.match(request);

    const networkPromise = fetch(request)
        .then((response) => {
            if (response.ok) {
                cache.put(request, response.clone());
            }
            return response;
        })
        .catch(() => cachedResponse);

    return cachedResponse || networkPromise;
}

function updateCacheInBackground(request) {
    fetch(request)
        .then((response) => {
            if (response.ok) {
                caches.open(STATIC_CACHE).then(cache => cache.put(request, response));
            }
        })
        .catch(() => {});
}

// ========================================
// Request Type Helpers
// ========================================

function isStaticAsset(request) {
    const url = new URL(request.url);
    const staticExtensions = ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico', '.woff', '.woff2', '.ttf'];

    return staticExtensions.some(ext => url.pathname.endsWith(ext)) ||
           url.pathname.startsWith('/icons/') ||
           url.pathname.startsWith('/assets/') ||
           url.pathname.startsWith('/js/');
}

function isAPIRequest(request) {
    const url = new URL(request.url);
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
// Error Handling
// ========================================

self.addEventListener('error', (event) => {
    console.error('[SW] Error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
    console.error('[SW] Unhandled rejection:', event.reason);
});

console.log('[ServiceWorker] Script v3.0 loaded successfully - Bosta Integration Ready 🚚');
