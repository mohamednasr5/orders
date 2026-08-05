/**
 * ========================================
 * شحنلي - Bosta Integration Module ⭐ UPDATED
 * Real Bosta API Integration
 * Documentation: https://docs.bosta.co
 * ========================================
 * 
 * 📋 Bosta API Details:
 * - Base URL: https://app.bosta.co
 * - API Version: v2
 * - Auth: API Key in Header
 * 
 * 🔗 Key Endpoints:
 * - Create Delivery: POST /api/v2/deliveries?apiVersion=1
 * - Track Delivery: GET /api/v2/deliveries/{trackingKey}
 * - List Cities: GET /api/v2/cities
 * 
 * 📡 Webhook:
 * - Bosta sends POST to your webhook URL on status change
 * - Payload includes: type, trackingNumber, deliveryId, etc.
 */

const BostaIntegration = {
    // ========================================
    // Configuration ⭐
    // ========================================
    config: {
        apiKey: null,
        webhookUrl: null,
        webhookSecret: null,  // Optional secret key for verification
        isConnected: false,
        lastSync: null,
        
        // ✅ Real Bosta API Configuration
        baseUrl: 'https://app.bosta.co',
        apiVersion: 'v2',
        endpoints: {
            createDelivery: '/api/v2/deliveries',           // POST - Create new delivery
            trackDelivery: '/api/v2/deliveries/:trackingKey', // GET - Track shipment
            listDeliveries: '/api/v2/deliveries',          // GET - List all deliveries
            cities: '/api/v2/cities',                     // GET - Get available cities
            pricing: '/api/v2/pricing'                    // GET - Calculate shipping cost
        }
    },

    // Event types mapping (Arabic) - Based on real Bosta events
    eventTypes: {
        'PICKED_UP': { label: 'تم الاستلام من التاجر', icon: '📦', color: '#3b82f6' },
        'IN_TRANSIT': { label: 'في الطريق', icon: '🚚', color: '#f59e0b' },
        'OUT_FOR_DELIVERY': { label: 'مع المندوب للتوصيل', icon: '🛵', color: '#8b5cf6' },
        'DELIVERED': { label: 'تم التسليم ✓', icon: '✅', color: '#22c55e' },
        'DELIVERED_FAIL': { label: 'فشل التسليم', icon: '❌', color: '#ef4444' },
        'RETURNED': { label: 'تم الإرجاع', icon: '🔙', color: '#6b7280' },
        'EXCEPTION': { label: 'استثناء في الشحنة', icon: '⚠️', color: '#f59e0b' },
        'CANCELLED': { label: 'تم الإلغاء', icon: '🚫', color: '#9ca3af' },
        'CREATED': { label: 'تم إنشاء الطلب', icon: '📝', color: '#3b82f6' },
        'WAREHOUSED': { label: 'وصل المخزن', icon: '🏭', color: '#06b6d4' }
    },

    // City codes mapping (Bosta format)
    cityCodes: {
        'cairo': { code: 'CAI', name: 'القاهرة' },
        'alexandria': { code: 'ALX', name: 'الإسكندرية' },
        'giza': { code: 'GIZ', name: 'الجيزة' },
        'mansoura': { code: 'MAN', name: 'المنصورة' },
        'tanta': { code: 'TAN', name: 'طنطا' },
        'ismailia': { code: 'ISM', name: 'الإسماعيلية' },
        'suez': { code: 'SUE', name: 'السويس' },
        'luxor': { code: 'LUX', name: 'الأقصر' },
        'aswan': { code: 'ASW', name: 'أسوان' },
        '6th_october': { code: '6OC', name: 'السادس من أكتوبر' },
        '10th_ramadan': { code: '10R', name: 'العاشر من رمضان' },
        'shubra_el_kheima': { code: 'SHU', name: 'شبرا الخيمة' },
        'port_said': { code: 'PSA', name: 'بور سعيد' },
        'damietta': { code: 'DAM', name: 'دمياط' },
        'minya': { code: 'MIN', name: 'المنيا' },
        'beni_suef': { code: 'BEN', name: 'بني سويف' },
        'sohag': { code: 'SOH', name: 'سوهاج' },
        'qena': { code: 'QEN', name: 'قنا' },
        'fayoum': { code: 'FAY', name: 'الفيوم' },
        'matruh': { code: 'MAT', name: 'مطروح' },
        'qalyubia': { code: 'KAL', name: 'القليوبية' },
        'monufia': { code: 'MON', name: 'منوفية' },
        'beheira': { code: 'BEH', name: 'البحيرة' },
        'kafr_el_sheikh': { code: 'KAF', name: 'كفر الشيخ' },
        'sharqia': { code: 'SHA', name: 'الشرقية' },
        'gharbia': { code: 'GHA', name: 'الغربية' },
        'asyut': { code: 'ASY', name: 'أسيوط' },
        'red_sea': { code: 'RED', name: 'البحر الأحمر' },
        'north_sinai': { code: 'NSI', name: 'سيناء الشمالية' },
        'south_sinai': { code: 'SSI', name: 'سيناء الجنوبية' },
        'new_valley': { code: 'NVL', name: 'الوادي الجديد' },
        'other': { code: 'OTH', name: 'أخرى' }
    },

    // Package types (Bosta format)
    packageTypes: {
        'envelope': 'ENVELOPE',
        'box': 'BOX',
        'large_box': 'LARGE_BOX',
        'palette': 'PALETTE'
    },

    // ========================================
    // Initialization
    // ========================================
    async init() {
        console.log('[Bosta] 🚀 Initializing integration...');
        
        // Load saved configuration
        this.loadConfig();
        
        // Generate webhook URL if not set
        if (!this.config.webhookUrl) {
            this.config.webhookUrl = this.generateWebhookUrl();
            this.saveConfig();
        }

        // Update UI
        this.updateConnectionStatus();
        
        console.log('[Bosta] ✅ Initialized');
        console.log('[Bosta] 📡 Webhook URL:', this.config.webhookUrl);
        console.log('[Bosta] 🔑 API Key:', this.config.apiKey ? '***' + this.config.apiKey.slice(-4) : 'Not set');
    },

    // ========================================
    // Configuration Management
    // ========================================
    
    loadConfig() {
        try {
            const saved = localStorage.getItem(APP_CONFIG.storageKeys.bostaConfig);
            if (saved) {
                const parsed = JSON.parse(saved);
                this.config = { ...this.config, ...parsed };
                console.log('[Bosta] Config loaded from localStorage');
            }
        } catch (e) {
            console.error('[Bosta] Error loading config:', e);
        }
    },

    saveConfig() {
        try {
            localStorage.setItem(APP_CONFIG.storageKeys.bostaConfig, JSON.stringify(this.config));
        } catch (e) {
            console.error('[Bosta] Error saving config:', e);
        }
    },

    generateWebhookUrl() {
        const baseUrl = window.location.origin + window.location.pathname;
        // Remove trailing slash if exists
        return baseUrl.replace(/\/$/, '') + '/api/bosta-webhook';
    },

    // Save Bosta settings from form
    saveSettings(apiKey, webhookSecret = null) {
        this.config.apiKey = apiKey?.trim();
        this.config.webhookSecret = webhookSecret?.trim();
        this.config.isConnected = !!this.config.apiKey && this.config.apiKey.length > 10;
        this.saveConfig();
        this.updateConnectionStatus();
        
        if (this.config.apiKey) {
            // Test the connection immediately
            this.testConnection().then(success => {
                if (success) {
                    showToast('تم ربط بوستا بنجاح! 🎉', 'success');
                    Notifications.add({
                        type: 'system',
                        title: 'تم ربط بوستا',
                        message: 'يمكنك الآن إرسال واستقبال الشحنات مباشرة',
                        icon: '🚚'
                    });
                }
            });
        }
        
        return this.config.isConnected;
    },

    // ========================================
    // REAL API CALLS ⭐
    // ========================================

    /**
     * Build headers for API requests
     */
    buildHeaders() {
        return {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${this.config.apiKey}`,
            'X-Bosta-Source': 'shipli-pwa'
        };
    }

    /**
     * Make API request with error handling
     */
    async apiRequest(endpoint, options = {}) {
        const url = this.config.baseUrl + endpoint;
        
        try {
            console.log(`[Bosta] 📤 API Request: ${options.method || 'GET'} ${url}`);
            
            const response = await fetch(url, {
                ...options,
                headers: {
                    ...this.buildHeaders(),
                    ...options.headers
                }
            });

            // Handle response
            let data;
            const contentType = response.headers.get('content-type');
            
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                data = await response.text();
            }

            if (!response.ok) {
                // Handle specific error codes
                const errorMessage = data?.message || data?.error || response.statusText;
                throw new Error(`API Error (${response.status}): ${errorMessage}`);
            }

            console.log(`[Bosta] 📥 API Response:`, data);
            return data;

        } catch (error) {
            console.error(`[Bosta] ❌ API Request Failed:`, error);
            
            // Provide user-friendly error messages
            if (error.message.includes('401') || error.message.includes('403')) {
                throw new Error('مفتاح API غير صالح أو منتهي الصلاحية');
            } else if (error.message.includes('404')) {
                throw new Error('الطلب غير موجود - تأكد من رقم التتبع');
            } else if (error.message.includes('422')) {
                throw new Error('بيانات غير صحيحة - تأكد من جميع الحقول المطلوبة');
            } else if (error.message.includes('429')) {
                throw new Error('تجاوزت عدد الطلبات المسموح - حاول لاحقاً');
            } else if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
                throw new Error('خطأ في الاتصال بالإنترنت - تحقق من اتصالك');
            }
            
            throw error;
        }
    },

    // ========================================
    // CORE API FUNCTIONS ⭐
    // ========================================

    /**
     * Test connection to Bosta API
     * Uses a lightweight call to verify API key works
     */
    async testConnection() {
        if (!this.config.apiKey) {
            showToast('يرجى إدخال مفتاح API أولاً', 'warning');
            return false;
        }

        showLoading(true);
        
        try {
            // Try to get cities list as a connection test
            const result = await this.apiRequest(this.config.endpoints.cities, {
                method: 'GET'
            });
            
            if (result && (result.data || result.cities || Array.isArray(result))) {
                this.config.isConnected = true;
                this.config.lastSync = new Date().toISOString();
                this.saveConfig();
                this.updateConnectionStatus();
                
                showToast('اتصال ناجح ببوستا! ✓', 'success');
                return true;
            } else {
                throw new Error('استجابة غير متوقعة من الخادم');
            }
            
        } catch (error) {
            console.error('[Bosta] Connection test failed:', error);
            this.config.isConnected = false;
            this.saveConfig();
            this.updateConnectionStatus();
            
            showToast('فشل الاتصال: ' + error.message, 'error');
            return false;
        } finally {
            showLoading(false);
        }
    },

    /**
     * CREATE DELIVERY - Send shipment to Bosta ⭐
     * POST /api/v2/deliveries?apiVersion=1
     */
    async createDelivery(shipmentData) {
        if (!this.config.isConnected || !this.config.apiKey) {
            throw new Error('بوستا غير مربوط - أدخل مفتاح API أولاً');
        }

        showLoading(true);

        try {
            // Split receiver name into first/last name
            const nameParts = (shipmentData.receiverName || '').split(' ');
            const firstName = nameParts[0] || '';
            const lastName = nameParts.slice(1).join(' ') || '';

            // Build the payload according to Bosta API format
            const payload = {
                // Delivery type
                type: shipmentData.type === 'cash_on_delivery' ? 'COD' : 
                      shipmentData.type === 'return' ? 'RETURN' : 
                      shipmentData.type === 'exchange' ? 'EXCHANGE' : 'DELIVERY',
                
                // Receiver information (Required)
                receiver: {
                    firstName: firstName,
                    lastName: lastName,
                    phone: shipmentData.receiverPhone,
                    secondPhone: shipmentData.receiverPhone2 || '',
                    city: this.getCityCode(shipmentData.receiverCity),
                    zone: shipmentData.receiverArea || '',
                    street: shipmentData.receiverAddress || '',
                    buildingNo: shipmentData.receiverBuilding || '',
                    floor: shipmentData.receiverFloor || '',
                    apartment: shipmentData.receiverApartment || '',
                    description: shipmentData.receiverNotes || ''
                },
                
                // Sender information (Optional but recommended)
                sender: {
                    firstName: (shipmentData.senderName || '').split(' ')[0] || '',
                    lastName: (shipmentData.senderName || '').split(' ').slice(1).join(' ') || '',
                    phone: shipmentData.senderPhone || '',
                    city: this.getCityCode(shipmentData.senderCity),
                    zone: shipmentData.senderArea || '',
                    street: shipmentData.senderAddress || ''
                },
                
                // COD amount (for cash on delivery)
                codAmount: parseFloat(shipmentData.codAmount) || 0,
                
                // Declared value
                declaredValue: parseFloat(shipmentData.declaredValue) || 0,
                
                // Weight in KG
                weight: parseFloat(shipmentData.weight) || 1,
                
                // Description of contents
                description: shipmentData.description || '',
                
                // Reference numbers (your internal tracking number)
                referenceNumbers: [
                    shipmentData.trackingNumber,
                    `SHIP-${Date.now()}`
                ].filter(Boolean),
                
                // Package specifications
                specs: {
                    packageCount: parseInt(shipmentData.pieces) || 1,
                    packageType: this.getPackageType(shipmentData.packageType)
                },
                
                // Webhook URL to receive updates
                webhooks: [this.config.webhookUrl].filter(Boolean),
                
                // Additional options
                options: {
                    allowOpenPackage: false,
                    returnToSender: shipmentData.type === 'return'
                }
            };

            console.log('[Bosta] Creating delivery with payload:', payload);

            // Make the API call
            const result = await this.apiRequest(
                `${this.config.endpoints.createDelivery}?apiVersion=1`,
                {
                    method: 'POST',
                    body: JSON.stringify(payload)
                }
            );

            // Process successful response
            if (result && (result.deliveryKey || result.trackingKey || result.data)) {
                const deliveryInfo = result.deliveryKey || result.trackingKey || result.data;
                
                console.log('[Bosta] ✅ Delivery created:', deliveryInfo);
                
                // Update local shipment with Bosta info
                this.saveBostaShipmentInfo(shipmentData.trackingNumber, deliveryInfo);
                
                showToast(`تم إنشاء الشحن في بوستا! 🎉\nرقم التتبع: ${deliveryInfo}`, 'success');
                
                return {
                    success: true,
                    bostaTrackingNumber: deliveryInfo,
                    message: 'تم إنشاء الشحن بنجاح في بوستا',
                    fullResponse: result
                };
            } else {
                throw new Error('لم يتم استلام رقم التتبع من بوستا');
            }

        } catch (error) {
            console.error('[Bosta] Delivery creation failed:', error);
            throw error;
        } finally {
            showLoading(false);
        }
    },

    /**
     * TRACK SHIPMENT - Get delivery status from Bosta ⭐
     * GET /api/v2/deliveries/{trackingKey}
     */
    async trackShipment(trackingKey) {
        if (!this.config.isConnected) {
            throw new Error('بوستا غير مربوط');
        }

        if (!trackingKey) {
            throw new Error('رقم التتبع مطلوب');
        }

        showLoading(true);

        try {
            const endpoint = this.config.endpoints.trackDelivery.replace(':trackingKey', trackingKey);
            const result = await this.apiRequest(endpoint, { method: 'GET' });

            if (result && (result.data || result.status || result.state)) {
                const trackingData = result.data || result;
                
                // Format tracking data
                const formattedData = {
                    trackingNumber: trackingKey,
                    status: this.mapBostaStatus(trackingData.status || trackingData.state),
                    currentLocation: trackingData.currentLocation || trackingData.zone || 'غير محدد',
                    estimatedDelivery: trackingData.estimatedDeliveryDate || trackingData.eta,
                    lastUpdate: trackingData.lastUpdated || trackingData.updatedAt || new Date().toISOString(),
                    
                    // Timeline of events
                    timeline: (trackingData.timeline || trackingData.events || []).map(event => ({
                        date: event.date || event.timestamp || event.createdAt,
                        status: event.status || event.state || event.type,
                        description: event.description || event.note || this.eventTypes[event.status]?.label || event.status,
                        location: event.location || event.city || event.zone
                    })),
                    
                    // Driver info (if available)
                    driver: trackingData.driver ? {
                        name: trackingData.driver.name,
                        phone: trackingData.driver.phone
                    } : null,
                    
                    // Full response for debugging
                    raw: result
                };

                console.log('[Bosta] Tracking data:', formattedData);
                return formattedData;
            } else {
                throw new Error('لم يتم العثور على بيانات الشحنة');
            }

        } catch (error) {
            console.error('[Bosta] Tracking failed:', error);
            showToast('فشل تتبع الشحنة: ' + error.message, 'error');
            return null;
        } finally {
            showLoading(false);
        }
    },

    /**
     * LIST CITIES - Get available cities from Bosta
     * GET /api/v2/cities
     */
    async getCities() {
        try {
            const result = await this.apiRequest(this.config.endpoints.cities, {
                method: 'GET'
            });
            return result.data || result.cities || result || [];
        } catch (error) {
            console.error('[Bosta] Failed to get cities:', error);
            return [];
        }
    },

    /**
     * CALCULATE PRICING - Get shipping cost estimate
     * GET /api/v2/pricing
     */
    async getPricing(fromCity, toCity, weight, codAmount = 0) {
        if (!this.config.isConnected) {
            throw new Error('بوستا غير مربوط');
        }

        try {
            const params = new URLSearchParams({
                fromCity: this.getCityCode(fromCity),
                toCity: this.getCityCode(toCity),
                weight: weight || 1,
                codAmount: codAmount || 0,
                type: 'DELIVERY'
            });

            const result = await this.apiRequest(
                `${this.config.endpoints.pricing}?${params.toString()}`,
                { method: 'GET' }
            );

            return result;
        } catch (error) {
            console.error('[Bosta] Pricing calculation failed:', error);
            throw error;
        }
    },

    // ========================================
    // WEBHOOK HANDLING ⭐
    // ========================================

    /**
     * Process incoming webhook from Bosta
     * This is called when Bosta sends status updates
     */
    processWebhook(payload) {
        console.log('[Bosta] 📥 Processing webhook payload:', payload);
        
        // Extract event data based on Bosta's webhook format
        const eventType = payload.type || payload.eventType || payload.status || payload.state || 'UNKNOWN';
        const trackingNumber = payload.trackingNumber || payload.deliveryKey || 
                            payload.trackingKey || payload.deliveryId || payload.hawbNumber || 'Unknown';
        
        // Get additional info
        const deliveryId = payload.deliveryId || payload.deliveryKey || payload.id;
        const timestamp = payload.timestamp || payload.created_at || payload.date || new Date().toISOString();

        // Get event info
        const eventInfo = this.eventTypes[eventType] || {
            label: this.formatEventType(eventType),
            icon: '📦',
            color: '#3b82f6'
        };

        // Create notification object
        const notification = {
            id: `bosta_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'bosta',
            title: `${eventInfo.icon} ${eventInfo.label}`,
            message: `شحنة ${trackingNumber}: ${eventInfo.label}`,
            data: {
                ...payload,
                eventType,
                trackingNumber,
                deliveryId,
                timestamp
            },
            timestamp: timestamp,
            read: false,
            priority: this.getEventPriority(eventType),
            trackingNumber: trackingNumber,
            eventType: eventType,
            deliveryId: deliveryId
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

        // Sync to Firebase if connected
        this.syncWebhookToFirebase(notification);

        console.log('[Bosta] ✅ Webhook processed successfully');
        return notification;
    },

    /**
     * Verify webhook signature (if using webhook secret)
     */
    verifyWebhookSignature(payload, signature) {
        if (!this.config.webhookSecret) {
            return true; // Skip verification if no secret set
        }
        
        // In production, implement HMAC verification here
        // For now, we'll accept all webhooks
        return true;
    },

    // ========================================
    // HELPER FUNCTIONS
    // ========================================

    /**
     * Map Bosta status to our local status
     */
    mapBostaStatus(bostaStatus) {
        const statusMap = {
            // Bosta statuses -> Local statuses
            'PENDING': 'pending',
            'CREATED': 'pending',
            'PICKED_UP': 'picked',
            'IN_TRANSIT': 'in_transit',
            'OUT_FOR_DELIVERY': 'in_transit',
            'DELIVERED': 'delivered',
            'DELIVERED_FAIL': 'pending',
            'RETURNED': 'returned',
            'CANCELLED': 'cancelled',
            'EXCEPTION': 'exception',
            'WAREHOUSED': 'in_transit'
        };

        return statusMap[bostaStatus] || bostaStatus?.toLowerCase() || 'pending';
    },

    /**
     * Format unknown event types nicely
     */
    formatEventType(type) {
        if (!type) return 'تحديث';
        return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    },

    /**
     * Get event priority level
     */
    getEventPriority(eventType) {
        const priorities = {
            'DELIVERED': 'high',
            'DELIVERED_FAIL': 'high',
            'EXCEPTION': 'high',
            'RETURNED': 'medium',
            'OUT_FOR_DELIVERY': 'medium',
            'PICKED_UP': 'low',
            'IN_TRANSIT': 'low',
            'CREATED': 'low'
        };
        return priorities[eventType] || 'low';
    },

    /**
     * Get Bosta city code
     */
    getCityCode(cityValue) {
        if (!cityValue) return 'CAI';
        
        const normalizedCity = cityValue.toLowerCase().trim();
        const cityInfo = this.cityCodes[normalizedCity];
        
        return cityInfo ? cityInfo.code : cityValue.toUpperCase();
    },

    /**
     * Get package type for Bosta
     */
    getPackageType(type) {
        return this.packageTypes[type] || 'BOX';
    },

    /**
     * Update local shipment based on Bosta event
     */
    updateLocalShipment(trackingNumber, eventType, payload) {
        try {
            const shipments = JSON.parse(localStorage.getItem(APP_CONFIG.storageKeys.shipments) || '[]');
            const index = shipments.findIndex(s => 
                s.trackingNumber === trackingNumber || 
                s.bostaTrackingNumber === trackingNumber ||
                payload.deliveryId && s.bostaTrackingNumber === payload.deliveryId ||
                payload.deliveryKey && s.bostaTrackingNumber === payload.deliveryKey
            );

            if (index !== -1) {
                // Map Bosta status to local status
                const newStatus = this.mapBostaStatus(eventType);
                
                shipments[index].status = newStatus;
                shipments[index].bostaLastUpdate = new Date().toISOString();
                shipments[index].bostaEventType = eventType;

                // Add to timeline
                if (!shipments[index].timeline) {
                    shipments[index].timeline = [];
                }
                
                // Check if this event already exists in timeline
                const eventExists = shipments[index].timeline.some(
                    e => e.status === eventType && 
                         new Date(e.date).toDateString() === new Date().toDateString()
                );
                
                if (!eventExists) {
                    shipments[index].timeline.unshift({
                        date: new Date().toISOString(),
                        status: eventType,
                        description: this.eventTypes[eventType]?.label || this.formatEventType(eventType),
                        location: payload.currentLocation || payload.zone || payload.city
                    });
                }

                localStorage.setItem(APP_CONFIG.storageKeys.shipments, JSON.stringify(shipments));

                // Refresh current view if on shipments tab
                if (APP_STATE.currentTab === 'shipments') {
                    renderShipmentsTable();
                }
            } else {
                console.log('[Bosta] Shipment not found locally:', trackingNumber);
            }
        } catch (error) {
            console.error('[Bosta] Error updating local shipment:', error);
        }
    },

    /**
     * Save Bosta shipment info to local storage
     */
    saveBostaShipmentInfo(localTrackingNumber, bostaTrackingNumber) {
        try {
            const shipments = JSON.parse(localStorage.getItem(APP_CONFIG.storageKeys.shipments) || '[]');
            const index = shipments.findIndex(s => s.trackingNumber === localTrackingNumber);
            
            if (index !== -1) {
                shipments[index].bostaTrackingNumber = bostaTrackingNumber;
                shipments[index].sentToBosta = true;
                shipments[index].sentToBostaAt = new Date().toISOString();
                localStorage.setItem(APP_CONFIG.storageKeys.shipments, JSON.stringify(shipments));
                console.log('[Bosta] Saved Bosta tracking info for:', localTrackingNumber);
            }
        } catch (error) {
            console.error('[Bosta] Error saving shipment info:', error);
        }
    },

    /**
     * Sync webhook data to Firebase
     */
    syncWebhookToFirebase(notification) {
        if (typeof db !== 'undefined' && db && auth?.currentUser) {
            try {
                const userId = auth.currentUser.uid;
                const ref = db.ref(`/users/${userId}/bosta_webhooks/${notification.id}`);
                ref.set(notification);
            } catch (error) {
                console.error('[Bosta] Firebase sync error:', error);
            }
        }
    },

    // ========================================
    // UI UPDATES
    // ========================================

    /**
     * Update connection status in UI
     */
    updateConnectionStatus() {
        const statusEl = document.getElementById('bostaConnectionStatus');
        const bostaStatusEl = document.getElementById('bostaStatus');
        const appStatusEl = document.getElementById('bostaAppStatus');
        
        if (statusEl) {
            statusEl.textContent = this.config.isConnected ? 'متصل ✓' : 'غير متصل';
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

    /**
     * Trigger push notification via service worker
     */
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
                        url: window.location.href.split('#')[0] + `#tracking=${notification.trackingNumber}`,
                        type: 'bosta',
                        trackingNumber: notification.trackingNumber
                    },
                    actions: [
                        { action: 'view', title: 'عرض التفاصيل' },
                        { action: 'close', title: 'إغلاق' }
                    ]
                }
            });
        }
    },

    /**
     * Simulate Bosta notification (for testing)
     */
    simulateNotification(eventType = 'DELIVERED', trackingNumber = null) {
        const mockPayload = {
            type: eventType,
            trackingNumber: trackingNumber || `TEST-${Date.now()}`,
            deliveryId: `BO${Date.now()}`,
            timestamp: new Date().toISOString(),
            currentLocation: 'القاهرة، مصر',
            zone: 'مدينة نصر',
            notes: 'إشعار تجريبي للاختبار'
        };

        console.log('[Bosta] 🧪 Simulating notification:', mockPayload);
        return this.processWebhook(mockPayload);
    },

    /**
     * Render Bosta updates list
     */
    renderUpdatesList() {
        const container = document.getElementById('bostaUpdatesList');
        if (!container) return;

        if (APP_STATE.bostaUpdates.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <span class="empty-icon">🚚</span>
                    <p>في انتظار تحديثات من بوستا</p>
                    <small>قم بإعداد Webhook لاستقبال الإشعارات</small>
                    <button class="secondary-btn small" onclick="BostaIntegration.simulateNotification()" style="margin-top: 12px;">
                        🧪 اختبار الإشعارات
                    </button>
                </div>
            `;
            return;
        }

        container.innerHTML = APP_STATE.bostaUpdates.slice(0, 15).map(update => `
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

    /**
     * Update dashboard stats
     */
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

    /**
     * Copy webhook URL to clipboard
     */
    copyWebhookUrl() {
        if (this.config.webhookUrl) {
            navigator.clipboard.writeText(this.config.webhookUrl).then(() => {
                showToast('تم نسخ رابط Webhook ✓', 'success');
            }).catch(() => {
                // Fallback for older browsers
                const input = document.createElement('input');
                input.value = this.config.webhookUrl;
                document.body.appendChild(input);
                input.select();
                document.execCommand('copy');
                document.body.removeChild(input);
                showToast('تم نسخ رابط Webhook ✓', 'success');
            });
        }
    },

    /**
     * Get connection stats
     */
    getStats() {
        return {
            isConnected: this.config.isConnected,
            hasApiKey: !!this.config.apiKey,
            totalUpdates: APP_STATE.bostaUpdates.length,
            todayUpdates: APP_STATE.todayBostaCount,
            lastSync: this.config.lastSync,
            webhookUrl: this.config.webhookUrl
        };
    },

    /**
     * Reset configuration
     */
    resetConfig() {
        this.config = {
            ...this.config,
            apiKey: null,
            isConnected: false,
            lastSync: null
        };
        this.saveConfig();
        this.updateConnectionStatus();
        showToast('تم إعادة تعيين إعدادات بوستا', 'info');
    }
};

// Make available globally
window.BostaIntegration = BostaIntegration;

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    BostaIntegration.init();
});

console.log('[Bosta] Module loaded - Ready for real API integration! 🚀');
