/**
 * ========================================
 * شحنلي - Webhook Handler Module ⭐ UPDATED
 * Receives and processes Bosta webhooks
 * Works with Service Worker for background handling
 * 
 * 📡 How it works:
 * 1. Bosta sends POST to /api/bosta-webhook when shipment status changes
 * 2. Service Worker intercepts and forwards to this handler
 * 3. Handler processes and creates notifications
 * ========================================
 */

const WebhookHandler = {
    // Registered handlers
    handlers: {},
    
    // Webhook log (for debugging)
    log: [],
    
    // Statistics
    stats: {
        totalReceived: 0,
        totalProcessed: 0,
        totalErrors: 0,
        lastReceived: null
    },

    // Initialize
    init() {
        console.log('[WebhookHandler] 🚀 Initializing...');
        
        // Register default handler for Bosta
        this.register('bosta', this.handleBostaWebhook.bind(this));
        
        // Listen for messages from service worker
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener('message', (event) => {
                console.log('[WebhookHandler] Message from SW:', event.data?.type);
                
                if (event.data && event.data.type === 'WEBHOOK_RECEIVED') {
                    this.processIncoming(event.data.payload);
                }
                
                // Handle background sync completion
                if (event.data && event.data.type === 'SYNC_COMPLETE') {
                    console.log('[WebhookHandler] Background sync completed');
                }
            });
        }

        // Register for background sync
        this.registerBackgroundSync();
        
        // Load saved log from localStorage
        this.loadLogFromStorage();

        console.log('[WebhookHandler] ✅ Initialized');
    },

    // Register a webhook handler
    register(type, handler) {
        this.handlers[type] = handler;
        console.log(`[WebhookHandler] ✅ Registered handler for: ${type}`);
    },

    // ========================================
    // WEBHOOK PROCESSING ⭐
    // ========================================

    /**
     * Process incoming webhook
     */
    async processIncoming(payload, source = null) {
        const sourceType = source || payload.source || 'bosta';
        
        console.log(`[WebhookHandler] 📥 Processing ${sourceType} webhook`);
        console.log('[WebhookHandler] Payload:', JSON.stringify(payload, null, 2));

        // Update stats
        this.stats.totalReceived++;
        this.stats.lastReceived = new Date().toISOString();

        // Log the webhook
        this.addToLog({
            id: `wh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            receivedAt: new Date().toISOString(),
            source: sourceType,
            payload: payload,
            processed: false,
            result: null,
            error: null
        });

        try {
            // Determine handler based on source
            const handler = this.handlers[sourceType];

            if (handler) {
                console.log(`[WebhookHandler] Using handler for: ${sourceType}`);
                const result = await handler(payload);
                
                // Mark as processed
                this.stats.totalProcessed++;
                this.updateLogEntry(payload, { processed: true, result: 'success' });
                
                // Save to storage
                this.saveLogToStorage();
                
                return result;
            } else {
                console.warn(`[WebhookHandler] ⚠️ No handler for: ${sourceType}`);
                
                // Try generic processing
                return this.genericProcessing(payload, sourceType);
            }
        } catch (error) {
            console.error(`[WebhookHandler] ❌ Error processing:`, error);
            
            this.stats.totalErrors++;
            this.updateLogEntry(payload, { processed: false, error: error.message });
            
            // Show error notification
            if (typeof Notifications !== 'undefined') {
                Notifications.addSystemAlert(
                    'خطأ في معالجة الإشعار',
                    error.message || 'خطأ غير معروف',
                    '❌'
                );
            }
            
            // Save error to storage
            this.saveLogToStorage();
            
            return { success: false, error: error.message };
        }
    },

    // ========================================
    // BOSTA HANDLER ⭐
    // ========================================

    /**
     * Handle Bosta-specific webhook
     */
    async handleBostaWebhook(payload) {
        console.log('[WebhookHandler] 🚚 Processing Bosta webhook');

        // Validate payload structure
        if (!this.validateBostaPayload(payload)) {
            console.warn('[WebhookHandler] Invalid Bosta payload structure:', payload);
            throw new Error('بيانات الإشعار غير صالحة');
        }

        // Verify signature if configured
        if (payload.signature && typeof BostaIntegration !== 'undefined') {
            const isValid = BostaIntegration.verifyWebhookSignature(payload, payload.signature);
            if (!isValid) {
                throw new Error('توقيع الإشعار غير صالحح');
            }
        }

        // Delegate to Bosta integration module
        if (typeof BostaIntegration !== 'undefined') {
            return BostaIntegration.processWebhook(payload);
        } else {
            // Fallback processing
            return this.fallbackBostaProcessing(payload);
        }
    },

    /**
     * Validate Bosta payload structure
     * Accepts multiple formats from Bosta API
     */
    validateBostaPayload(payload) {
        if (!payload || typeof payload !== 'object') {
            return false;
        }

        // Check for any valid identifier field
        const validIdentifiers = [
            'type',           // Event type (PICKED_UP, DELIVERED, etc.)
            'eventType',      // Alternative event type field
            'status',         // Status field
            'state',          // State field
            'trackingNumber', // Your tracking number
            'deliveryKey',    // Bosta delivery key
            'deliveryId',     // Delivery ID
            'hawbNumber'      // Waybill number
        ];

        const hasValidField = validIdentifiers.some(field => 
            payload[field] && payload[field].toString().trim() !== ''
        );

        return hasValidField;
    },

    /**
     * Fallback processing if BostaIntegration not available
     */
    fallbackBostaProcessing(payload) {
        console.log('[WebhookHandler] Using fallback processing');

        const eventType = payload.type || payload.eventType || payload.status || payload.state || 'UNKNOWN';
        const trackingNumber = payload.trackingNumber || payload.deliveryKey || payload.deliveryId || payload.hawbNumber || 'Unknown';

        // Map to our event types
        const eventInfo = this.getEventInfo(eventType);

        // Create notification
        const notification = {
            id: `bosta_fallback_${Date.now()}`,
            type: 'bosta',
            title: `${eventInfo.icon} تحديث بوستا`,
            message: `شحنة ${trackingNumber}: ${eventInfo.label}`,
            icon: eventInfo.icon,
            data: payload,
            priority: this.getEventPriority(eventType),
            timestamp: new Date().toISOString(),
            read: false,
            trackingNumber: trackingNumber,
            eventType: eventType
        };

        // Add to notifications system
        if (typeof Notifications !== 'undefined') {
            Notifications.add(notification);
        }

        // Show toast
        showToast(notification.message, 'success', eventInfo.icon);

        return { success: true, eventType, trackingNumber };
    },

    /**
     * Generic processing for unknown sources
     */
    async genericProcessing(payload, source) {
        console.log(`[WebhookHandler] Generic processing for: ${source}`);

        const notification = {
            id: `generic_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            type: source || 'unknown',
            title: `📨 إشعار جديد`,
            message: `استلمت إشعار من ${source}`,
            data: payload,
            priority: 'low',
            timestamp: new Date().toISOString(),
            read: false
        };

        if (typeof Notifications !== 'undefined') {
            Notifications.add(notification);
        }

        return { success: true };
    },

    // ========================================
    // EVENT HELPERS
    // ========================================

    getEventInfo(eventType) {
        const events = {
            'PICKED_UP': { label: 'تم الاستلام من التاجر', icon: '📦', color: '#3b82f6' },
            'IN_TRANSIT': { label: 'في الطريق للتوصيل', icon: '🚚', color: '#f59e0b' },
            'OUT_FOR_DELIVERY': { label: 'مع المندوب للتوصيل', icon: '🛵', color: '#8b5cf6' },
            'DELIVERED': { label: 'تم التسليم ✓', icon: '✅', color: '#22c55e' },
            'DELIVERED_FAIL': { label: 'فشل التسليم', icon: '❌', color: '#ef4444' },
            'RETURNED': { label: 'تم الإرجاع', icon: '🔙', color: '#6b7280' },
            'EXCEPTION': { label: 'استثناء في الشحنة', icon: '⚠️', color: '#f59e0b' },
            'CANCELLED': { label: 'تم الإلغاء', icon: '🚫', color: '#9ca3af' },
            'CREATED': { label: 'تم إنشاء الطلب', icon: '📝', color: '#3b82f6' },
            'WAREHOUSED': { label: 'وصل المخزن', icon: '🏭', color: '#06b6d4' }
        };

        return events[eventType] || {
            label: eventType.replace(/_/g, ' ') || 'تحديث',
            icon: '📦',
            color: '#3b82f6'
        };
    },

    getEventPriority(eventType) {
        const priorities = {
            'DELIVERED': 'high',
            'DELIVERED_FAIL': 'high',
            'EXCEPTION': 'high',
            'RETURNED': 'medium',
            'OUT_FOR_DELIVERY': 'medium',
            'PICKED_UP': 'low',
            'IN_TRANSIT': 'low'
        };
        return priorities[eventType] || 'low';
    },

    // ========================================
    // TESTING & SIMULATION ⭐
    // ========================================

    /**
     * Simulate receiving a webhook (for testing)
     */
    simulateWebhook(eventType = 'DELIVERED', trackingNumber = null) {
        const mockPayload = {
            source: 'bosta',
            type: eventType,
            trackingNumber: trackingNumber || `TEST-${Date.now()}`,
            deliveryId: `BO${Date.now().toString().slice(-10)}`,
            deliveryKey: `DK${Date.now().toString().slice(-8)}`,
            timestamp: new Date().toISOString(),
            currentLocation: 'القاهرة، مصر',
            zone: 'مدينة نصر',
            city: 'CAI',
            notes: 'إشعار تجريبي للاختبار النظام',
            simulated: true,
            testMode: true
        };

        console.log('[WebhookHandler] 🧪 Simulating webhook:', mockPayload);
        
        return this.processIncoming(mockPayload, 'bosta_test');
    },

    /**
     * Simulate full delivery lifecycle
     */
    simulateDeliveryLifecycle(trackingNumber = null) {
        const tn = trackingNumber || `LIFE-${Date.now()}`;
        const events = ['CREATED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED'];
        
        let delay = 0;
        events.forEach((eventType, index) => {
            setTimeout(() => {
                this.simulateWebhook(eventType, tn);
            }, delay);
            delay += 2000; // 2 seconds between each event
        });

        return {
            success: true,
            message: `بدأت محاكاة دورة حياة الشحنة ${tn} (${events.length} أحداث)`,
            trackingNumber: tn,
            events: events
        };
    },

    // ========================================
    // LOGGING ⭐
    // ========================================

    addToLog(entry) {
        this.log.unshift(entry);
        
        // Keep only last 100 entries
        if (this.log.length > 100) {
            this.log.pop();
        }

        // Auto-save every 10 entries
        if (this.log.length % 10 === 0) {
            this.saveLogToStorage();
        }
    },

    updateLogEntry(payload, updates) {
        const entry = this.log.find(e => 
            e.payload === payload || 
            e.payload?.trackingNumber === payload?.trackingNumber ||
            e.payload?.deliveryId === payload?.deliveryId
        );
        
        if (entry) {
            Object.assign(entry, updates);
        }
    },

    getLog(limit = 20) {
        return this.log.slice(0, limit);
    },

    getStats() {
        return {
            ...this.stats,
            logSize: this.log.length,
            handlersRegistered: Object.keys(this.handlers).length
        };
    },

    clearLog() {
        this.log = [];
        this.stats = {
            totalReceived: 0,
            totalProcessed: 0,
            totalErrors: 0,
            lastReceived: null
        };
        localStorage.removeItem('webhook_log');
        console.log('[WebhookHandler] Log cleared');
    },

    saveLogToStorage() {
        try {
            localStorage.setItem('webhook_log', JSON.stringify({
                log: this.log.slice(0, 50), // Only save last 50
                stats: this.stats,
                savedAt: new Date().toISOString()
            }));
        } catch (error) {
            console.error('[WebhookHandler] Failed to save log:', error);
        }
    },

    loadLogFromStorage() {
        try {
            const saved = localStorage.getItem('webhook_log');
            if (saved) {
                const data = JSON.parse(saved);
                this.log = data.log || [];
                this.stats = { ...this.stats, ...data.stats };
                console.log(`[WebhookHandler] Loaded ${this.log.length} log entries`);
            }
        } catch (error) {
            console.error('[WebhookHandler] Failed to load log:', error);
        }
    },

    // ========================================
    // BACKGROUND SYNC ⭐
    // ========================================

    async registerBackgroundSync() {
        if (!('serviceWorker' in navigator) || !('SyncManager' in window)) {
            console.log('[WebhookHandler] Background sync not supported');
            return;
        }

        try {
            const registration = await navigator.serviceWorker.ready;
            
            // Register multiple sync tags
            await registration.sync.register('sync-bosta-webhooks');
            await registration.sync.register('sync-pending-data');
            
            console.log('[WebhookHandler] ✅ Background sync registered');
        } catch (error) {
            console.error('[WebhookHandler] Background sync registration failed:', error);
        }
    },

    async handleBackgroundSync(tag) {
        console.log(`[WebhookHandler] Processing background sync: ${tag}`);

        switch (tag) {
            case 'sync-bosta-webhooks':
                await this.processPendingWebhooks();
                break;
            case 'sync-pending-data':
                await this.syncPendingData();
                break;
            default:
                console.log(`[WebhookHandler] Unknown sync tag: ${tag}`);
        }

        return true;
    },

    async processPendingWebhooks() {
        // In a real implementation:
        // 1. Get queued webhooks from IndexedDB
        // 2. Process each one
        // 3. Mark as processed
        
        console.log('[WebhookHandler] Processing pending webhooks...');
        return true;
    },

    async syncPendingData() {
        // Sync pending shipments, customers, etc.
        console.log('[WebhookHandler] Syncing pending data...');
        return true;
    },

    // ========================================
    // ENDPOINT INFO ⭐
    // ========================================

    getEndpointInfo() {
        const baseUrl = window.location.origin + window.location.pathname;
        
        return {
            url: `${baseUrl}api/bosta-webhook`,
            method: 'POST',
            contentType: 'application/json',
            
            // How to set up in Bosta Dashboard:
            setupInstructions: [
                '1. اذهب إلى لوحة تحكم بوستا: https://business.bosta.co',
                '2. اذهب إلى Settings → API Integration',
                '3. انقر Request OTP وأدخل الكود المرسل لهاتفك',
                '4. في قسم Webhook URL، أدخل الرابط أدناه',
                '5. (اختياري) أضف مفتاح سر للتحقق من التوقيع',
                '6. اضغط Save لحفظ الإعدادات'
            ],
            
            expectedFormat: {
                type: 'string - نوع الحدث (PICKED_UP, DELIVERED, etc.)',
                trackingNumber: 'string - رقم التتبع الخاص بك',
                deliveryKey: 'string - رقم التتبع في بوستا (deliveryKey)',
                deliveryId: 'string - معرف الطلب في بوستا',
                timestamp: 'string - تاريخ ووقت الحدث (ISO format)',
                currentLocation: 'string - الموقع الحالي (اختياري)',
                zone: 'string - المنطقة (اختياري)',
                city: 'string - كود المدينة (اختياري)',
                notes: 'string: ملاحظات إضافية (اختياري)'
            },
            
            supportedEvents: [
                { value: 'CREATED', label: 'تم إنشاء الطلب', description: 'عند إنشاء طلب جديد' },
                { value: 'PICKED_UP', label: 'تم الاستلام من التاجر', description: 'عند استلام المندوب الشحنة' },
                { value: 'IN_TRANSIT', label: 'في الطريق', description: 'الشحنة قيد التوصيل' },
                { value: 'OUT_FOR_DELIVERY', label: 'مع المندوب', description: 'وصلت للمندوب' },
                { value: 'DELIVERED', label: 'تم التسليم ✓', description: 'تم التسليم بنجاح' },
                { value: 'DELIVERED_FAIL', label: 'فشل التسليم', description: 'لم يتم التسليم' },
                { value: 'RETURNED', label: 'تم الإرجاع', description: 'تم إرجاع الشحنة' },
                { value: 'EXCEPTION', label: 'استثناء', description: 'مشكلة أو استثناء' },
                { value: 'CANCELLED', label: 'تم الإلغاء', description: 'تم إلغاء الشحنة' }
            ],

            testCurl: `curl -X POST "${baseUrl}api/bosta-webhook" \\
  -H "Content-Type: application/json" \\
  -d '{
    "type": "DELIVERED",
    "trackingNumber": "YOUR_TRACKING_NUMBER",
    "deliveryId": "BO123456789",
    "timestamp": "${new Date().toISOString()}",
    "notes": "Test webhook"
  }'`
        };
    },

    getTestPayloads() {
        return {
            delivered: {
                type: 'DELIVERED',
                trackingNumber: `SH-${new Date().getTime()}`,
                deliveryId: `BO${Date.now().toString().slice(-10)}`,
                deliveryKey: `DK${Date.now().toString().slice(-8)}`,
                timestamp: new Date().toISOString(),
                currentLocation: 'القاهرة، مصر',
                zone: 'مدينة نصر',
                city: 'CAI',
                notes: 'تم التسليم بنجاح ✓'
            },
            inTransit: {
                type: 'IN_TRANSIT',
                trackingNumber: `SH-${new Date().getTime()}`,
                deliveryId: `BO${Date.now().toString().slice(-10)}`,
                timestamp: new Date().toISOString(),
                currentLocation: 'الإسكندرية، مصر',
                zone: 'محرم ره',
                city: 'ALX',
                notes: 'الشحنة في الطريق للتوصيل'
            },
            exception: {
                type: 'EXCEPTION',
                trackingNumber: `SH-${new Date().getTime()}`,
                deliveryId: `BO${Date.now().toString().slice(-10)}`,
                timestamp: new Date().toISOString(),
                currentLocation: 'الجيزة، مصر',
                zone: 'التجمع الخامسة',
                city: 'GIZ',
                notes: 'المستلم غير متاح - سيتم إعادة المحاولة لاحقاً'
            },
            pickedUp: {
                type: 'PICKED_UP',
                trackingNumber: `SH-${new Date().getTime()}`,
                deliveryId: `BO${Date.now().toString().slice(-10)}`,
                timestamp: new Date().toISOString(),
                currentLocation: 'المخزن الرئيسي',
                zone: 'القاهرة الجديدة',
                city: 'CAI',
                notes: 'تم استلام الشحنة من التاجر'
            }
        };
    },

    // ========================================
    // SECURITY ⭐
    // ========================================

    verifySignature(payload, signature, secret) {
        // TODO: Implement HMAC-SHA256 verification
        // For now, basic validation
        if (!signature) {
            console.log('[WebhookHandler] No signature provided - skipping verification');
            return true; // Allow without signature for testing
        }
        
        console.log('[WebhookHandler] Verifying signature...');
        return !!signature; // Placeholder
    },

    validateOrigin(request) {
        // In production, validate that request comes from Bosta
        const bostaDomains = ['app.bosta.co', 'api.bosta.co', 'www.bosta.co'];
        const origin = request.headers?.origin || request.headers?.referer;
        
        if (!origin) return true; // Allow direct calls
        
        try {
            const url = new URL(origin);
            return bostaDomains.some(domain => url.hostname.includes(domain.replace('www.', '')));
        } catch {
            return false;
        }
    }
};

// Make available globally
window.WebhookHandler = WebhookHandler;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    WebhookHandler.init();
});

console.log('[WebhookHandler] Module loaded - Ready! 🔔');
