/**
 * ========================================
 * شحنلي - Notifications Module
 * Unified notification center
 * ========================================
 */

const Notifications = {
    // Storage key
    storageKey: 'shipli_notifications',
    
    // All notifications
    items: [],
    
    // Settings
    settings: {
        enableBrowser: true,
        enableSound: true,
        enableStock: true,
        enableBosta: true,
        enableBackorders: true,
        minStockThreshold: 5,
        maxNotifications: 200
    },

    // Initialize
    init() {
        this.load();
        this.loadSettings();
        this.updateBadge();
        
        console.log(`[Notifications] Initialized with ${this.items.length} notifications`);
    },

    // Load notifications from localStorage
    load() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            this.items = saved ? JSON.parse(saved) : [];
        } catch (e) {
            console.error('[Notifications] Error loading:', e);
            this.items = [];
        }
    },

    // Save to localStorage
    save() {
        try {
            // Keep only max notifications
            if (this.items.length > this.settings.maxNotifications) {
                this.items = this.items.slice(0, this.settings.maxNotifications);
            }
            localStorage.setItem(this.storageKey, JSON.stringify(this.items));
        } catch (e) {
            console.error('[Notifications] Error saving:', e);
        }
    },

    // Load settings
    loadSettings() {
        try {
            const saved = localStorage.getItem(APP_CONFIG.storageKeys.notificationSettings);
            if (saved) {
                this.settings = { ...this.settings, ...JSON.parse(saved) };
            }
        } catch (e) {
            console.error('[Notifications] Error loading settings:', e);
        }
    },

    // Save settings
    saveSettings() {
        try {
            localStorage.setItem(APP_CONFIG.storageKeys.notificationSettings, JSON.stringify(this.settings));
        } catch (e) {
            console.error('[Notifications] Error saving settings:', e);
        }
    },

    // Add new notification
    add(notification) {
        // Check if notification type is enabled
        if (!this.isTypeEnabled(notification.type)) {
            return null;
        }

        // Create notification object
        const newNotification = {
            id: notification.id || `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: notification.type || 'system', // bosta, stock, system
            title: notification.title || 'إشعار جديد',
            message: notification.message || '',
            icon: notification.icon || '🔔',
            data: notification.data || {},
            timestamp: notification.timestamp || new Date().toISOString(),
            read: false,
            priority: notification.priority || 'medium', // high, medium, low
            actions: notification.actions || []
        };

        // Add to beginning of array
        this.items.unshift(newNotification);
        
        // Save
        this.save();

        // Update UI
        this.updateBadge();
        this.renderList();

        // Show browser notification if enabled
        if (this.settings.enableBrowser && document.hidden) {
            this.showBrowserNotification(newNotification);
        }

        // Play sound if enabled
        if (this.settings.enableSound) {
            this.playSound(notification.type);
        }

        return newNotification;
    },

    // Check if notification type is enabled
    isTypeEnabled(type) {
        switch (type) {
            case 'bosta':
                return this.settings.enableBosta;
            case 'stock':
            case 'out_of_stock':
            case 'low_stock':
                return this.settings.enableStock;
            case 'backorder':
                return this.settings.enableBackorders;
            default:
                return true;
        }
    },

    // Mark as read
    markAsRead(id) {
        const item = this.items.find(n => n.id === id);
        if (item && !item.read) {
            item.read = true;
            this.save();
            this.updateBadge();
            this.renderList();
        }
    },

    // Mark all as read
    markAllAsRead() {
        this.items.forEach(item => item.read = true);
        this.save();
        this.updateBadge();
        this.renderList();
        showToast('تم تحديد الكل كمقروء', 'success');
    },

    // Remove notification
    remove(id) {
        this.items = this.items.filter(n => n.id !== id);
        this.save();
        this.updateBadge();
        this.renderList();
    },

    // Clear all notifications
    clearAll() {
        if (confirm('هل تريد مسح جميع الإشعارات؟')) {
            this.items = [];
            this.save();
            this.updateBadge();
            this.renderList();
            showToast('تم مسح جميع الإشعارات', 'success');
        }
    },

    // Get unread count
    getUnreadCount() {
        return this.items.filter(n => !n.read).length;
    },

    // Get filtered notifications
    getFiltered(filter = 'all') {
        if (filter === 'all') return this.items;
        return this.items.filter(n => n.type === filter);
    },

    // Update badge count
    updateBadge() {
        const badge = document.getElementById('notifBadge');
        const count = this.getUnreadCount();
        
        if (badge) {
            badge.textContent = count > 99 ? '99+' : count;
            badge.style.display = count > 0 ? 'flex' : 'none';
            
            if (count > 0) {
                badge.classList.add('pulse');
            }
        }
    },

    // Render notifications list
    renderList(filter = APP_STATE.notificationsFilter || 'all') {
        const container = document.getElementById('notificationsList');
        if (!container) return;

        const filtered = this.getFiltered(filter);

        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                    </svg>
                    <p>لا توجد إشعارات</p>
                </div>
            `;
            return;
        }

        container.innerHTML = filtered.map(notif => `
            <div class="notification-item ${notif.type} ${notif.read ? '' : 'unread'}" data-id="${notif.id}">
                <div class="notification-icon">${this.getIconBg(notif)}${notif.icon}</div>
                <div class="notification-content">
                    <strong>${this.escapeHtml(notif.title)}</strong>
                    <p>${this.escapeHtml(notif.message)}</p>
                    <span class="notification-time">${this.formatTime(notif.timestamp)}</span>
                </div>
                <button class="close-btn small" onclick="Notifications.remove('${notif.id}')" title="حذف">✕</button>
            </div>
        `).join('');
    },

    // Get icon background based on type
    getIconBg(notif) {
        const colors = {
            'bosta': 'background: linear-gradient(135deg, #E31837, #ff4d6a); color: white;',
            'stock': 'background: linear-gradient(135deg, #f59e0b, #fbbf24); color: white;',
            'out_of_stock': 'background: linear-gradient(135deg, #ef4444, #f87171); color: white;',
            'low_stock': 'background: linear-gradient(135deg, #f59e0b, #fbbf24); color: white;',
            'backorder': 'background: linear-gradient(135deg, #8b5cf6, #a78bfa); color: white;',
            'system': 'background: linear-gradient(135deg, #3b82f6, #60a5fa); color: white;'
        };
        return `<style>.notification-item[data-id="${notif.id}"] .notification-icon { ${colors[notif.type] || colors.system} }</style>`;
    },

    // Format time for display
    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;

        // Less than a minute
        if (diff < 60000) return 'الآن';
        // Less than an hour
        if (diff < 3600000) return `منذ ${Math.floor(diff / 60000)} دقيقة`;
        // Less than a day
        if (diff < 86400000) return `منذ ${Math.floor(diff / 3600000)} ساعة`;
        // Otherwise show date
        return date.toLocaleDateString('ar-EG', { 
            day: 'numeric', 
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    // Escape HTML
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    // Show browser push notification
    async showBrowserNotification(notification) {
        if (!('Notification' in window)) return;

        if (Notification.permission === 'granted') {
            new Notification(notification.title, {
                body: notification.message,
                icon: '/icons/icon-192.png',
                badge: '/icons/icon-72.png',
                tag: notification.id,
                dir: 'rtl',
                lang: 'ar'
            });
        } else if (Notification.permission !== 'denied') {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                this.showBrowserNotification(notification);
            }
        }
    },

    // Play notification sound
    playSound(type) {
        try {
            // Create audio context for custom sounds
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            // Different tones for different types
            switch (type) {
                case 'bosta':
                    oscillator.frequency.value = 800; // Higher tone for Bosta
                    break;
                case 'stock':
                case 'out_of_stock':
                    oscillator.frequency.value = 400; // Lower tone for stock alerts
                    break;
                default:
                    oscillator.frequency.value = 600; // Default tone
            }

            oscillator.type = 'sine';
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);
        } catch (e) {
            // Audio not supported or blocked
            console.log('[Notifications] Sound playback not available');
        }
    },

    // Request browser notification permission
    async requestPermission() {
        if (!('Notification' in window)) {
            showToast('متصفحك لا يدعم الإشعارات', 'warning');
            return false;
        }

        const permission = await Notification.requestPermission();
        
        if (permission === 'granted') {
            this.settings.enableBrowser = true;
            this.saveSettings();
            showToast('تم تفعيل الإشعارات ✓', 'success');
            return true;
        } else {
            showToast('تم رفض إذن الإشعارات', 'error');
            return false;
        }
    },

    // Stock alert helpers
    addStockAlert(product, type = 'low_stock') {
        const alerts = {
            'low_stock': {
                icon: '⚠️',
                title: 'تنبيه مخزون منخفض',
                message: `المنتج "${product.name}" وصل للحد الأدنى (${product.stock} قطعة)`
            },
            'out_of_stock': {
                icon: '🚫',
                title: 'نفذ المخزون!',
                message: `المنتج "${product.name}" نفد من المخزون`
            },
            'restocked': {
                icon: '✅',
                title: 'تم التزويد',
                message: `المنتج "${product.name}" تم تزويده بالمخزون`
            }
        };

        const alert = alerts[type] || alerts['low_stock'];
        
        return this.add({
            type: 'stock',
            subtype: type,
            title: alert.title,
            message: alert.message,
            icon: alert.icon,
            data: { productId: product.id, product },
            priority: type === 'out_of_stock' ? 'high' : 'medium'
        });
    },

    // Backorder alert
    addBackorderAlert(product, customerName) {
        return this.add({
            type: 'backorder',
            title: 'طلب منتج غير متوفر',
            message: `العميل ${customerName} طلب "${product.name}" غير متوفر`,
            icon: '📋',
            data: { productId: product.id, product, customerName },
            priority: 'high'
        });
    },

    // System notification
    addSystemAlert(title, message, icon = 'ℹ️') {
        return this.add({
            type: 'system',
            title,
            message,
            icon,
            priority: 'low'
        });
    },

    // Get stats
    getStats() {
        return {
            total: this.items.length,
            unread: this.getUnreadCount(),
            byType: {
                bosta: this.items.filter(n => n.type === 'bosta').length,
                stock: this.items.filter(n => n.type === 'stock').length,
                system: this.items.filter(n => n.type === 'system').length,
                backorder: this.items.filter(n => n.type === 'backorder').length
            }
        };
    }
};

// Make available globally
window.Notifications = Notifications;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    Notifications.init();
});
