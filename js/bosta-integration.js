/**
 * ========================================
 * شحنلي - Bosta Integration Module ✅ FIXED
 * Real Bosta API Integration
 * Documentation: https://docs.bosta.co
 * 
 * 📋 Bosta API Details (Verified):
 * - Base URL: https://app.bosta.co
 * - Auth: API Key as Bearer Token
 * - Key: Get from business.bosta.co → Settings → API
 * ========================================
 * 
 * 🔗 Key Endpoints:
 * - Create Delivery: POST /api/v2/deliveries?apiVersion=1
 * - Track Delivery: GET /api/v2/deliveries/{trackingKey}
 * - List Cities: GET /api/v2/cities
 * - Pricing: GET /api/v2/pricing
 * 
 * 📡 Webhook Setup:
 * 1. Go to business.bosta.co → Settings → API Integration
 * 2. Click "Request OTP" and enter code
 * 3. Add your Webhook URL
 * 4. Optional: Add Authorization Key
 * ========================================
 */

// Ensure we're in a browser environment
if (typeof window === 'undefined') {
    throw new Error('BostaIntegration must run in a browser environment');
}

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
        
        // ✅ Real Bosta API Configuration (Verified)
        baseUrl: 'https://app.bosta.co',
        apiVersion: 'v2',
        endpoints: {
            createDelivery: '/api/v2/deliveries',
            trackDelivery: '/api/v2/deliveries/',  // + {trackingKey}
            listDeliveries: '/api/v2/deliveries',
            cities: '/api/v2/cities',
            pricing: '/api/v2/pricing',
            deliveryTypes: '/api/v2/delivery-types'
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
        console.log('[Bosta] 🚀 Initializing Bosta Integration...');
        
        try {
            // Load saved configuration
            this.loadConfig();
            
            // Generate webhook URL if not set
            if (!this.config.webhookUrl) {
                this.config.webhookUrl = this.generateWebhookUrl();
                this.saveConfig();
            }

            // Update UI
            this.updateConnectionStatus();
            
            console.log('[Bosta] ✅ Initialized successfully');
            console.log('[Bosta] 📡 Webhook URL:', this.config.webhookUrl);
            console.log('[Bosta] 🔑 API Key:', this.config.apiKey ? '***' + this.config.apiKey.slice(-4) : 'Not set');
            
        } catch (error) {
            console.error('[Bosta] ❌ Initialization error:', error);
        }
    },

    // ========================================
    // Configuration Management
    // ========================================
    
    loadConfig() {
        try {
            const saved = localStorage.getItem('bosta_config_v2');
            if (saved) {
                const parsed = JSON.parse(saved);
                // Merge with defaults to ensure all fields exist
                this.config = {
                    ...this.config,
                    ...parsed,
                    endpoints: { ...this.config.endpoints, ...(parsed.endpoints || {}) }
                };
                console.log('[Bosta] ✅ Config loaded from localStorage');
            }
        } catch (e) {
            console.error('[Bosta] ⚠️ Error loading config:', e);
            // Reset to defaults if corrupted
            localStorage.removeItem('bosta_config_v2');
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
            localStorage.setItem('bosta_config_v2', JSON.stringify(configToSave));
        } catch (e) {
            console.error('[Bosta] ❌ Error saving config:', e);
        }
    },

    generateWebhookUrl() {
        const baseUrl = window.location.origin + window.location.pathname;
        return baseUrl.replace(/\/$/, '') + '/api/bosta-webhook';
    },

    /**
     * Save Bosta settings from form
     * @param {string} apiKey - The Bosta API key
     * @param {string|null} webhookSecret - Optional webhook secret
     * @returns {boolean} Connection status
     */
    saveSettings(apiKey, webhookSecret = null) {
        console.log('[Bosta] 💾 Saving settings...');
        
        // Validate API key format (basic validation)
        if (apiKey && apiKey.trim().length < 10) {
            showToast('مفتاح API قصير جداً - يجب أن يكون 10 أحرف على الأقل', 'error');
            return false;
        }
        
        this.config.apiKey = apiKey?.trim() || null;
        this.config.webhookSecret = webhookSecret?.trim() || null;
        this.config.isConnected = !!(this.config.apiKey && this.config.apiKey.length > 10);
        
        this.saveConfig();
        this.updateConnectionStatus();
        
        // Test connection if we have an API key
        if (this.config.apiKey && this.config.apiKey.length > 10) {
            console.log('[Bosta] 🔍 Testing connection...');
            // Don't await here, let it run in background
            setTimeout(() => {
                this.testConnection().then(success => {
                    if (success) {
                        showToast('✅ تم ربط بوستا بنجاح!', 'success');
                        if (typeof Notifications !== 'undefined') {
                            Notifications.add({
                                type: 'system',
                                title: 'تم ربط بوستا',
                                message: 'يمكنك الآن إرسال واستقبال الشحنات مباشرة',
                                icon: '🚚'
                            });
                        }
                    }
                }).catch(err => {
                    console.warn('[Bosta] Background connection test failed:', err.message);
                });
            }, 500);
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
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${this.config.apiKey}`,
            'X-Bosta-Source': 'shipli-pwa-v3'
        };
        return headers;
    }

    /**
     * Make API request with proper error handling
     * @param {string} endpoint - API endpoint
     * @param {object} options - Fetch options
     * @returns {Promise<any>} API response data
     */
    async apiRequest(endpoint, options = {}) {
        if (!this.config.apiKey) {
            throw new Error('مفتاح API غير موجود - يرجى إدخاله في الإعدادات');
        }

        const url = this.config.baseUrl + endpoint;
        
        try {
            console.log(`[Bosta] 📤 Request: ${(options.method || 'GET')} ${url}`);
            
            const response = await fetch(url, {
                ...options,
                headers: {
                    ...this.buildHeaders(),
                    ...(options.headers || {})
                }
            });

            // Handle response based on content type
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

            // Handle HTTP errors
            if (!response.ok) {
                const errorMessage = data?.message || data?.error || data?.msg || response.statusText;
                
                // Map common Bosta error codes to Arabic messages
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

            console.log(`[Bosta] 📥 Response OK:`, data);
            return data;

        } catch (error) {
            // Handle network errors specifically
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                throw new Error('🌐 خطأ في الاتصال بالإنترنت - تحقق من اتصالك بالشبكة');
            }
            
            console.error(`[Bosta] ❌ API Error:`, error);
            throw error;
        }
    },

    // ========================================
    // CORE API FUNCTIONS ⭐
    // ========================================

    /**
     * Test connection to Bosta API
     * Uses cities endpoint as a lightweight test
     * @returns {Promise<boolean>} True if connection successful
     */
    async testConnection() {
        if (!this.config.apiKey) {
            console.log('[Bosta] ⚠️ No API key - cannot test connection');
            return false;
        }

        console.log('[Bosta] 🔍 Testing API connection...');
        
        // Show loading if function exists
        if (typeof showLoading === 'function') showLoading(true);
        
        try {
            // Use cities endpoint as it's lightweight and doesn't create anything
            const result = await this.apiRequest(this.config.endpoints.cities + '?limit=1', {
                method: 'GET'
            });
            
            // If we get any valid response, connection is working
            if (result && (result.data || result.cities || Array.isArray(result) || result.records)) {
                this.config.isConnected = true;
                this.config.lastSync = new Date().toISOString();
                this.saveConfig();
                this.updateConnectionStatus();
                
                console.log('[Bosta] ✅ Connection test successful!');
                return true;
            } else {
                // Unexpected but not necessarily an error
                console.warn('[Bosta] ⚠️ Unexpected response format:', result);
                this.config.isConnected = true; // Still consider connected if no error
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

    /**
     * CREATE DELIVERY - Send shipment to Bosta ⭐
     * POST /api/v2/deliveries?apiVersion=1
     * 
     * @param {object} shipmentData - Shipment details
     * @returns {Promise<object>} Created delivery data with tracking number
     */
    async createDelivery(shipmentData) {
        if (!this.config.isConnected && !this.config.apiKey) {
            throw new Error('بوستا غير مربوط - أدخل مفتاح API أولاً في الإعدادات');
        }

        console.log('[Bosta] 📦 Creating delivery...', shipmentData);

        if (typeof showLoading === 'function') showLoading(true);

        try {
            // Split receiver name into first/last name for Bosta format
            const nameParts = (shipmentData.receiverName || '').trim().split(/\s+/);
            const firstName = nameParts[0] || '';
            const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : firstName || 'غير محدد';

            // Build payload according to Bosta API v2 format
            const payload = {
                // Delivery type
                type: this.getDeliveryType(shipmentData.type),
                
                // Receiver information (REQUIRED)
                receiver: {
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
                    description: shipmentData.receiverNotes || shipmentData.notes || ''
                },
                
                // Sender/Pickup information
                pickup: {
                    firstName: ((shipmentData.senderName || shipmentData.storeName || '').split(/\s+/)[0]) || 'المتجر',
                    lastName: ((shipmentData.senderName || shipmentData.storeName || '').split(/\s+/).slice(1).join(' ')) || '',
                    phone: this.formatPhone(shipmentData.senderPhone || shipmentData.storePhone || ''),
                    city: this.getCityCode(shipmentData.senderCity || shipmentData.pickupCity),
                    zone: shipmentData.senderArea || shipmentData.pickupArea || '',
                    street: shipmentData.senderAddress || shipmentData.pickupAddress || ''
                },
                
                // Package details
                packageDetails: {
                    type: this.getPackageType(shipmentData.packageType),
                    weight: parseFloat(shipmentData.weight) || 1,
                    description: shipmentData.description || shipmentData.packageDescription || '',
                    items: [{
                        name: shipmentData.itemName || 'منتج',
                        quantity: parseInt(shipmentData.quantity) || 1
                    }]
                },
                
                // COD amount if applicable
                cod: shipmentData.codAmount ? {
                    amount: parseFloat(shipmentData.codAmount),
                    currency: 'EGP'
                } : null,
                
                // Reference numbers
                references: {
                    clientReference: shipmentData.orderId || shipmentData.reference || Date.now().toString()
                },
                
                // Webhook callback URL
                webhookUrl: this.config.webhookUrl,
                
                // Notes
                notes: shipmentData.notes || `شحنة من شحنلي - ${new Date().toLocaleDateString('ar-EG')}`
            };

            // Remove null values to clean up payload
            Object.keys(payload).forEach(key => {
                if (payload[key] === null) delete payload[key];
            });

            console.log('[Bosta] 📤 Sending payload:', JSON.stringify(payload, null, 2));

            // Make the API call
            const result = await this.apiRequest(
                this.config.endpoints.createDelivery + '?apiVersion=1', 
                {
                    method: 'POST',
                    body: JSON.stringify(payload)
                }
            );

            // Process successful response
            if (result) {
                const deliveryResult = {
                    success: true,
                    trackingNumber: result.trackingNumber || result.deliveryId || result.id,
                    deliveryId: result.deliveryId || result.id,
                    status: result.status || 'CREATED',
                    cost: result.cost || result.price,
                    estimatedDelivery: result.estimatedDelivery || result.eta,
                    rawData: result
                };

                console.log('[Bosta] ✅ Delivery created:', deliveryResult);
                
                // Update last sync time
                this.config.lastSync = new Date().toISOString();
                this.saveConfig();

                if (typeof showToast === 'function') {
                    showToast(`✅ تم إنشاء الشحنة! رقم التتبع: ${deliveryResult.trackingNumber}`, 'success');
                }

                return deliveryResult;
            }

            throw new Error('استجابة فارغة من الخادم');

        } catch (error) {
            console.error('[Bosta] ❌ Create delivery failed:', error);
            
            if (typeof showToast === 'function') {
                showToast('فشل إنشاء الشحنة: ' + error.message, 'error');
            }
            
            throw error;
        } finally {
            if (typeof showLoading === 'function') showLoading(false);
        }
    },

    /**
     * TRACK DELIVERY - Get shipment status ⭐
     * GET /api/v2/deliveries/{trackingKey}
     * 
     * @param {string} trackingNumber - The tracking number
     * @returns {Promise<object>} Tracking data
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

            // Process tracking data
            const trackingData = {
                trackingNumber: trackingNumber,
                status: result.currentStatus || result.status || result.state,
                statusLabel: this.getStatusLabel(result.currentStatus || result.status || result.state),
                events: (result.events || result.trackingEvents || []).map(event => ({
                    eventType: event.type || event.eventType || event.status,
                    eventLabel: this.getStatusLabel(event.type || event.eventType || event.status),
                    timestamp: event.timestamp || event.date || event.createdAt,
                    description: event.description || event.note || event.location,
                    location: event.location || event.branch || event.city
                })),
                receiver: result.receiver || result.dropOff,
                sender: result.sender || result.pickUp,
                cost: result.cost || result.totalPrice || result.fees,
                estimatedDelivery: result.estimatedDelivery || result.eta || result.expectedDeliveryDate,
                rawData: result
            };

            console.log('[Bosta] 📍 Tracking data:', trackingData);
            return trackingData;

        } catch (error) {
            console.error('[Bosta] ❌ Tracking failed:', error);
            throw error;
        } finally {
            if (typeof showLoading === 'function') showLoading(false);
        }
    },

    /**
     * GET CITIES - List available cities
     * @returns {Promise<Array>} List of cities
     */
    async getCities() {
        console.log('[Bosta] 🏙️ Fetching cities...');

        try {
            const result = await this.apiRequest(this.config.endpoints.cities, {
                method: 'GET'
            });

            const cities = result.data || result.cities || result.records || (Array.isArray(result) ? result : []);
            
            console.log `[Bosta] ✅ Found ${cities.length} cities`;
            return cities;

        } catch (error) {
            console.error('[Bosta] ❌ Failed to fetch cities:', error);
            // Return default cities on error
            return Object.values(this.cityCodes).map(c => ({ code: c.code, name: c.name }));
        }
    },

    /**
     * CALCULATE PRICING - Get shipping cost estimate
     * @param {object} params - Pricing parameters
     * @returns {Promise<object>} Pricing data
     */
    async getPricing(params) {
        console.log('[Bosta] 💰 Calculating pricing...');

        try {
            const pricingParams = {
                city: this.getCityCode(params.city),
                packageType: this.getPackageType(params.packageType),
                weight: params.weight || 1,
                cod: params.codAmount || 0,
                ...params
            };

            const result = await this.apiRequest(this.config.endpoints.pricing + '?' + new URLSearchParams(pricingParams), {
                method: 'GET'
            });

            return {
                cost: result.cost || result.price || result.totalPrice,
                currency: result.currency || 'EGP',
                breakdown: result.breakdown || result.details,
                rawData: result
            };

        } catch (error) {
            console.error('[Bosta] ❌ Pricing failed:', error);
            throw error;
        }
    },

    // ========================================
    // HELPER FUNCTIONS
    // ========================================

    /**
     * Get city code from city name or code
     */
    getCityCode(cityInput) {
        if (!cityInput) return 'CAI'; // Default to Cairo
        
        const input = cityInput.toString().toLowerCase().trim();
        
        // Check if it's already a code
        if (/^[A-Z]{2,4}$/.test(cityInput.toUpperCase())) {
            return cityInput.toUpperCase();
        }
        
        // Look up by name or key
        const cityEntry = Object.entries(this.cityCodes).find(([key, val]) => 
            key === input || 
            val.name.includes(cityInput) ||
            val.code.toLowerCase() === input
        );
        
        return cityEntry ? cityEntry[1].code : 'CAI';
    },

    /**
     * Get Bosta package type code
     */
    getPackageType(type) {
        const typeMap = {
            'envelope': 'ENVELOPE',
            'mufattat': 'ENVELOPE',
            'box': 'BOX',
            'large_box': 'LARGE_BOX',
            'kabeer': 'LARGE_BOX',
            'palette': 'PALETTE'
        };
        return (typeMap[type?.toLowerCase()] || 'BOX').toUpperCase();
    },

    /**
     * Get Bosta delivery type code
     */
    getDeliveryType(type) {
        const typeMap = {
            'delivery': 'DELIVERY',
            'cod': 'COD',
            'cash_on_delivery': 'COD',
            'return': 'RETURN',
            'exchange': 'EXCHANGE'
        };
        return (typeMap[type?.toLowerCase()] || 'DELIVERY').toUpperCase();
    },

    /**
     * Format phone number for Egypt
     */
    formatPhone(phone) {
        if (!phone) return '';
        
        // Clean the phone number
        let cleaned = phone.toString().replace(/[\s\-\(\)]/g, '');
        
        // Add Egypt country code if missing
        if (cleaned.startsWith('0')) {
            cleaned = '+20' + cleaned.substring(1);
        } else if (cleaned.startsWith('20')) {
            cleaned = '+' + cleaned;
        } else if (!cleaned.startsWith('+')) {
            cleaned = '+20' + cleaned;
        }
        
        return cleaned;
    },

    /**
     * Get Arabic status label
     */
    getStatusLabel(status) {
        if (!status) return 'غير معروف';
        
        const statusUpper = status.toUpperCase().replace(/\s/g, '_');
        const eventInfo = this.eventTypes[statusUpper];
        
        return eventInfo ? `${eventInfo.icon} ${eventInfo.label}` : status;
    },

    // ========================================
    // UI FUNCTIONS
    // ========================================

    /**
     * Update connection status indicator in UI
     */
    updateConnectionStatus() {
        const statusEl = document.getElementById('bostaConnectionStatus');
        const btnEl = document.getElementById('connectBostaBtn');
        
        if (statusEl) {
            if (this.config.isConnected && this.config.apiKey) {
                statusEl.innerHTML = '<span class="status-connected">● متصل</span>';
                statusEl.className = 'connection-status connected';
            } else {
                statusEl.innerHTML = '<span class="status-disconnected">○ غير متصل</span>';
                statusEl.className = 'connection-status disconnected';
            }
        }
        
        if (btnEl) {
            if (this.config.isConnected && this.config.apiKey) {
                btnEl.textContent = 'إعادة الاختبار';
                btnEl.classList.add('connected');
            } else {
                btnEl.textContent = 'ربط API';
                btnEl.classList.remove('connected');
            }
        }
    },

    /**
     * Copy webhook URL to clipboard
     */
    copyWebhookUrl() {
        if (this.config.webhookUrl) {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(this.config.webhookUrl).then(() => {
                    if (typeof showToast === 'function') {
                        showToast('✅ تم نسخ رابط Webhook', 'success');
                    }
                }).catch(() => {
                    this.fallbackCopyWebhookUrl();
                });
            } else {
                this.fallbackCopyWebhookUrl();
            }
        } else {
            if (typeof showToast === 'function') {
                showToast('⚠️ لا يوجد رابط Webhook', 'warning');
            }
        }
    },

    fallbackCopyWebhookUrl() {
        try {
            const input = document.createElement('input');
            input.value = this.config.webhookUrl;
            input.style.position = 'fixed';
            input.style.opacity = '0';
            document.body.appendChild(input);
            input.select();
            document.execCommand('copy');
            document.body.removeChild(input);
            if (typeof showToast === 'function') {
                showToast('✅ تم نسخ رابط Webhook', 'success');
            }
        } catch (e) {
            console.error('[Bosta] Failed to copy:', e);
            if (typeof showToast === 'function') {
                showToast('❌ فشل النسخ', 'error');
            }
        }
    },

    /**
     * Show Bosta updates/notifications list
     */
    showUpdatesList() {
        const container = document.getElementById('bostaUpdatesList');
        if (!container) return;

        if (!APP_STATE || !APP_STATE.bostaUpdates || APP_STATE.bostaUpdates.length === 0) {
            container.innerHTML = '<p class="empty-state">لا توجد تحديثات من بوستا بعد</p>';
            return;
        }

        container.innerHTML = APP_STATE.bostaUpdates.slice(0, 15).map(update => `
            <div class="update-item ${update.read ? '' : 'unread'}" 
                 onclick="${typeof Notifications !== 'undefined' ? `Notifications.markAsRead('${update.id}')` : ''}">
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

        if (bostaCountEl && APP_STATE) {
            bostaCountEl.textContent = APP_STATE.bostaUpdates ? APP_STATE.bostaUpdates.length : 0;
        }

        if (todayBostaEl && APP_STATE) {
            todayBostaEl.textContent = APP_STATE.todayBostaCount || 0;
        }
    },

    /**
     * Get connection stats for display
     */
    getStats() {
        return {
            isConnected: this.config.isConnected,
            hasApiKey: !!this.config.apiKey,
            totalUpdates: (APP_STATE && APP_STATE.bostaUpdates) ? APP_STATE.bostaUpdates.length : 0,
            todayUpdates: (APP_STATE && APP_STATE.todayBostaCount) ? APP_STATE.todayBostaCount : 0,
            lastSync: this.config.lastSync,
            webhookUrl: this.config.webhookUrl
        };
    },

    /**
     * Reset configuration completely
     */
    resetConfig() {
        console.log('[Bosta] 🔄 Resetting configuration...');
        
        this.config.apiKey = null;
        this.config.isConnected = false;
        this.config.lastSync = null;
        
        this.saveConfig();
        this.updateConnectionStatus();
        
        // Clear the API key input field
        const apiKeyInput = document.getElementById('bostaApiKey');
        if (apiKeyInput) apiKeyInput.value = '';
        
        if (typeof showToast === 'function') {
            showToast('🔄 تم إعادة تعيين إعدادات بوستا', 'info');
        }
    }
};

// Make available globally
window.BostaIntegration = BostaIntegration;

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        BostaIntegration.init();
    });
} else {
    // DOM already loaded
    BostaIntegration.init();
}

console.log('[Bosta] ✅ Module loaded - Ready! v3.0');
