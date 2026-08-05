/**
 * ========================================
 * شحنلي - Bosta Integration Module ✅ (via Worker)
 * كل نداءات بوستا بتعدي على الـ Cloudflare Worker
 * مفيش أي مفتاح API مخزّن أو ماشي في المتصفح
 *
 * الووركر بيتوقع Endpoints زي:
 * - POST   /api/bosta/create-shipment
 * - GET    /api/bosta/track/:trackingNumber
 * - GET    /api/bosta/delivery/:deliveryId
 * - PUT    /api/bosta/delivery/:deliveryId
 * - DELETE /api/bosta/delivery/:deliveryId
 * - GET    /api/bosta/deliveries
 * - GET    /api/bosta/customers
 * - GET    /api/bosta/cities
 * - GET    /api/bosta/zones/:cityId
 * - GET/POST /api/bosta/pickup-locations
 * - POST   /api/bosta/pricing
 * - GET    /api/bosta/account
 * - POST   /api/bosta/webhook   (بوستا نفسها بتنادي عليه)
 * ========================================
 */

if (typeof window === 'undefined') {
    throw new Error('[Bosta] Error: Must run in browser environment');
}

const BostaIntegration = {
    // ========================================
    // Configuration ⭐
    // ========================================
    config: {
        workerUrl: null,      // رابط الـ Cloudflare Worker، مثال: https://orders-api.username.workers.dev
        webhookUrl: null,     // رابط الـ Webhook اللي بيتحط في لوحة بوستا
        isConnected: false,
        lastSync: null,

        endpoints: {
            createShipment: '/api/bosta/create-shipment',
            track: '/api/bosta/track',
            delivery: '/api/bosta/delivery',
            deliveries: '/api/bosta/deliveries',
            customers: '/api/bosta/customers',
            cities: '/api/bosta/cities',
            zones: '/api/bosta/zones',
            pickupLocations: '/api/bosta/pickup-locations',
            pricing: '/api/bosta/pricing',
            account: '/api/bosta/account',
            webhook: '/api/bosta/webhook',
            health: '/api/health'
        }
    },

    firebaseRef: null,

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

    packageTypes: {
        'envelope': 'ENVELOPE',
        'box': 'BOX',
        'large_box': 'LARGE_BOX',
        'palette': 'PALETTE'
    },

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

    async init() {
        console.log('[Bosta] 🚀 Initializing Bosta Integration (Worker mode)...');

        try {
            this.loadConfig();

            if (typeof firebase !== 'undefined' && firebase.database) {
                this.initFirebaseConnection();
            } else {
                setTimeout(() => this.initFirebaseConnection(), 2000);
            }

            if (this.config.workerUrl && !this.config.webhookUrl) {
                this.config.webhookUrl = this.generateWebhookUrl();
                this.saveConfig();
            }

            this.updateConnectionStatus();

            console.log('[Bosta] ✅ Initialized');
            console.log('[Bosta] 🌐 Worker URL:', this.config.workerUrl || 'غير مضبوط');
        } catch (error) {
            console.error('[Bosta] ❌ Initialization error:', error);
        }
    },

    initFirebaseConnection() {
        try {
            if (typeof firebase === 'undefined' || !firebase.database) return;

            const database = firebase.database();
            this.firebaseRef = {
                deliveries: database.ref('deliveries'),
                bostaEvents: database.ref('bosta_events'),
                settings: database.ref('settings/bosta'),
                syncLog: database.ref('sync_log')
            };

            this.setupFirebaseListeners();
            console.log('[Bosta] 🔥 Firebase connection established');
        } catch (error) {
            console.error('[Bosta] ❌ Firebase init error:', error);
        }
    },

    setupFirebaseListeners() {
        if (!this.firebaseRef) return;

        this.firebaseRef.deliveries.on('child_changed', (snapshot) => {
            const delivery = snapshot.val();
            console.log(`[Bosta] 🔄 Delivery updated: ${delivery.trackingNumber} - ${delivery.status}`);

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

                if (APP_STATE.bostaUpdates.length > 50) {
                    APP_STATE.bostaUpdates = APP_STATE.bostaUpdates.slice(0, 50);
                }
            }

            if (typeof showToast === 'function') {
                showToast(`${this.getStatusLabel(delivery.status)} - ${delivery.trackingNumber}`, 'info');
            }
        });

        this.firebaseRef.bostaEvents.limitToLast(1).on('child_added', (snapshot) => {
            const event = snapshot.val();
            console.log('[Bosta] 📨 New webhook event:', event.type);
            this.handleWebhookEvent(event);
        });
    },

    // ========================================
    // Configuration Management
    // ========================================

    loadConfig() {
        try {
            const saved = localStorage.getItem('bosta_config_v4');
            if (saved) {
                const parsed = JSON.parse(saved);
                this.config = {
                    ...this.config,
                    workerUrl: (parsed.workerUrl || '').replace(/\/$/, '') || null,
                    webhookUrl: parsed.webhookUrl || null,
                    isConnected: !!parsed.isConnected,
                    lastSync: parsed.lastSync || null
                };
                console.log('[Bosta] ✅ Config loaded from localStorage');
            } else {
                // ترحيل تلقائي من إعدادات النسخة القديمة (لو موجودة) بدون نقل أي مفتاح API
                const legacy = localStorage.getItem('bosta_config_v3');
                if (legacy) localStorage.removeItem('bosta_config_v3');
            }
        } catch (e) {
            console.error('[Bosta] ⚠️ Error loading config:', e);
            localStorage.removeItem('bosta_config_v4');
        }
    },

    saveConfig() {
        try {
            const configToSave = {
                workerUrl: this.config.workerUrl,
                webhookUrl: this.config.webhookUrl,
                isConnected: this.config.isConnected,
                lastSync: this.config.lastSync
            };
            localStorage.setItem('bosta_config_v4', JSON.stringify(configToSave));

            if (this.firebaseRef && this.firebaseRef.settings) {
                this.firebaseRef.settings.set(configToSave);
            }
        } catch (e) {
            console.error('[Bosta] ❌ Error saving config:', e);
        }
    },

    generateWebhookUrl() {
        if (!this.config.workerUrl) return null;
        return `${this.config.workerUrl}${this.config.endpoints.webhook}`;
    },

    /**
     * حفظ رابط الووركر واختبار الاتصال
     * @param {string} workerUrl - رابط الـ Cloudflare Worker (بدون / في الآخر)
     */
    async saveSettings(workerUrl) {
        console.log('[Bosta] 💾 Saving settings...');

        const cleaned = (workerUrl || '').trim().replace(/\/$/, '');

        if (!cleaned || !/^https?:\/\//i.test(cleaned)) {
            if (typeof showToast === 'function') {
                showToast('❌ رابط الووركر غير صحيح - لازم يبدأ بـ https://', 'error');
            }
            return false;
        }

        this.config.workerUrl = cleaned;
        this.config.webhookUrl = this.generateWebhookUrl();
        this.saveConfig();
        this.updateConnectionStatus();

        console.log('[Bosta] 🔍 Testing worker connection...');
        try {
            const success = await this.testConnection();

            if (success) {
                if (typeof showToast === 'function') {
                    showToast('✅ تم ربط بوستا عن طريق الووركر بنجاح', 'success');
                }
                if (typeof Notifications !== 'undefined') {
                    Notifications.add({
                        type: 'system',
                        title: 'تم ربط بوستا',
                        message: 'يمكنك الآن إرسال واستقبال الشحنات عبر الووركر',
                        icon: '🚚'
                    });
                }
                return true;
            }
            return false;
        } catch (error) {
            console.error('[Bosta] Connection test error:', error);
            return false;
        }
    },

    // ========================================
    // CORE API FUNCTIONS ⭐ (كلها بتعدي على الووركر)
    // ========================================

    async apiRequest(endpoint, options = {}) {
        if (!this.config.workerUrl) {
            throw new Error('رابط الووركر غير موجود - أدخله في الإعدادات أولاً');
        }

        const url = this.config.workerUrl + endpoint;
        console.log(`[Bosta] 📤 ${options.method || 'GET'} ${url}`);

        try {
            const response = await fetch(url, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    ...(options.headers || {})
                }
            });

            let data;
            const contentType = response.headers.get('content-type') || '';
            if (contentType.includes('application/json')) {
                data = await response.json();
            } else {
                const textData = await response.text();
                try { data = JSON.parse(textData); } catch { data = { raw: textData }; }
            }

            if (!response.ok || data?.success === false) {
                const errorMessage = data?.error || data?.message || response.statusText;

                let userMessage;
                switch (response.status) {
                    case 401:
                    case 403:
                        userMessage = '❌ مفتاح API بوستا غير صالح على الووركر';
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
                        userMessage = '⚠️ مشكلة في الووركر أو خوادم بوستا - حاول لاحقاً';
                        break;
                    default:
                        userMessage = `❌ خطأ (${response.status}): ${errorMessage}`;
                }

                throw new Error(userMessage);
            }

            console.log('[Bosta] 📥 Response OK');
            return data;
        } catch (error) {
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                throw new Error('🌐 تعذر الوصول للووركر - تحقق من الرابط واتصالك بالإنترنت');
            }
            console.error('[Bosta] ❌ API Error:', error.message);
            throw error;
        }
    },

    /**
     * اختبار الاتصال بالووركر وبوستا سوا
     */
    async testConnection() {
        if (!this.config.workerUrl) {
            console.log('[Bosta] ⚠️ No worker URL configured');
            return false;
        }

        if (typeof showLoading === 'function') showLoading(true);

        try {
            const result = await this.apiRequest(this.config.endpoints.cities + '?limit=1', { method: 'GET' });

            this.config.isConnected = true;
            this.config.lastSync = new Date().toISOString();
            this.saveConfig();
            this.updateConnectionStatus();

            console.log('[Bosta] ✅ Connection test successful!', result);
            return true;
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
     * إنشاء شحنة جديدة عبر الووركر
     * @param {object} shipmentData
     */
    async createDelivery(shipmentData) {
        if (!this.config.workerUrl) {
            throw new Error('بوستا غير مربوط - أدخل رابط الووركر في الإعدادات أولاً');
        }

        console.log('[Bosta] 📦 Creating new delivery...', shipmentData);

        if (typeof showLoading === 'function') showLoading(true);

        try {
            const nameParts = (shipmentData.receiverName || '').trim().split(/\s+/);
            const firstName = nameParts[0] || 'غير محدد';
            const lastName = nameParts.slice(1).join(' ') || '';

            // الجسم اللي بيستناه الووركر في /api/bosta/create-shipment
            const payload = {
                type: this.getDeliveryType(shipmentData.type),
                orderId: shipmentData.orderId || shipmentData.reference,
                businessReference: shipmentData.orderId || shipmentData.reference || Date.now().toString(),
                notes: shipmentData.notes || `شحنة من شحنلي - ${new Date().toLocaleDateString('ar-EG')}`,
                cod: shipmentData.codAmount ? parseFloat(shipmentData.codAmount) : 0,
                packageType: this.getPackageType(shipmentData.packageType),
                size: shipmentData.size || 'SMALL',
                weight: parseFloat(shipmentData.weight) || 1,
                itemsCount: parseInt(shipmentData.quantity) || 1,
                description: shipmentData.description || shipmentData.packageDescription || '',
                dropOffAddress: {
                    city: this.getCityCode(shipmentData.receiverCity || shipmentData.city),
                    zone: shipmentData.receiverArea || shipmentData.area || '',
                    street: shipmentData.receiverAddress || shipmentData.address || '',
                    buildingNo: String(shipmentData.receiverBuilding || shipmentData.buildingNo || ''),
                    floor: String(shipmentData.receiverFloor || shipmentData.floor || ''),
                    apartment: String(shipmentData.receiverApartment || shipmentData.apartment || ''),
                    description: shipmentData.receiverNotes || ''
                },
                customer: {
                    firstName,
                    lastName,
                    phone: this.formatPhone(shipmentData.receiverPhone),
                    secondPhone: this.formatPhone(shipmentData.receiverPhone2) || '',
                    email: shipmentData.receiverEmail || ''
                }
            };

            if (shipmentData.senderAddress || shipmentData.pickupAddress || shipmentData.senderCity || shipmentData.pickupCity) {
                payload.pickupAddress = {
                    firstName: ((shipmentData.senderName || shipmentData.storeName || '').split(/\s+/)[0]) || 'المتجر',
                    lastName: ((shipmentData.senderName || shipmentData.storeName || '').split(/\s+/).slice(1).join(' ')) || '',
                    phone: this.formatPhone(shipmentData.senderPhone || shipmentData.storePhone || ''),
                    city: this.getCityCode(shipmentData.senderCity || shipmentData.pickupCity),
                    zone: shipmentData.senderArea || shipmentData.pickupArea || '',
                    street: shipmentData.senderAddress || shipmentData.pickupAddress || ''
                };
            }

            console.log('[Bosta] 📤 Sending delivery payload:', JSON.stringify(payload, null, 2));

            const result = await this.apiRequest(this.config.endpoints.createShipment, {
                method: 'POST',
                body: JSON.stringify(payload)
            });

            const delivery = result?.delivery || result;

            const deliveryResult = {
                success: true,
                deliveryId: delivery?._id || delivery?.deliveryId || delivery?.id,
                trackingNumber: delivery?.trackingNumber || delivery?.tracking_key,
                status: delivery?.status || delivery?.state || 'CREATED',
                cost: delivery?.cost || delivery?.price || delivery?.totalPrice,
                estimatedDelivery: delivery?.estimatedDelivery || delivery?.eta,
                raw: delivery
            };

            if (this.firebaseRef && deliveryResult.trackingNumber) {
                this.firebaseRef.deliveries.child(deliveryResult.deliveryId || deliveryResult.trackingNumber).set({
                    ...deliveryResult,
                    createdAt: new Date().toISOString()
                });
            }

            this.config.lastSync = new Date().toISOString();
            this.saveConfig();

            if (typeof showToast === 'function') {
                showToast(`✅ تم إنشاء الشحنة - رقم التتبع: ${deliveryResult.trackingNumber}`, 'success');
            }

            return deliveryResult;
        } catch (error) {
            console.error('[Bosta] ❌ Create delivery error:', error.message);
            if (typeof showToast === 'function') {
                showToast('فشل إنشاء الشحنة: ' + error.message, 'error');
            }
            throw error;
        } finally {
            if (typeof showLoading === 'function') showLoading(false);
        }
    },

    /**
     * تتبع شحنة برقم التتبع
     */
    async trackDelivery(trackingNumber) {
        if (!trackingNumber) throw new Error('رقم التتبع مطلوب');
        const result = await this.apiRequest(`${this.config.endpoints.track}/${encodeURIComponent(trackingNumber)}`, { method: 'GET' });
        return result?.tracking || result;
    },

    /**
     * جلب بيانات شحنة بالـ deliveryId
     */
    async getDelivery(deliveryId) {
        if (!deliveryId) throw new Error('deliveryId مطلوب');
        const result = await this.apiRequest(`${this.config.endpoints.delivery}/${encodeURIComponent(deliveryId)}`, { method: 'GET' });
        return result?.delivery || result;
    },

    /**
     * إلغاء شحنة
     */
    async terminateDelivery(deliveryId) {
        if (!deliveryId) throw new Error('deliveryId مطلوب');
        return this.apiRequest(`${this.config.endpoints.delivery}/${encodeURIComponent(deliveryId)}`, { method: 'DELETE' });
    },

    /**
     * تعديل شحنة
     */
    async updateDelivery(deliveryId, updatePayload) {
        if (!deliveryId) throw new Error('deliveryId مطلوب');
        return this.apiRequest(`${this.config.endpoints.delivery}/${encodeURIComponent(deliveryId)}`, {
            method: 'PUT',
            body: JSON.stringify(updatePayload)
        });
    },

    /**
     * كل الشحنات
     */
    async listDeliveries({ limit = 50, page = 0, status } = {}) {
        const query = new URLSearchParams({ limit, page });
        if (status) query.set('status', status);
        const result = await this.apiRequest(`${this.config.endpoints.deliveries}?${query.toString()}`, { method: 'GET' });
        return result?.deliveries || [];
    },

    /**
     * المحافظات
     */
    async getCities() {
        const result = await this.apiRequest(this.config.endpoints.cities, { method: 'GET' });
        return result?.cities || [];
    },

    /**
     * مناطق محافظة معينة
     */
    async getZones(cityId) {
        if (!cityId) throw new Error('cityId مطلوب');
        const result = await this.apiRequest(`${this.config.endpoints.zones}/${encodeURIComponent(cityId)}`, { method: 'GET' });
        return result?.zones || [];
    },

    // ========================================
    // Helpers
    // ========================================

    getCityCode(city) {
        if (!city) return '';
        return city;
    },

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

    formatPhone(phone) {
        if (!phone) return '';
        let cleaned = phone.toString().replace(/[\s\-\(\)]/g, '');
        if (cleaned.startsWith('0')) {
            cleaned = '+20' + cleaned.substring(1);
        } else if (cleaned.startsWith('20') && !cleaned.startsWith('+')) {
            cleaned = '+' + cleaned;
        } else if (!cleaned.startsWith('+')) {
            cleaned = '+20' + cleaned;
        }
        return cleaned;
    },

    getStatusLabel(status) {
        if (!status) return 'غير معروف';
        const statusUpper = status.toUpperCase().replace(/\s/g, '_').replace(/-/g, '_');
        const eventInfo = this.eventTypes[statusUpper];
        return eventInfo ? `${eventInfo.icon} ${eventInfo.label}` : status;
    },

    // ========================================
    // Webhook events (اللي جاية من Firebase بعد ما الووركر يستقبلها من بوستا)
    // ========================================

    handleWebhookEvent(eventData) {
        if (!eventData) return;
        console.log('[Bosta] 📨 Processing webhook event:', eventData);

        if (typeof APP_STATE !== 'undefined') {
            APP_STATE.bostaUpdates = APP_STATE.bostaUpdates || [];
            APP_STATE.bostaUpdates.unshift({
                id: 'evt_' + Date.now(),
                eventType: eventData.state || eventData.status || 'UPDATED',
                title: `تحديث الشحنة ${eventData.trackingNumber || ''}`,
                message: this.getStatusLabel(eventData.state || eventData.status),
                time: new Date().toLocaleString('ar-EG'),
                read: false
            });
        }

        this.showUpdatesList();
        this.updateDashboardStats();
    },

    /**
     * دوال متوافقة مع WebhookHandler (توقيع Webhook بوستا)
     * بوستا مبتبعتش أي secret/hmac مع الـ webhook، فالتحقق هنا شكلي فقط
     * والتأكيد الحقيقي بيحصل في الووركر نفسه
     */
    verifyWebhookSignature(payload) {
        return !!(payload && (payload.trackingNumber || payload.tracking_number));
    },

    processWebhook(payload) {
        this.handleWebhookEvent(payload);
        return { success: true };
    },

    // ========================================
    // UI FUNCTIONS
    // ========================================

    updateConnectionStatus() {
        const statusEl = document.getElementById('bostaConnectionStatus');
        const btnEl = document.getElementById('connectBostaBtn');

        if (statusEl) {
            if (this.config.isConnected && this.config.workerUrl) {
                statusEl.innerHTML = '<span class="status-connected">● متصل ببوستا</span>';
                statusEl.className = 'connection-status connected';
            } else {
                statusEl.innerHTML = '<span class="status-disconnected">○ غير متصل</span>';
                statusEl.className = 'connection-status disconnected';
            }
        }

        if (btnEl) {
            if (this.config.isConnected && this.config.workerUrl) {
                btnEl.textContent = 'إعادة اختبار';
                btnEl.classList.add('connected');
            } else {
                btnEl.textContent = 'ربط API';
                btnEl.classList.remove('connected');
            }
        }

        const webhookInput = document.getElementById('bostaWebhookUrl');
        if (webhookInput) {
            webhookInput.value = this.config.webhookUrl || '';
        }
    },

    copyWebhookUrl() {
        if (!this.config.webhookUrl) {
            if (typeof showToast === 'function') {
                showToast('⚠️ لا يوجد رابط Webhook - اربط الووركر الأول', 'warning');
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

    getStats() {
        return {
            isConnected: this.config.isConnected,
            hasWorkerUrl: !!this.config.workerUrl,
            totalUpdates: APP_STATE?.bostaUpdates?.length || 0,
            todayUpdates: APP_STATE?.todayBostaCount || 0,
            lastSync: this.config.lastSync,
            webhookUrl: this.config.webhookUrl,
            firebaseConnected: !!this.firebaseRef
        };
    },

    resetConfig() {
        console.log('[Bosta] 🔄 Resetting configuration...');

        this.config.workerUrl = null;
        this.config.webhookUrl = null;
        this.config.isConnected = false;
        this.config.lastSync = null;

        this.saveConfig();
        this.updateConnectionStatus();

        const workerInput = document.getElementById('bostaApiKey');
        if (workerInput) workerInput.value = '';

        if (typeof showToast === 'function') {
            showToast('🔄 تم إعادة تعيين إعدادات بوستا', 'info');
        }
    }
};

window.BostaIntegration = BostaIntegration;

// ========================================
// Global wrapper functions (مربوطة بالأزرار في index.html)
// ========================================

async function saveBostaSettings() {
    const input = document.getElementById('bostaApiKey');
    const workerUrl = input ? input.value.trim() : '';
    await BostaIntegration.saveSettings(workerUrl);
}

async function testBostaConnection() {
    await BostaIntegration.testConnection();
}

async function trackWithBosta() {
    const input = document.getElementById('trackingSearchInput');
    const trackingNumber = input ? input.value.trim() : '';
    if (!trackingNumber) {
        if (typeof showToast === 'function') showToast('أدخل رقم التتبع أولاً', 'warning');
        return;
    }

    try {
        const tracking = await BostaIntegration.trackDelivery(trackingNumber);
        const numberEl = document.getElementById('trackedShipmentNumber');
        const statusEl = document.getElementById('trackedStatus');
        const badgeEl = document.getElementById('bostaTrackingBadge');
        const resultEl = document.getElementById('trackingResult');
        const emptyEl = document.getElementById('trackingEmpty');

        if (numberEl) numberEl.textContent = trackingNumber;
        if (statusEl) statusEl.textContent = BostaIntegration.getStatusLabel(tracking?.state || tracking?.status);
        if (badgeEl) badgeEl.classList.remove('hidden');
        if (resultEl) resultEl.classList.remove('hidden');
        if (emptyEl) emptyEl.classList.add('hidden');
    } catch (error) {
        if (typeof showToast === 'function') showToast(error.message, 'error');
    }
}

async function refreshBostaTracking() {
    const numberEl = document.getElementById('trackedShipmentNumber');
    const trackingNumber = numberEl ? numberEl.textContent.trim() : '';
    if (!trackingNumber) return;

    const input = document.getElementById('trackingSearchInput');
    if (input) input.value = trackingNumber;
    await trackWithBosta();
}

async function testBostaWebhook() {
    if (!BostaIntegration.config.workerUrl) {
        if (typeof showToast === 'function') showToast('⚠️ اربط الووركر الأول من الإعدادات', 'warning');
        return;
    }
    const ok = await BostaIntegration.testConnection();
    if (ok && typeof showToast === 'function') {
        showToast('✅ الووركر والاتصال ببوستا شغالين', 'success');
    }
}

function simulateBostaNotification() {
    const select = document.getElementById('simulateBostaEvent');
    const eventType = select ? select.value : 'DELIVERED';

    BostaIntegration.handleWebhookEvent({
        trackingNumber: 'TEST-' + Date.now(),
        state: eventType
    });

    if (typeof showToast === 'function') {
        showToast('🎭 تم عمل محاكاة لإشعار: ' + BostaIntegration.getStatusLabel(eventType), 'info');
    }
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => BostaIntegration.init());
} else {
    BostaIntegration.init();
}

console.log('[Bosta] ✅ Module loaded - Worker mode v4.0');