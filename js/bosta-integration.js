/**
 * ========================================
 * شحنلي - Bosta Integration Module ✅
 * Based on Official Bosta SDK & Documentation
 * 
 * 📚 References:
 * - SDK: https://github.com/bostaapp/bosta-nodejs
 * - Docs: https://docs.bosta.co
 * - Dashboard: https://business.bosta.co/settings/api-integration
 * 
 * 🔗 API Details (Verified):
 * - Base URL: https://app.bosta.co
 * - Auth: Bearer Token (API Key)
 * - Key Format: From business.bosta.co → Settings → API Integration
 * 
 * 📡 Endpoints:
 * - POST /api/v2/deliveries?apiVersion=1 → Create Delivery
 * - GET /api/v2/deliveries/{trackingKey} → Track Delivery  
 * - GET /api/v2/cities → Get Cities
 * 
 * 💾 Firebase Integration:
 * - Saves deliveries to: /deliveries/{deliveryId}
 * - Syncs status updates in real-time
 * - Webhook events stored at: /bosta-events/{eventId}
 * ========================================
 */

// Ensure browser environment
if (typeof window === 'undefined') {
    throw new Error('[Bosta] Error: Must run in browser environment');
}

/**
 * BostaIntegration - Main Module
 */
const BostaIntegration = {
    // ========================================
    // Configuration ⭐
    // ========================================
    config: {
        apiKey: null,
        webhookUrl: null,
        webhookSecret: null,
        isConnected: false,
        lastSync: null,
        
        // Verified Bosta API Configuration
        baseUrl: 'https://app.bosta.co',
        apiVersion: 'v2',
        endpoints: {
            createDelivery: '/api/v2/deliveries',
            trackDelivery: '/api/v2/deliveries/',
            listDeliveries: '/api/v2/deliveries',
            cities: '/api/v2/cities',
            zones: '/api/v2/zones/',
            pricing: '/api/v2/pricing'
        }
    },

    // Firebase Reference (set after init)
    firebaseRef: null,

    // Event types mapping (Arabic) - Based on real Bosta states
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

    // City codes (Bosta format)
    cityCodes: {
        'cairo': { code: 'EG-CAI', name: 'القاهرة', id: '1' },
        'alexandria': { code: 'EG-ALX', name: 'الإسكندرية', id: '2' },
        'giza': { code: 'EG-GIZ', name: 'الجيزة', id: '3' },
        'mansoura': { code: 'EG-MAN', name: 'المنصورة', id: '4' },
        'tanta': { code: 'EG-TAN', name: 'طنطا', id: '5' },
        'ismailia': { code: 'EG-ISM', name: 'الإسماعيلية', id: '6' },
        'suez': { code: 'EG-SUE', name: 'السويس', id: '7' },
        'luxor': { code: 'EG-LUX', name: 'الأقصر', id: '8' },
        'aswan': { code: 'EG-ASW', name: 'أسوان', id: '9' },
        '6th_october': { code: 'EG-6OC', name: 'السادس من أكتوبر', id: '10' },
        '10th_ramadan': { code: 'EG-10R', name: 'العاشر من رمضان', id: '11' },
        'shubra_el_kheima': { code: 'EG-SHU', name: 'شبرا الخيمة', id: '12' },
        'port_said': { code: 'EG-PSA', name: 'بور سعيد', id: '13' },
        'damietta': { code: 'EG-DAM', name: 'دمياط', id: '14' },
        'minya': { code: 'EG-MIN', name: 'المنيا', id: '15' },
        'beni_suef': { code: 'EG-BEN', name: 'بني سويف', id: '16' },
        'sohag': { code: 'EG-SOH', name: 'سوهاج', id: '17' },
        'qena': { code: 'EG-QEN', name: 'قنا', id: '18' },
        'fayoum': { code: 'EG-FAY', name: 'الفيوم', id: '19' },
        'matruh': { code: 'EG-MAT', name: 'مطروح', id: '20' },
        'qalyubia': { code: 'EG-KAL', name: 'القليوبية', id: '21' },
        'monufia': { code: 'EG-MON', name: 'منوفية', id: '22' },
        'beheira': { code: 'EG-BEH', name: 'البحيرة', id: '23' },
        'kafr_el_sheikh': { code: 'EG-KAF', name: 'كفر الشيخ', id: '24' },
        'sharqia': { code: 'EG-SHA', name: 'الشرقية', id: '25' },
        'gharbia': { code: 'EG-GHA', name: 'الغربية', id: '26' },
        'asyut': { code: 'EG-ASY', name: 'أسيوط', id: '27' },
        'red_sea': { code: 'EG-RED', name: 'البحر الأحمر', id: '28' },
        'north_sinai': { code: 'EG-NSI', name: 'سيناء الشمالية', id: '29' },
        'south_sinai': { code: 'EG-SSI', name: 'سيناء الجنوبية', id: '30' },
        'new_valley': { code: 'EG-NVL', name: 'الوادي الجديد', id: '31' }
    },

    // Package types (Bosta format)
    packageTypes: {
        'envelope': 'ENVELOPE',
        'box': 'BOX',
        'large_box': 'LARGE_BOX',
        'palette': 'PALETTE'
    },

    // Delivery types (Bosta format)
    deliveryTypes: {
        'delivery': 'DELIVERY',
        'cod': 'COD',
        'cash_on_delivery': 'COD',
        'return': 'RETURN',
        'exchange': 'EXCHANGE'
    },

    // ========================================
    // Initialization ⭐
    // ========================================
    
    /**
     * Initialize Bosta Integration
     * Sets up Firebase connection and loads saved config
     */
    async init() {
        console.log('[Bosta] 🚀 Initializing Bosta Integration v3...');
        
        try {
            // Load saved configuration from localStorage
            this.loadConfig();
            
            // Generate webhook URL if not set
            if (!this.config.webhookUrl) {
                this.config.webhookUrl = this.generateWebhookUrl();
                this.saveConfig();
            }

            // Initialize Firebase reference if available
            if (typeof firebase !== 'undefined' && firebase.database) {
                this.initFirebaseConnection();
            } else {
                console.log('[Bosta] ⏳ Firebase not loaded yet, will retry...');
                // Retry after a short delay
                setTimeout(() => this.initFirebaseConnection(), 2000);
            }

            // Update UI status
            this.updateConnectionStatus();
            
            console.log('[Bosta] ✅ Initialized successfully!');
            console.log('[Bosta] 📡 Webhook URL:', this.config.webhookUrl);
            console.log('[Bosta] 🔑 API Key:', this.config.apiKey ? `***${this.config.apiKey.slice(-4)}` : 'Not set');
            
        } catch (error) {
            console.error('[Bosta] ❌ Initialization error:', error);
        }
    },

    /**
     * Initialize Firebase Database Connection
     * Creates reference for storing Bosta data
     */
    initFirebaseConnection() {
        try {
            if (typeof firebase === 'undefined' || !firebase.database) {
                console.warn('[Bosta] ⚠️ Firebase not available');
                return;
            }

            const database = firebase.database();
            
            // Main references
            this.firebaseRef = {
                deliveries: database.ref('deliveries'),
                bostaEvents: database.ref('bosta_events'),
                settings: database.ref('settings/bosta'),
                syncLog: database.ref('sync_log')
            };

            // Listen for remote changes (real-time sync)
            this.setupFirebaseListeners();
            
            console.log('[Bosta] 🔥 Firebase connection established');

        } catch (error) {
            console.error('[Bosta] ❌ Firebase init error:', error);
        }
    },

    /**
     * Setup Firebase Real-time Listeners
     */
    setupFirebaseListeners() {
        if (!this.firebaseRef) return;

        // Listen for delivery status updates from other clients/webhooks
        this.firebaseRef.deliveries.on('child_changed', (snapshot) => {
            const delivery = snapshot.val();
            console.log(`[Bosta] 🔄 Delivery updated: ${delivery.trackingNumber} - ${delivery.status}`);
            
            // Update local state and notify user
            if (typeof APP_STATE !== 'undefined') {
                APP_STATE.bostaUpdates = APP_STATE.bostaUpdates || [];
                APP_STATE.bostaUpdates.unshift({
                    id: snapshot.key + '_' + Date.now(),
                    eventType: delivery.status || 'UPDATED',
                    title: `تحديث الشحنة ${delivery.trackingNumber}`,
                    message: this.getStatusLabel(delivery.status),
                    time: new Date().toLocaleString('ar-EG'),
                    read: false
                });
                
                // Keep only last 50 updates
                if (APP_STATE.bostaUpdates.length > 50) {
                    APP_STATE.bostaUpdates = APP_STATE.bostaUpdates.slice(0, 50);
                }
            }

            // Show notification
            if (typeof showToast === 'function') {
                showToast(`${this.getStatusLabel(delivery.status)} - ${delivery.trackingNumber}`, 'info');
            }
        });

        // Listen for new webhook events
        this.firebaseRef.bostaEvents.limitToLast(1).on('child_added', (snapshot) => {
            const event = snapshot.val();
            console.log('[Bosta] 📨 New webhook event:', event.type);
            
            // Process webhook event
            this.handleWebhookEvent(event);
        });
    },

    // ========================================
    // Configuration Management
    // ========================================
    
    loadConfig() {
        try {
            const saved = localStorage.getItem('bosta_config_v3');
            if (saved) {
                const parsed = JSON.parse(saved);
                this.config = {
                    ...this.config,
                    apiKey: parsed.apiKey || null,
                    webhookUrl: parsed.webhookUrl || null,
                    webhookSecret: parsed.webhookSecret || null,
                    isConnected: !!(parsed.apiKey && parsed.apiKey.length > 10),
                    lastSync: parsed.lastSync || null
                };
                console.log('[Bosta] ✅ Config loaded from localStorage');
            }
        } catch (e) {
            console.error('[Bosta] ⚠️ Error loading config:', e);
            localStorage.removeItem('bosta_config_v3');
        }
    },

    saveConfig() {
        try {
            const configToSave = {
                apiKey: this.config.apiKey,
                webhookUrl: this.config.webhookUrl,
                webhookSecret: this.config.webhookSecret,
                isConnected: this.config.isConnected,
                lastSync: this.config.lastSync
            };
            localStorage.setItem('bosta_config_v3', JSON.stringify(configToSave));
            
            // Also save to Firebase if connected
            if (this.firebaseRef && this.firebaseRef.settings) {
                this.firebaseRef.settings.set(configToSave);
            }
        } catch (e) {
            console.error('[Bosta] ❌ Error saving config:', e);
        }
    },

    generateWebhookUrl() {
        const baseUrl = window.location.origin;
        const path = window.location.pathname.replace(/\/$/, '');
        return `${baseUrl}${path}/api/bosta-webhook`;
    },

    /**
     * Save Bosta Settings & Test Connection
     * @param {string} apiKey - Bosta API Key from dashboard
     * @param {string} webhookSecret - Optional webhook secret
     * @returns {Promise<boolean>} Success status
     */
    async saveSettings(apiKey, webhookSecret = null) {
        console.log('[Bosta] 💾 Saving settings...');
        
        // Validate API key
        if (apiKey && apiKey.trim().length < 10) {
            if (typeof showToast === 'function') {
                showToast('❌ مفتاح API قصير جداً (يجب أن يكون 10 أحرف على الأقل)', 'error');
            }
            return false;
        }
        
        // Update config
        this.config.apiKey = apiKey?.trim() || null;
        this.config.webhookSecret = webhookSecret?.trim() || null;
        this.config.isConnected = !!(this.config.apiKey && this.config.apiKey.length > 10);
        
        // Save to localStorage and Firebase
        this.saveConfig();
        this.updateConnectionStatus();
        
        // Test connection if we have an API key
        if (this.config.isConnected) {
            console.log('[Bosta] 🔍 Testing API connection...');
            
            try {
                const success = await this.testConnection();
                
                if (success) {
                    if (typeof showToast === 'function') {
                        showToast('✅ تم ربط بوستا بنجاح! جاهز لإرسال الشحنات', 'success');
                    }
                    
                    // Add notification
                    if (typeof Notifications !== 'undefined') {
                        Notifications.add({
                            type: 'system',
                            title: 'تم ربط بوستا',
                            message: 'يمكنك الآن إرسال واستقبال الشحنات مباشرة من بوستا',
                            icon: '🚚'
                        });
                    }
                    
                    return true;
                } else {
                    return false;
                }
            } catch (error) {
                console.error('[Bosta] Connection test error:', error);
                return false;
            }
        }
        
        return false;
    },

    // ========================================
    // CORE API FUNCTIONS ⭐
    // ========================================

    /**
     * Build Headers for API Requests
     * Uses Bearer Token authentication
     */
    buildHeaders() {
        return {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${this.config.apiKey}`,
            'X-Bosta-Source': 'shipli-pwa-v3'
        };
    },

    /**
     * Make API Request with Error Handling
     * @param {string} endpoint - API endpoint path
     * @param {object} options - Fetch options
     * @returns {Promise<object>} Response data
     */
    async apiRequest(endpoint, options = {}) {
        if (!this.config.apiKey) {
            throw new Error('مفتاح API غير موجود - يرجى إدخاله في الإعدادات أولاً');
        }

        const url = this.config.baseUrl + endpoint;
        
        console.log(`[Bosta] 📤 ${options.method || 'GET'} ${url}`);
        
        try {
            const response = await fetch(url, {
                ...options,
                headers: {
                    ...this.buildHeaders(),
                    ...(options.headers || {})
                }
            });

            // Parse response based on content type
            let data;
            const contentType = response.headers.get('content-type') || '';
            
            if (contentType.includes('application/json')) {
                data = await response.json();
            } else {
                const textData = await response.text();
                try {
                    data = JSON.parse(textData);
                } catch {
                    data = { raw: textData };
                }
            }

            // Handle HTTP errors with Arabic messages
            if (!response.ok) {
                const errorMessage = data?.message || data?.error || data?.msg || response.statusText;
                
                let userMessage;
                switch (response.status) {
                    case 401:
                    case 403:
                        userMessage = '❌ مفتاح API غير صالح أو منتهي الصلاحية';
                        break;
                    case 404:
                        userMessage = '❌ الطلب غير موجود - تأكد من رقم التتبع';
                        break;
                    case 422:
                        userMessage = '❌ بيانات غير صحيحة - تأكد من جميع الحقول المطلوبة';
                        break;
                    case 429:
                        userMessage = '⏰ تجاوزت عدد الطلبات المسموح - حاول بعد دقيقة';
                        break;
                    case 500:
                    case 502:
                    case 503:
                        userMessage = '⚠️ مشكلة في خوادم بوستا - حاول لاحقاً';
                        break;
                    default:
                        userMessage = `❌ خطأ (${response.status}): ${errorMessage}`;
                }
                
                throw new Error(userMessage);
            }

            console.log(`[Bosta] 📥 Response OK`);
            return data;

        } catch (error) {
            // Handle network errors
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                throw new Error('🌐 خطأ في الاتصال بالإنترنت - تحقق من اتصالك بالشبكة');
            }
            
            console.error(`[Bosta] ❌ API Error:`, error.message);
            throw error;
        }
    },

    /**
     * Test Connection to Bosta API
     * Uses lightweight cities endpoint
     * @returns {Promise<boolean>} True if successful
     */
    async testConnection() {
        if (!this.config.apiKey) {
            console.log('[Bosta] ⚠️ No API key provided');
            return false;
        }

        if (typeof showLoading === 'function') showLoading(true);

        try {
            // Use cities endpoint as lightweight test
            const result = await this.apiRequest(this.config.endpoints.cities + '?limit=1', {
                method: 'GET'
            });

            // Any valid response means connection works
            if (result && (result.data || result.cities || Array.isArray(result) || result.records)) {
                this.config.isConnected = true;
                this.config.lastSync = new Date().toISOString();
                this.saveConfig();
                this.updateConnectionStatus();

                console.log('[Bosta] ✅ Connection test successful!');
                return true;
            } else {
                // Unexpected but still consider it connected
                this.config.isConnected = true;
                this.saveConfig();
                this.updateConnectionStatus();
                return true;
            }

        } catch (error) {
            console.error('[Bosta] ❌ Connection test failed:', error.message);
            this.config.isConnected = false;
            this.saveConfig();
            this.updateConnectionStatus();

            if (typeof showToast === 'function') {
                showToast('فشل الاتصال ببوستا: ' + error.message, 'error');
            }
            return false;
        } finally {
            if (typeof showLoading === 'function') showLoading(false);
        }
    },

    // ========================================
    // CREATE DELIVERY ⭐ (Main Function)
    // ========================================

    /**
     * Create New Delivery/Shipment on Bosta
     * Based on official SDK: bosta.delivery.createDelivery()
     * 
     * @param {object} shipmentData - Shipment details
     * @param {string} shipmentData.type - DELIVERY | COD | RETURN | EXCHANGE
     * @param {object} shipmentData.receiver - Receiver info
     * @param {object} shipmentData.pickup - Pickup/Sender info
     * @param {number} shipmentData.codAmount - COD amount (if type=COD)
     * @returns {Promise<object>} Created delivery with tracking number
     */
    async createDelivery(shipmentData) {
        // Validate connection
        if (!this.config.apiKey) {
            throw new Error('بوستا غير مربوط - أدخل مفتاح API في الإعدادات أولاً');
        }

        console.log('[Bosta] 📦 Creating new delivery...', shipmentData);

        if (typeof showLoading === 'function') showLoading(true);

        try {
            // Split receiver name into first/last
            const nameParts = (shipmentData.receiverName || '').trim().split(/\s+/);
            const firstName = nameParts[0] || 'غير محدد';
            const lastName = nameParts.slice(1).join(' ') || '';

            // Build payload according to Bosta API v2 format (from SDK)
            const payload = {
                // Delivery Type (Required)
                type: this.getDeliveryType(shipmentData.type),
                
                // Drop Off Address / Receiver (Required)
                dropOffAddress: {
                    firstName: firstName,
                    lastName: lastName,
                    phone: this.formatPhone(shipmentData.receiverPhone),
                    secondPhone: this.formatPhone(shipmentData.receiverPhone2) || '',
                    city: this.getCityCode(shipmentData.receiverCity || shipmentData.city),
                    zone: shipmentData.receiverArea || shipmentData.area || '',
                    street: shipmentData.receiverAddress || shipmentData.address || '',
                    buildingNo: String(shipmentData.receiverBuilding || shipmentData.buildingNo || ''),
                    floor: String(shipmentData.receiverFloor || shipmentData.floor || ''),
                    apartment: String(shipmentData.receiverApartment || shipmentData.apartment || ''),
                    description: shipmentData.receiverNotes || ''
                },
                
                // Pickup Address / Sender (Optional but recommended)
                pickupAddress: {
                    firstName: ((shipmentData.senderName || shipmentData.storeName || '').split(/\s+/)[0]) || 'المتجر',
                    lastName: ((shipmentData.senderName || shipmentData.storeName || '').split(/\s+/).slice(1).join(' ')) || '',
                    phone: this.formatPhone(shipmentData.senderPhone || shipmentData.storePhone || ''),
                    city: this.getCityCode(shipmentData.senderCity || shipmentData.pickupCity),
                    zone: shipmentData.senderArea || shipmentData.pickupArea || '',
                    street: shipmentData.senderAddress || shipmentData.pickupAddress || ''
                },
                
                // Package Specs (from SDK: specs parameter)
                specs: {
                    type: this.getPackageType(shipmentData.packageType),
                    weight: parseFloat(shipmentData.weight) || 1,
                    description: shipmentData.description || shipmentData.packageDescription || '',
                    itemsCount: parseInt(shipmentData.quantity) || 1,
                    items: [{
                        name: shipmentData.itemName || 'منتج',
                        quantity: parseInt(shipmentData.quantity) || 1
                    }]
                },
                
                // COD Amount (from SDK: cod parameter)
                cod: shipmentData.codAmount ? parseFloat(shipmentData.codAmount) : 0,
                
                // Business Reference (for tracking)
                businessReference: shipmentData.orderId || shipmentData.reference || Date.now().toString(),
                
                // Notes
                notes: shipmentData.notes || `شحنة من شحنلي - ${new Date().toLocaleDateString('ar-EG')}`
            };

            // Clean up payload (remove empty strings)
            Object.keys(payload).forEach(key => {
                if (payload[key] === '' || payload[key] === null || payload[key] === undefined) {
                    delete payload[key];
                }
            });

            console.log('[Bosta] 📤 Sending delivery payload:', JSON.stringify(payload, null, 2));

            // Make API call to create delivery
            const result = await this.apiRequest(
                this.config.endpoints.createDelivery + '?apiVersion=1',
                {
                    method: 'POST',
                    body: JSON.stringify(payload)
                }
            );

            // Process response (SDK returns _id and trackingNumber)
            if (result) {
                const deliveryResult = {
                    success: true,
                    deliveryId: result._id || result.deliveryId || result.id,
                    trackingNumber: result.trackingNumber || result.tracking_key,
                    status: result.status || result.state || 'CREATED',
                    cost: result.cost || result.price || result.totalPrice,
                    estimatedDelivery: result.estimatedDelivery || result.eta,
                    rawData: result,
                    createdAt: new Date().toISOString()
                };

                console.log('[Bosta] ✅ Delivery created successfully!', deliveryResult);

                // 💾 SAVE TO FIREBASE DATABASE
                await this.saveDeliveryToFirebase(deliveryResult, payload);

                // Update sync time
                this.config.lastSync = new Date().toISOString();
                this.saveConfig();

                // Show success message
                if (typeof showToast === 'function') {
                    showToast(
                        `✅ تم إنشاء الشحنة بنجاح!\nرقم التتبع: ${deliveryResult.trackingNumber}`, 
                        'success'
                    );
                }

                // Add to notifications
                if (typeof Notifications !== 'undefined') {
                    Notifications.add({
                        type: 'bosta',
                        title: 'شحنة جديدة',
                        message: `رقم التتبع: ${deliveryResult.trackingNumber}`,
                        icon: '📦'
                    });
                }

                return deliveryResult;
            }

            throw new Error('استجابة فارغة من خادم بوستا');

        } catch (error) {
            console.error('[Bosta] ❌ Create delivery failed:', error.message);

            if (typeof showToast === 'function') {
                showToast('فشل إنشاء الشحنة: ' + error.message, 'error');
            }

            throw error;
        } finally {
            if (typeof showLoading === 'function') showLoading(false);
        }
    },

    /**
     * Save Delivery to Firebase Database
     * Stores delivery data for offline access and syncing
     */
    async saveDeliveryToFirebase(deliveryResult, originalPayload) {
        if (!this.firebaseRef || !this.firebaseRef.deliveries) {
            console.log('[Bosta] ⚠️ Firebase not available, skipping save');
            return;
        }

        try {
            const deliveryRecord = {
                ...deliveryResult,
                originalPayload: originalPayload,
                syncedAt: new Date().toISOString(),
                source: 'shipli-pwa',
                statusHistory: [{
                    status: deliveryResult.status,
                    timestamp: new Date().toISOString(),
                    note: 'تم إنشاء الشحنة'
                }]
            };

            // Save to Firebase using delivery ID as key
            await this.firebaseRef.deliveries.child(deliveryResult.deliveryId).set(deliveryRecord);
            
            console.log('[Bosta] 💾 Delivery saved to Firebase:', deliveryResult.deliveryId);

            // Also log the sync event
            if (this.firebaseRef.syncLog) {
                await this.firebaseRef.syncLog.push({
                    action: 'CREATE_DELIVERY',
                    deliveryId: deliveryResult.deliveryId,
                    trackingNumber: deliveryResult.trackingNumber,
                    timestamp: new Date().toISOString(),
                    success: true
                });
            }

        } catch (error) {
            console.error('[Bosta] ❌ Failed to save to Firebase:', error);
            // Don't throw - delivery was created successfully on Bosta
        }
    },

    // ========================================
    // TRACKING FUNCTIONS
    // ========================================

    /**
     * Track Delivery by Tracking Number
     * @param {string} trackingNumber - Bosta tracking number
     * @returns {Promise<object>} Tracking data with history
     */
    async trackDelivery(trackingNumber) {
        if (!trackingNumber) {
            throw new Error('رقم التتبع مطلوب');
        }

        console.log('[Bosta] 🔍 Tracking delivery:', trackingNumber);

        if (typeof showLoading === 'function') showLoading(true);

        try {
            const result = await this.apiRequest(
                this.config.endpoints.trackDelivery + encodeURIComponent(trackingNumber),
                { method: 'GET' }
            );

            // Parse tracking data
            const trackingData = {
                trackingNumber: trackingNumber,
                currentStatus: result.currentStatus || result.status || result.state,
                statusLabel: this.getStatusLabel(result.currentStatus || result.status || result.state),
                events: (result.events || result.trackingEvents || []).map(event => ({
                    eventType: event.type || event.eventType || event.status,
                    eventLabel: this.getStatusLabel(event.type || event.eventType || event.status),
                    timestamp: event.timestamp || event.date || event.createdAt,
                    description: event.description || event.note || '',
                    location: event.location || event.branch || event.city || ''
                })),
                receiver: result.dropOff || result.receiver,
                sender: result.pickUp || result.sender,
                cost: result.cost || result.totalPrice || result.fees,
                estimatedDelivery: result.estimatedDelivery || result.eta,
                rawData: result
            };

            console.log('[Bosta] 📍 Tracking data received:', trackingData.currentStatus);

            // Update Firebase with latest status
            if (this.firebaseRef && this.firebaseRef.deliveries) {
                this.updateDeliveryStatusInFirebase(trackingNumber, trackingData);
            }

            return trackingData;

        } catch (error) {
            console.error('[Bosta] ❌ Tracking failed:', error.message);
            throw error;
        } finally {
            if (typeof showLoading === 'function') showLoading(false);
        }
    },

    /**
     * Update delivery status in Firebase
     */
    async updateDeliveryStatusInFirebase(trackingNumber, trackingData) {
        if (!this.firebaseRef || !this.firebaseRef.deliveries) return;

        try {
            // Find delivery by tracking number and update
            const snapshot = await this.firebaseRef.deliveries
                .orderByChild('trackingNumber')
                .equalTo(trackingNumber)
                .once('value');

            if (snapshot.exists()) {
                const updates = {
                    currentStatus: trackingData.currentStatus,
                    statusLabel: trackingData.statusLabel,
                    lastUpdated: new Date().toISOString(),
                    events: trackingData.events
                };

                // Push new status to history
                snapshot.forEach((childSnapshot) => {
                    this.firebaseRef.deliveries.child(childSnapshot.key).update(updates);
                    console.log('[Bosta] 🔄 Updated delivery status in Firebase');
                });
            }
        } catch (error) {
            console.error('[Bosta] ❌ Failed to update Firebase:', error);
        }
    },

    /**
     * Get Available Cities from Bosta
     * @returns {Promise<Array>} List of cities
     */
    async getCities() {
        console.log('[Bosta] 🏙️ Fetching cities...');

        try {
            const result = await this.apiRequest(this.config.endpoints.cities, {
                method: 'GET'
            });

            const cities = result.data || result.cities || result.records || (Array.isArray(result) ? result : []);
            
            console.log(`[Bosta] ✅ Found ${cities.length} cities`);
            return cities;

        } catch (error) {
            console.error('[Bosta] ❌ Failed to fetch cities:', error.message);
            // Return default cities on error
            return Object.values(this.cityCodes).map(c => ({
                _id: c.id,
                name: c.name,
                code: c.code
            }));
        }
    },

    // ========================================
    // WEBHOOK HANDLING ⭐
    // ========================================

    /**
     * Handle Incoming Webhook from Bosta
     * Called by Service Worker or directly
     * @param {object} eventData - Webhook payload from Bosta
     */
    handleWebhookEvent(eventData) {
        console.log('[Bosta] 📨 Processing webhook event:', eventData);

        try {
            const event = {
                id: eventData.id || eventData.deliveryId || Date.now().toString(),
                type: eventData.type || eventData.status || eventData.eventType || 'UNKNOWN',
                trackingNumber: eventData.trackingNumber || eventData.tracking_key || '',
                deliveryId: eventData.deliveryId || eventData._id || '',
                timestamp: eventData.timestamp || eventData.date || new Date().toISOString(),
                data: eventData,
                processedAt: new Date().toISOString()
            };

            // Get status label
            const eventInfo = this.eventTypes[event.type];
            const statusLabel = eventInfo ? `${eventInfo.icon} ${eventInfo.label}` : event.type;

            // Update local state
            if (typeof APP_STATE !== 'undefined') {
                APP_STATE.bostaUpdates = APP_STATE.bostaUpdates || [];
                APP_STATE.bostaUpdates.unshift({
                    id: event.id,
                    eventType: event.type,
                    title: `تحديث الشحنة ${event.trackingNumber}`,
                    message: statusLabel,
                    time: new Date().toLocaleString('ar-EG'),
                    read: false
                });

                // Limit updates
                if (APP_STATE.bostaUpdates.length > 50) {
                    APP_STATE.bostaUpdates = APP_STATE.bostaUpdates.slice(0, 50);
                }

                // Update today's count
                const today = new Date().toDateString();
                APP_STATE.todayBostaCount = (APP_STATE.todayBostaCount || 0) + 1;
            }

            // Show notification
            if (typeof showToast === 'function') {
                showToast(`${statusLabel} - ${event.trackingNumber}`, 'info');
            }

            // Add to Notifications system
            if (typeof Notifications !== 'undefined') {
                Notifications.add({
                    type: 'bosta',
                    title: `تحديث شحنة ${event.trackingNumber}`,
                    message: statusLabel,
                    icon: eventInfo?.icon || '📦'
                });
            }

            // Save to Firebase
            this.saveWebhookEventToFirebase(event);

            // Update UI
            this.showUpdatesList();
            this.updateDashboardStats();

            console.log('[Bosta] ✅ Webhook event processed:', event.type);

        } catch (error) {
            console.error('[Bosta] ❌ Webhook processing error:', error);
        }
    },

    /**
     * Save Webhook Event to Firebase
     */
    async saveWebhookEventToFirebase(event) {
        if (!this.firebaseRef || !this.firebaseRef.bostaEvents) return;

        try {
            await this.firebaseRef.bostaEvents.child(event.id).set(event);
            console.log('[Bosta] 💾 Webhook event saved to Firebase');
        } catch (error) {
            console.error('[Bosta] ❌ Failed to save webhook event:', error);
        }
    },

    // ========================================
    // HELPER FUNCTIONS
    // ========================================

    /**
     * Get City Code from Name or Code
     */
    getCityCode(cityInput) {
        if (!cityInput) return 'EG-CAI'; // Default Cairo
        
        const input = cityInput.toString().toLowerCase().trim();
        
        // Check if already a code (starts with EG-)
        if (/^EG-/i.test(cityInput)) {
            return cityInput.toUpperCase();
        }
        
        // Look up by name or key
        const cityEntry = Object.entries(this.cityCodes).find(([key, val]) => 
            key === input || 
            val.name.includes(input) ||
            val.code.toLowerCase() === input
        );
        
        return cityEntry ? cityEntry[1].code : 'EG-CAI';
    },

    /**
     * Get Bosta Package Type Code
     */
    getPackageType(type) {
        if (!type) return 'BOX';
        const typeMap = {
            'envelope': 'ENVELOPE',
            'mufattat': 'ENVELOPE',
            'box': 'BOX',
            'large_box': 'LARGE_BOX',
            'kabeer': 'LARGE_BOX',
            'palette': 'PALETTE'
        };
        return (typeMap[type.toLowerCase()] || 'BOX').toUpperCase();
    },

    /**
     * Get Bosta Delivery Type Code
     */
    getDeliveryType(type) {
        if (!type) return 'DELIVERY';
        const typeMap = {
            'delivery': 'DELIVERY',
            'cod': 'COD',
            'cash_on_delivery': 'COD',
            'return': 'RETURN',
            'exchange': 'EXCHANGE'
        };
        return (typeMap[type.toLowerCase()] || 'DELIVERY').toUpperCase();
    },

    /**
     * Format Phone Number for Egypt (+20...)
     */
    formatPhone(phone) {
        if (!phone) return '';
        
        let cleaned = phone.toString().replace(/[\s\-\(\)]/g, '');
        
        // Add Egypt country code
        if (cleaned.startsWith('0')) {
            cleaned = '+20' + cleaned.substring(1);
        } else if (cleaned.startsWith('20') && !cleaned.startsWith('+')) {
            cleaned = '+' + cleaned;
        } else if (!cleaned.startsWith('+')) {
            cleaned = '+20' + cleaned;
        }
        
        return cleaned;
    },

    /**
     * Get Arabic Status Label
     */
    getStatusLabel(status) {
        if (!status) return 'غير معروف';
        
        const statusUpper = status.toUpperCase().replace(/\s/g, '_').replace(/-/g, '_');
        const eventInfo = this.eventTypes[statusUpper];
        
        return eventInfo ? `${eventInfo.icon} ${eventInfo.label}` : status;
    },

    // ========================================
    // UI FUNCTIONS
    // ========================================

    /**
     * Update Connection Status UI
     */
    updateConnectionStatus() {
        const statusEl = document.getElementById('bostaConnectionStatus');
        const btnEl = document.getElementById('connectBostaBtn');
        
        if (statusEl) {
            if (this.config.isConnected && this.config.apiKey) {
                statusEl.innerHTML = '<span class="status-connected">● متصل ببوستا</span>';
                statusEl.className = 'connection-status connected';
            } else {
                statusEl.innerHTML = '<span class="status-disconnected">○ غير متصل</span>';
                statusEl.className = 'connection-status disconnected';
            }
        }
        
        if (btnEl) {
            if (this.config.isConnected && this.config.apiKey) {
                btnEl.textContent = 'إعادة اختبار';
                btnEl.classList.add('connected');
            } else {
                btnEl.textContent = 'ربط API';
                btnEl.classList.remove('connected');
            }
        }
    },

    /**
     * Copy Webhook URL to Clipboard
     */
    copyWebhookUrl() {
        if (!this.config.webhookUrl) {
            if (typeof showToast === 'function') {
                showToast('⚠️ لا يوجد رابط Webhook', 'warning');
            }
            return;
        }

        const urlToCopy = this.config.webhookUrl;
        
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(urlToCopy)
                .then(() => {
                    if (typeof showToast === 'function') {
                        showToast('✅ تم نسخ رابط Webhook - الصقه في لوحة تحكم بوستا', 'success');
                    }
                })
                .catch(() => this.fallbackCopy(urlToCopy));
        } else {
            this.fallbackCopy(urlToCopy);
        }
    },

    fallbackCopy(text) {
        try {
            const input = document.createElement('input');
            input.value = text;
            input.style.cssText = 'position:fixed;opacity:0;';
            document.body.appendChild(input);
            input.select();
            document.execCommand('copy');
            document.body.removeChild(input);
            if (typeof showToast === 'function') {
                showToast('✅ تم نسخ رابط Webhook', 'success');
            }
        } catch (e) {
            console.error('[Bosta] Copy failed:', e);
        }
    },

    /**
     * Show Updates List in UI
     */
    showUpdatesList() {
        const container = document.getElementById('bostaUpdatesList');
        if (!container) return;

        if (!APP_STATE?.bostaUpdates?.length) {
            container.innerHTML = '<p class="empty-state">لا توجد تحديثات من بوستا</p>';
            return;
        }

        container.innerHTML = APP_STATE.bostaUpdates.slice(0, 15).map(update => `
            <div class="update-item ${update.read ? '' : 'unread'}" onclick="${typeof Notifications !== 'undefined' ? `Notifications.markAsRead('${update.id}')` : ''}">
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
     * Update Dashboard Statistics
     */
    updateDashboardStats() {
        const bostaCountEl = document.getElementById('bostaSyncCount');
        const todayBostaEl = document.getElementById('todayBostaUpdates');

        if (bostaCountEl && APP_STATE?.bostaUpdates) {
            bostaCountEl.textContent = APP_STATE.bostaUpdates.length;
        }

        if (todayBostaEl && APP_STATE) {
            todayBostaEl.textContent = APP_STATE.todayBostaCount || 0;
        }
    },

    /**
     * Get Connection Stats
     */
    getStats() {
        return {
            isConnected: this.config.isConnected,
            hasApiKey: !!this.config.apiKey,
            totalUpdates: APP_STATE?.bostaUpdates?.length || 0,
            todayUpdates: APP_STATE?.todayBostaCount || 0,
            lastSync: this.config.lastSync,
            webhookUrl: this.config.webhookUrl,
            firebaseConnected: !!this.firebaseRef
        };
    },

    /**
     * Reset All Configuration
     */
    resetConfig() {
        console.log('[Bosta] 🔄 Resetting configuration...');
        
        this.config.apiKey = null;
        this.config.isConnected = false;
        this.config.lastSync = null;
        
        this.saveConfig();
        this.updateConnectionStatus();

        // Clear input field
        const apiKeyInput = document.getElementById('bostaApiKey');
        if (apiKeyInput) apiKeyInput.value = '';

        if (typeof showToast === 'function') {
            showToast('🔄 تم إعادة تعيين إعدادات بوستا', 'info');
        }
    }
};

// Make globally available
window.BostaIntegration = BostaIntegration;

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => BostaIntegration.init());
} else {
    BostaIntegration.init();
}

console.log('[Bosta] ✅ Module loaded - Ready for Bosta API integration! v3.0');
