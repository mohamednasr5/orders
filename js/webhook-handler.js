/**
 * ========================================
 * شحنلي - Webhook Handler Module
 * Receives and processes Bosta webhooks
 * Works with Service Worker for background handling
 * ========================================
 */

const WebhookHandler = {
    // Registered handlers
    handlers: {},
    
    // Webhook log (for debugging)
    log: [],

    // Initialize
    init() {
        console.log('[WebhookHandler] Initializing...');
        
        // Register default handler for Bosta
        this.register('bosta', this.handleBostaWebhook.bind(this));
        
        // Listen for messages from service worker
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener('message', (event) => {
                if (event.data && event.data.type === 'WEBHOOK_RECEIVED') {
                    this.processIncoming(event.data.payload);
                }
            });
        }

        // Check if we can register for background sync
        this.registerBackgroundSync();
        
        console.log('[WebhookHandler] Initialized');
    },

    // Register a webhook handler
    register(type, handler) {
        this.handlers[type] = handler;
        console.log(`[WebhookHandler] Registered handler for: ${type}`);
    },

    // Process incoming webhook
    async processIncoming(payload) {
        console.log('[WebhookHandler] Processing:', payload);

        // Log the webhook
        this.addToLog({
            receivedAt: new Date().toISOString(),
            payload: payload,
            processed: false
        });

        try {
            // Determine handler based on source
            const source = payload.source || 'bosta';
            const handler = this.handlers[source];

            if (handler) {
                const result = await handler(payload);
                this.updateLogEntry(payload, { processed: true, result });
                return result;
            } else {
                console.warn(`[WebhookHandler] No handler for: ${source}`);
                return null;
            }
        } catch (error) {
            console.error('[WebhookHandler] Error processing:', error);
            this.updateLogEntry(payload, { processed: false, error: error.message });
            
            // Show error notification
            if (typeof Notifications !== 'undefined') {
                Notifications.addSystemAlert(
                    'خطأ في معالجة الإشعار',
                    error.message,
                    '❌'
                );
            }
            
            return null;
        }
    },

    // Handle Bosta-specific webhook
    async handleBostaWebhook(payload) {
        console.log('[WebhookHandler] Processing Bosta webhook');

        // Validate payload structure
        if (!this.validateBostaPayload(payload)) {
            throw new Error('بيانات الإشعار غير صالحة');
        }

        // Delegate to Bosta integration module
        if (typeof BostaIntegration !== 'undefined') {
            return BostaIntegration.processWebhook(payload);
        } else {
            // Fallback processing
            return this.fallbackBostaProcessing(payload);
        }
    },

    // Validate Bosta payload structure
    validateBostaPayload(payload) {
        // Check required fields
        const hasRequiredFields = payload && (
            payload.type || 
            payload.eventType || 
            payload.status ||
            payload.trackingNumber ||
            payload.deliveryId
        );

        return hasRequiredFields;
    },

    // Fallback processing if BostaIntegration not available
    fallbackBostaProcessing(payload) {
        const eventType = payload.type || payload.eventType || payload.status || 'UNKNOWN';
        const trackingNumber = payload.trackingNumber || payload.deliveryId || 'Unknown';

        // Create basic notification
        if (typeof Notifications !== 'undefined') {
            Notifications.add({
                type: 'bosta',
                title: `تحديث بوستا: ${eventType}`,
                message: `شحنة ${trackingNumber} - الحالة: ${eventType}`,
                icon: '🚚',
                data: payload,
                priority: 'medium'
            });
        }

        return { success: true, eventType, trackingNumber };
    },

    // Simulate receiving a webhook (for testing)
    simulateWebhook(eventType, trackingNumber) {
        const mockPayload = {
            source: 'bosta',
            type: eventType,
            trackingNumber: trackingNumber || `TEST-${Date.now()}`,
            deliveryId: `BO${Date.now().toString().slice(-10)}`,
            timestamp: new Date().toISOString(),
            location: 'القاهرة، مصر',
            notes: 'إشعار تجريبي',
            simulated: true
        };

        console.log('[WebhookHandler] Simulating webhook:', mockPayload);
        
        return this.processIncoming(mockPayload);
    },

    // Add to log
    addToLog(entry) {
        this.log.unshift(entry);
        
        // Keep only last 100 entries
        if (this.log.length > 100) {
            this.log.pop();
        }
    },

    // Update log entry
    updateLogEntry(payload, updates) {
        const entry = this.log.find(e => e.payload === payload || 
            e.payload?.trackingNumber === payload?.trackingNumber);
        
        if (entry) {
            Object.assign(entry, updates);
        }
    },

    // Get webhook log
    getLog(limit = 20) {
        return this.log.slice(0, limit);
    },

    // Clear log
    clearLog() {
        this.log = [];
    },

    // Register for background sync
    async registerBackgroundSync() {
        if (!('serviceWorker' in navigator) || !('SyncManager' in window)) {
            console.log('[WebhookHandler] Background sync not supported');
            return;
        }

        try {
            const registration = await navigator.serviceWorker.ready;
            await registration.sync.register('sync-webhooks');
            console.log('[WebhookHandler] Background sync registered');
        } catch (error) {
            console.error('[WebhookHandler] Background sync registration failed:', error);
        }
    },

    // Handle webhook when online (background sync)
    async handleBackgroundSync() {
        console.log('[WebhookHandler] Processing pending webhooks...');
        
        // In a real implementation, this would:
        // 1. Get queued webhooks from IndexedDB
        // 2. Process each one
        // 3. Mark as processed
        
        // For now, just log
        return true;
    },

    // Create endpoint URL info
    getEndpointInfo() {
        return {
            url: `${window.location.origin}${window.location.pathname}api/bosta-webhook`,
            method: 'POST',
            contentType: 'application/json',
            expectedFormat: {
                type: 'string - Event type (PICKED_UP, DELIVERED, etc.)',
                trackingNumber: 'string - Shipment tracking number',
                deliveryId: 'string - Bosta delivery ID (optional)',
                timestamp: 'string - ISO date string',
                location: 'string - Current location (optional)',
                notes: 'string - Additional notes (optional)'
            },
            supportedEvents: [
                'PICKED_UP',
                'IN_TRANSIT', 
                'OUT_FOR_DELIVERY',
                'DELIVERED',
                'DELIVERED_FAIL',
                'RETURNED',
                'EXCEPTION',
                'CANCELLED'
            ]
        };
    },

    // Generate test payload examples
    getTestPayloads() {
        return {
            delivered: {
                type: 'DELIVERED',
                trackingNumber: `SH-${Date.now()}`,
                deliveryId: `BO${Date.now().toString().slice(-10)}`,
                timestamp: new Date().toISOString(),
                location: 'القاهرة، مصر',
                notes: 'تم التسليم بنجاح'
            },
            inTransit: {
                type: 'IN_TRANSIT',
                trackingNumber: `SH-${Date.now()}`,
                deliveryId: `BO${Date.now().toString().slice(-10)}`,
                timestamp: new Date().toISOString(),
                location: 'الإسكندرية، مصر',
                notes: 'الشحنة في الطريق'
            },
            exception: {
                type: 'EXCEPTION',
                trackingNumber: `SH-${Date.now()}`,
                deliveryId: `BO${Date.now().toString().slice(-10)}`,
                timestamp: new Date().toISOString(),
                location: 'الجيزة، مصر',
                notes: 'المستلم غير متاح - سيتم إعادة المحاولة'
            }
        };
    },

    // Verify webhook signature (for security)
    verifySignature(payload, signature, secret) {
        // In production, implement HMAC verification
        // For now, just check if signature exists
        console.log('[WebhookHandler] Verifying signature...');
        return !!signature;
    }
};

// Make available globally
window.WebhookHandler = WebhookHandler;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    WebhookHandler.init();
});
