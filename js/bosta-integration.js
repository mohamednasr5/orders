/**
 * ========================================
 * شحنلي - Bosta Integration Module
 * Real-time shipping notifications & API integration
 * ========================================
 */

const BostaIntegration = {
    // Configuration
    config: {
        apiKey: null,
        webhookUrl: null,
        isConnected: false,
        lastSync: null,
        baseUrl: 'https://app.bosta.co',
        apiVersion: '/v1'
    },

    // Event types mapping (Arabic)
    eventTypes: {
        'PICKED_UP': { label: 'تم الاستلام', icon: '📦', color: '#3b82f6' },
        'IN_TRANSIT': { label: 'في الطريق', icon: '🚚', color: '#f59e0b' },
        'OUT_FOR_DELIVERY': { label: 'مع المندوب', icon: '🛵', color: '#8b5cf6' },
        'DELIVERED': { label: 'تم التسليم ✓', icon: '✅', color: '#22c55e' },
        'DELIVERED_FAIL': { label: 'فشل التسليم', icon: '❌', color: '#ef4444' },
        'RETURNED': { label: 'مرتجع', icon: '🔙', color: '#6b7280' },
        'EXCEPTION': { label: 'استثناء ⚠️', icon: '⚠️', color: '#f59e0b' },
        'CANCELLED': { label: 'ملغي', icon: '🚫', color: '#9ca3af' }
    },

    // Initialize Bosta Integration
    async init() {
        console.log('[Bosta] Initializing integration...');
        
        // Load saved configuration
        this.loadConfig();
        
        // Generate webhook URL if not set
        if (!this.config.webhookUrl) {
            this.config.webhookUrl = this.generateWebhookUrl();
            this.saveConfig();
        }

        // Update UI
        this.updateConnectionStatus();
        
        // Start polling for updates (if connected)
        if (this.config.isConnected) {
            this.startPolling();
        }

        console.log('[Bosta] Integration initialized');
    },

    // Load configuration from localStorage
    loadConfig() {
        try {
            const saved = localStorage.getItem(APP_CONFIG.storageKeys.bostaConfig);
            if (saved) {
                const parsed = JSON.parse(saved);
                this.config = { ...this.config, ...parsed };
                console.log('[Bosta] Config loaded');
            }
        } catch (e) {
            console.error('[Bosta] Error loading config:', e);
        }
    },

    // Save configuration to localStorage
    saveConfig() {
        try {
            localStorage.setItem(APP_CONFIG.storageKeys.bostaConfig, JSON.stringify(this.config));
        } catch (e) {
            console.error('[Bosta] Error saving config:', e);
        }
    },

    // Generate webhook URL
    generateWebhookUrl() {
        const baseUrl = window.location.origin + window.location.pathname;
        return `${baseUrl}api/bosta-webhook`;
    },

    // Save Bosta settings from form
    saveSettings(apiKey) {
        this.config.apiKey = apiKey;
        this.config.isConnected = !!apiKey;
        this.saveConfig();
        this.updateConnectionStatus();
        
        if (apiKey) {
            this.testConnection().then(success => {
                if (success) {
                    showToast('تم ربط بوستا بنجاح!', 'success', '🚚');
                    Notifications.add({
                        type: 'system',
                        title: 'تم ربط بوستا',
                        message: 'يمكنك الآن استقبال إشعارات الشحنات مباشرة',
                        icon: '🚚'
                    });
                }
            });
        }
        
        return this.config.isConnected;
    },

    // Test connection to Bosta API
    async testConnection() {
        if (!this.config.apiKey) {
            showToast('يرجى إدخال مفتاح API أولاً', 'warning');
            return false;
        }

        showLoading(true);
        
        try {
            // Simulate connection test (in production, make actual API call)
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // For demo, assume success if API key is provided
            const isValidKey = this.config.apiKey.length > 10;
            
            if (isValidKey) {
                this.config.isConnected = true;
                this.config.lastSync = new Date().toISOString();
                this.saveConfig();
                this.updateConnectionStatus();
                showToast('اتصال ناجح بوستا! 🎉', 'success');
                return true;
            } else {
                throw new Error('مفتاح API غير صالح');
            }
        } catch (error) {
            console.error('[Bosta] Connection test failed:', error);
            showToast('فشل الاتصال: ' + error.message, 'error');
            return false;
        } finally {
            showLoading(false);
        }
    },

    // Update connection status in UI
    updateConnectionStatus() {
        const statusEl = document.getElementById('bostaConnectionStatus');
        const bostaStatusEl = document.getElementById('bostaStatus');
        const appStatusEl = document.getElementById('bostaAppStatus');
        
        if (statusEl) {
            statusEl.textContent = this.config.isConnected ? 'متصل' : 'غير متصل';
            statusEl.className = `connection-status ${this.config.isConnected ? 'connected' : ''}`;
        }
        
        if (bostaStatusEl) {
            bostaStatusEl.classList.toggle('hidden', !this.config.isConnected);
            bostaStatusEl.classList.toggle('connected', this.config.isConnected);
            const textEl = bostaStatusEl.querySelector('.status-text');
            if (textEl) {
                textEl.textContent = `بوستا: ${this.config.isConnected ? 'متصل ✓' : 'غير متصل'}`;
            }
        }
        
        if (appStatusEl) {
            appStatusEl.textContent = this.config.isConnected ? 'مربوط ✓' : 'غير مربوط';
        }

        // Update webhook URL display
        const webhookInput = document.getElementById('bostaWebhookUrl');
        if (webhookInput && this.config.webhookUrl) {
            webhookInput.value = this.config.webhookUrl;
        }
        
        const codeBlock = document.getElementById('webhookCodeBlock');
        if (codeBlock && this.config.webhookUrl) {
            codeBlock.textContent = this.config.webhookUrl;
        }
    },

    // Process incoming webhook from Bosta
    processWebhook(payload) {
        console.log('[Bosta] Processing webhook:', payload);
        
        const eventType = payload.type || payload.eventType || payload.status;
        const trackingNumber = payload.trackingNumber || payload.deliveryId || 'Unknown';
        
        // Get event info
        const eventInfo = this.eventTypes[eventType] || {
            label: eventType || 'تحديث',
            icon: '📦',
            color: '#3b82f6'
        };

        // Create notification
        const notification = {
            id: `bosta_${Date.now()}`,
            type: 'bosta',
            title: `${eventInfo.icon} ${eventInfo.label}`,
            message: `شحنة ${trackingNumber}: ${eventInfo.label}`,
            data: payload,
            timestamp: new Date().toISOString(),
            read: false,
            priority: this.getEventPriority(eventType),
            trackingNumber: trackingNumber,
            eventType: eventType
        };

        // Add to notifications system
        if (typeof Notifications !== 'undefined') {
            Notifications.add(notification);
        }

        // Update local shipment if exists
        this.updateLocalShipment(trackingNumber, eventType, payload);

        // Show toast notification
        showToast(notification.message, 'bosta', eventInfo.icon);

        // Trigger push notification via service worker
        this.triggerPushNotification(notification);

        // Update dashboard stats
        APP_STATE.todayBostaCount++;
        this.updateDashboardStats();

        // Store in updates list
        APP_STATE.bostaUpdates.unshift({
            ...notification,
            time: new Date().toLocaleTimeString('ar-EG')
        });

        // Keep only last 50 updates
        if (APP_STATE.bostaUpdates.length > 50) {
            APP_STATE.bostaUpdates.pop();
        }

        // Render updates list
        this.renderUpdatesList();

        return notification;
    },

    // Get event priority level
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

    // Update local shipment based on Bosta event
    updateLocalShipment(trackingNumber, eventType, payload) {
        const shipments = JSON.parse(localStorage.getItem(APP_CONFIG.storageKeys.shipments) || '[]');
        const index = shipments.findIndex(s => 
            s.trackingNumber === trackingNumber || 
            s.bostaTrackingNumber === trackingNumber ||
            payload.deliveryId && s.bostaTrackingNumber === payload.deliveryId
        );

        if (index !== -1) {
            // Map Bosta status to local status
            const statusMap = {
                'PICKED_UP': 'picked',
                'IN_TRANSIT': 'in_transit',
                'OUT_FOR_DELIVERY': 'in_transit',
                'DELIVERED': 'delivered',
                'DELIVERED_FAIL': 'pending',
                'RETURNED': 'returned',
                'CANCELLED': 'cancelled',
                'EXCEPTION': 'exception'
            };

            shipments[index].status = statusMap[eventType] || shipments[index].status;
            shipments[index].bostaLastUpdate = new Date().toISOString();
            shipments[index].bostaEventType = eventType;

            // Add to timeline
            if (!shipments[index].timeline) {
                shipments[index].timeline = [];
            }
            shipments[index].timeline.unshift({
                date: new Date().toISOString(),
                status: eventType,
                description: this.eventTypes[eventType]?.label || eventType
            });

            localStorage.setItem(APP_CONFIG.storageKeys.shipments, JSON.stringify(shipments));

            // Refresh current view if on shipments tab
            if (APP_STATE.currentTab === 'shipments') {
                renderShipmentsTable();
            }
        }
    },

    // Trigger push notification via service worker
    triggerPushNotification(notification) {
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
                type: 'BOSTA_NOTIFICATION',
                notification: {
                    title: 'شحنلي - تحديث بوستا',
                    body: notification.message,
                    icon: '/icons/icon-192.png',
                    badge: '/icons/icon-72.png',
                    tag: notification.id,
                    data: {
                        url: `/tracking?number=${notification.trackingNumber}`,
                        type: 'bosta'
                    },
                    actions: [
                        { action: 'view', title: 'عرض' },
                        { action: 'close', title: 'إغلاق' }
                    ]
                }
            });
        }
    },

    // Simulate Bosta notification (for testing)
    simulateNotification(eventType, trackingNumber) {
        const mockPayload = {
            type: eventType,
            trackingNumber: trackingNumber || `TEST-${Date.now()}`,
            deliveryId: `BO${Date.now()}`,
            timestamp: new Date().toISOString(),
            location: 'القاهرة، مصر',
            notes: 'إشعار تجريبي للاختبار'
        };

        return this.processWebhook(mockPayload);
    },

    // Render Bosta updates list
    renderUpdatesList() {
        const container = document.getElementById('bostaUpdatesList');
        if (!container) return;

        if (APP_STATE.bostaUpdates.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <span class="empty-icon">🚚</span>
                    <p>في انتظار تحديثات من بوستا</p>
                    <small>قم بإعداد Webhook لاستقبال الإشعارات</small>
                </div>
            `;
            return;
        }

        container.innerHTML = APP_STATE.bostaUpdates.slice(0, 10).map(update => `
            <div class="update-item ${update.read ? '' : 'unread'}" onclick="Notifications.markAsRead('${update.id}')">
                <div class="update-icon">${this.eventTypes[update.eventType]?.icon || '📦'}</div>
                <div class="update-content">
                    <strong>${update.title}</strong>
                    <p>${update.message}</p>
                    <span class="update-time">${update.time}</span>
                </div>
            </div>
        `).join('');
    },

    // Update dashboard stats
    updateDashboardStats() {
        const bostaCountEl = document.getElementById('bostaSyncCount');
        const todayBostaEl = document.getElementById('todayBostaUpdates');

        if (bostaCountEl) {
            bostaCountEl.textContent = APP_STATE.bostaUpdates.length;
        }

        if (todayBostaEl) {
            todayBostaEl.textContent = APP_STATE.todayBostaCount;
        }
    },

    // Polling for updates (fallback when webhooks don't work)
    startPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
        }

        // Poll every 30 seconds
        this.pollingInterval = setInterval(() => {
            this.pollForUpdates();
        }, 30000);

        console.log('[Bosta] Polling started');
    },

    stopPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
    },

    async pollForUpdates() {
        if (!this.config.isConnected || !this.config.apiKey) {
            return;
        }

        // In production, this would call Bosta's API to check for recent updates
        // For now, it's a placeholder
        console.log('[Bosta] Polling for updates...');
    },

    // Track shipment via Bosta API
    async trackShipment(trackingNumber) {
        if (!this.config.isConnected) {
            showToast('يركب ربط بوستا أولاً', 'warning');
            return null;
        }

        showLoading(true);
        
        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Mock tracking data
            const mockTrackingData = {
                trackingNumber: trackingNumber,
                status: 'IN_TRANSIT',
                currentLocation: 'القاهرة، مدينة نصر',
                estimatedDelivery: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toLocaleDateString('ar-EG'),
                timeline: [
                    { date: new Date().toISOString(), status: 'PICKED_UP', description: 'تم استلام الشحنة' },
                    { date: new Date(Date.now() - 3600000).toISOString(), status: 'IN_TRANSIT', description: 'في الطريق للتوصيل' }
                ],
                driver: {
                    name: 'أحمد محمد',
                    phone: '01012345678'
                }
            };

            return mockTrackingData;
        } catch (error) {
            console.error('[Bosta] Tracking failed:', error);
            showToast('فشل تتبع الشحنة', 'error');
            return null;
        } finally {
            showLoading(false);
        }
    },

    // Create delivery request via Bosta API
    async createDelivery(shipmentData) {
        if (!this.config.isConnected) {
            throw new Error('بوستا غير مربوط');
        }

        showLoading(true);

        try {
            // Prepare Bosta API payload
            const bostaPayload = {
                type: shipmentData.type === 'cash_on_delivery' ? 'COD' : 'DELIVERY',
                receiver: {
                    firstName: shipmentData.receiverName.split(' ')[0],
                    lastName: shipmentData.receiverName.split(' ').slice(1).join(' ') || '',
                    phone: shipmentData.receiverPhone,
                    city: this.getBostaCityCode(shipmentData.receiverCity),
                    zone: shipmentData.receiverArea,
                    street: shipmentData.receiverAddress,
                    buildingNo: '',
                    floor: '',
                    apartment: ''
                },
                codAmount: parseFloat(shipmentData.codAmount) || 0,
                declaredValue: parseFloat(shipmentData.declaredValue) || 0,
                weight: parseFloat(shipmentData.weight) || 1,
                description: shipmentData.description || '',
                referenceNumbers: [shipmentData.trackingNumber],
                specs: {
                    packageCount: parseInt(shipmentData.pieces) || 1,
                    packageType: this.getPackageType(shipmentData.packageType)
                },
                webhooks: [this.config.webhookUrl]
            };

            console.log('[Bosta] Creating delivery:', bostaPayload);

            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Generate mock Bosta tracking number
            const bostaTrackingNumber = `BO${Date.now().toString().slice(-10)}`;

            // Return success response
            return {
                success: true,
                bostaTrackingNumber: bostaTrackingNumber,
                message: 'تم إنشاء الشحن بنجاح في بوستا'
            };

        } catch (error) {
            console.error('[Bosta] Delivery creation failed:', error);
            throw error;
        } finally {
            showLoading(false);
        }
    },

    // Helper: Get Bosta city code
    getBostaCityCode(cityValue) {
        const cityCodes = {
            'cairo': 'CAI',
            'alexandria': 'ALX',
            'giza': 'GIZ',
            'mansoura': 'MAN',
            'tanta': 'TAN',
            'ismailia': 'ISM',
            'suez': 'SUE',
            'luxor': 'LUX',
            'aswan': 'ASW'
        };
        return cityCodes[cityValue] || 'OTH';
    },

    // Helper: Get package type for Bosta
    getPackageType(type) {
        const types = {
            'envelope': 'ENVELOPE',
            'box': 'BOX',
            'large_box': 'LARGE_BOX',
            'palette': 'PALETTE'
        };
        return types[type] || 'BOX';
    },

    // Copy webhook URL to clipboard
    copyWebhookUrl() {
        if (this.config.webhookUrl) {
            navigator.clipboard.writeText(this.config.webhookUrl).then(() => {
                showToast('تم نسخ الرابط ✓', 'success');
            });
        }
    },

    // Get connection stats
    getStats() {
        return {
            isConnected: this.config.isConnected,
            totalUpdates: APP_STATE.bostaUpdates.length,
            todayUpdates: APP_STATE.todayBostaCount,
            lastSync: this.config.lastSync
        };
    }
};

// Make available globally
window.BostaIntegration = BostaIntegration;

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    BostaIntegration.init();
});
