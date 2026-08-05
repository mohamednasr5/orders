/**
 * ========================================
 * شحنلي - Inventory Management Module
 * Stock tracking, alerts, and backorders
 * ========================================
 */

const Inventory = {
    // Storage key
    storageKey: 'shipli_products',
    
    // Products array
    products: [],
    
    // Backorders (out of stock orders)
    backorders: [],

    // Initialize
    init() {
        this.loadProducts();
        this.loadBackorders();
        this.checkStockLevels();
        
        console.log(`[Inventory] Initialized with ${this.products.length} products`);
    },

    // Load products from localStorage
    loadProducts() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            this.products = saved ? JSON.parse(saved) : [];
        } catch (e) {
            console.error('[Inventory] Error loading products:', e);
            this.products = [];
        }
    },

    // Save products to localStorage
    saveProducts() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.products));
        } catch (e) {
            console.error('[Inventory] Error saving products:', e);
        }
    },

    // Load backorders
    loadBackorders() {
        try {
            const saved = localStorage.getItem('shipli_backorders');
            this.backorders = saved ? JSON.parse(saved) : [];
        } catch (e) {
            console.error('[Inventory] Error loading backorders:', e);
            this.backorders = [];
        }
    },

    // Save backorders
    saveBackorders() {
        try {
            localStorage.setItem('shipli_backorders', JSON.stringify(this.backorders));
        } catch (e) {
            console.error('[Inventory] Error saving backorders:', e);
        }
    },

    // Add new product
    addProduct(productData) {
        const product = {
            id: `prod_${Date.now()}`,
            name: productData.name,
            sku: productData.sku || '',
            category: productData.category || 'other',
            price: parseFloat(productData.price) || 0,
            cost: parseFloat(productData.cost) || 0,
            stock: parseInt(productData.stock) || 0,
            minStock: parseInt(productData.minStock) || 5,
            weight: parseFloat(productData.weight) || 0,
            description: productData.description || '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        this.products.push(product);
        this.saveProducts();
        this.updateStats();
        this.renderTable();

        showToast(`تم إضافة "${product.name}" بنجاح`, 'success', '📦');

        return product;
    },

    // Update product
    updateProduct(id, updates) {
        const index = this.products.findIndex(p => p.id === id);
        if (index === -1) return null;

        this.products[index] = {
            ...this.products[index],
            ...updates,
            updatedAt: new Date().toISOString()
        };

        this.saveProducts();
        this.checkStockLevel(this.products[index]);
        this.updateStats();
        this.renderTable();

        return this.products[index];
    },

    // Delete product
    deleteProduct(id) {
        const index = this.products.findIndex(p => p.id === id);
        if (index === -1) return false;

        const productName = this.products[index].name;
        this.products.splice(index, 1);
        this.saveProducts();
        this.updateStats();
        this.renderTable();

        showToast(`تم حذف "${productName}"`, 'success');

        return true;
    },

    // Adjust stock
    adjustStock(productId, type, quantity, reason = '') {
        const product = this.products.find(p => p.id === productId);
        if (!product) {
            showToast('المنتج غير موجود', 'error');
            return null;
        }

        const oldStock = product.stock;
        
        switch (type) {
            case 'add':
                product.stock += quantity;
                break;
            case 'remove':
                product.stock = Math.max(0, product.stock - quantity);
                break;
            case 'set':
                product.stock = quantity;
                break;
            default:
                return null;
        }

        product.updatedAt = new Date().toISOString();

        // Add to stock history
        if (!product.stockHistory) {
            product.stockHistory = [];
        }
        product.stockHistory.unshift({
            date: new Date().toISOString(),
            type,
            quantity,
            oldStock,
            newStock: product.stock,
            reason
        });

        // Keep only last 50 history entries
        if (product.stockHistory.length > 50) {
            product.stockHistory.pop();
        }

        this.saveProducts();
        this.checkStockLevel(product);
        this.updateStats();
        this.renderTable();

        showToast(
            `تم تحديث مخزون "${product.name}": ${oldStock} → ${product.stock}`,
            'success',
            '📊'
        );

        return product;
    },

    // Check stock level for a single product
    checkStockLevel(product) {
        if (!Notifications || !Notifications.settings.enableStock) return;

        const settings = Notifications.settings || { minStockThreshold: 5 };
        const threshold = product.minStock || settings.minStockThreshold;

        if (product.stock <= 0) {
            // Out of stock
            Notifications.addStockAlert(product, 'out_of_stock');
            
            // Update inventory nav badge
            this.updateNavBadge();
        } else if (product.stock <= threshold && product.stock > 0) {
            // Low stock
            Notifications.addStockAlert(product, 'low_stock');
        }
    },

    // Check all products stock levels
    checkStockLevels() {
        this.products.forEach(product => {
            this.checkStockLevel(product);
        });
        this.updateStats();
    },

    // Create backorder when customer orders out-of-stock item
    createBackorder(productId, customerId, customerName, quantity = 1) {
        const product = this.products.find(p => p.id === productId);
        if (!product) return null;

        const backorder = {
            id: `bo_${Date.now()}`,
            productId: product.id,
            productName: product.name,
            customerId,
            customerName,
            quantity,
            status: 'pending', // pending, ready, cancelled, fulfilled
            createdAt: new Date().toISOString(),
            notified: false
        };

        this.backorders.unshift(backorder);
        this.saveBackorders();

        // Send notification
        if (typeof Notifications !== 'undefined') {
            Notifications.addBackorderAlert(product, customerName);
        }

        this.updateStats();
        this.renderBackordersList();

        showToast(`تم إنشاء طلب مؤجل لـ "${product.name}"`, 'warning', '📋');

        return backorder;
    },

    // Fulfill backorder when stock is available
    fulfillBackorder(backorderId) {
        const index = this.backorders.findIndex(b => b.id === backorderId);
        if (index === -1) return null;

        const backorder = this.backorders[index];
        const product = this.products.find(p => p.id === backorder.productId);

        if (!product || product.stock < backorder.quantity) {
            showToast('المخزون غير كافي لتنفيذ الطلب', 'warning');
            return null;
        }

        // Reduce stock
        this.adjustStock(backorder.productId, 'remove', backorder.quantity, 'تنفيذ طلب مؤجل');

        // Update backorder status
        backorder.status = 'fulfilled';
        backorder.fulfilledAt = new Date().toISOString();
        this.saveBackorders();

        // Notify
        if (typeof Notifications !== 'undefined') {
            Notifications.add({
                type: 'system',
                title: '✅ تم تنفيذ الطلب المؤجل',
                message: `تم تلبية طلب ${backorder.customerName} لـ "${backorder.productName}"`,
                icon: '✅'
            });
        }

        this.updateStats();
        this.renderBackordersList();

        return backorder;
    },

    // Cancel backorder
    cancelBackorder(backorderId) {
        const index = this.backorders.findIndex(b => b.id === backorderId);
        if (index === -1) return false;

        this.backorders.splice(index, 1);
        this.saveBackorders();
        this.updateStats();
        this.renderBackordersList();

        showToast('تم إلغاء الطلب المؤجل', 'success');

        return true;
    },

    // Get low stock products
    getLowStockProducts() {
        const threshold = Notifications?.settings?.minStockThreshold || 5;
        return this.products.filter(p => p.stock > 0 && p.stock <= (p.minStock || threshold));
    },

    // Get out of stock products
    getOutOfStockProducts() {
        return this.products.filter(p => p.stock <= 0);
    },

    // Calculate total inventory value
    getTotalValue() {
        return this.products.reduce((total, p) => total + (p.price * p.stock), 0);
    },

    // Update stats display
    updateStats() {
        const elements = {
            totalProductsCount: this.products.length,
            lowStockProductsCount: this.getLowStockProducts().length,
            outOfStockCount: this.getOutOfStockProducts().length,
            totalInventoryValue: this.getTotalValue().toFixed(2),
            pendingBackordersCount: this.backorders.filter(b => b.status === 'pending').length
        };

        Object.entries(elements).forEach(([id, value]) => {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        });

        // Update dashboard stats
        const lowStockEl = document.getElementById('lowStockCount');
        if (lowStockEl) {
            lowStockEl.textContent = elements.lowStockProductsCount + elements.outOfStockCount;
        }

        // Update nav badge
        this.updateNavBadge();
    },

    // Update navigation badge for inventory
    updateNavBadge() {
        const badge = document.getElementById('inventoryNavBadge');
        if (badge) {
            const count = this.getLowStockProducts().length + this.getOutOfStockProducts().length;
            badge.textContent = count;
            badge.style.display = count > 0 ? 'flex' : 'none';
        }
    },

    // Render products table
    renderTable(filter = APP_STATE.productsCategoryFilter || 'all', search = '') {
        const tbody = document.getElementById('productsTableBody');
        if (!tbody) return;

        let filtered = [...this.products];

        // Apply category filter
        if (filter !== 'all') {
            filtered = filtered.filter(p => p.category === filter);
        }

        // Apply search
        if (search) {
            const searchTerm = search.toLowerCase();
            filtered = filtered.filter(p => 
                p.name.toLowerCase().includes(searchTerm) ||
                p.sku.toLowerCase().includes(searchTerm)
            );
        }

        if (filtered.length === 0) {
            tbody.innerHTML = `
                <tr class="empty-row">
                    <td colspan="7">
                        <div class="empty-state">
                            <span class="empty-icon">📦</span>
                            <p>لا توجد منتجات</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = filtered.map(product => {
            const stockStatus = this.getStockStatus(product);
            return `
                <tr data-id="${product.id}" data-label="">
                    <td>
                        <strong>${this.escapeHtml(product.name)}</strong>
                    </td>
                    <td>${this.escapeHtml(product.sku) || '-'}</td>
                    <td>${this.getCategoryLabel(product.category)}</td>
                    <td>${product.price.toFixed(2)} ج.م</td>
                    <td>
                        <span class="stock-count ${stockStatus.class}">${product.stock}</span>
                    </td>
                    <td>
                        <span class="status-badge ${stockStatus.statusClass}">${stockStatus.label}</span>
                    </td>
                    <td>
                        <div class="row-actions">
                            <button class="secondary-btn small" onclick="Inventory.quickAdjust('${product.id}')">تعديل</button>
                            <button class="danger-btn small" onclick="Inventory.deleteProduct('${product.id}')">حذف</button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    },

    // Get stock status info
    getStockStatus(product) {
        const threshold = product.minStock || 5;
        
        if (product.stock <= 0) {
            return { label: 'نفذ المخزون', class: 'out-of-stock', statusClass: 'returned' };
        } else if (product.stock <= threshold) {
            return { label: 'منخفض', class: 'low-stock', statusClass: 'in_transit' };
        } else {
            return { label: 'متوفر', class: 'in-stock', statusClass: 'delivered' };
        }
    },

    // Get category label with emoji
    getCategoryLabel(category) {
        const labels = {
            'electronics': '📱 إلكترونيات',
            'clothing': '👕 ملابس',
            'home': '🏠 منزلية',
            'beauty': '💄 جمال',
            'food': '🍕 غذائية',
            'sports': '⚽ رياضة',
            'books': '📚 كتب',
            'other': '📦 أخرى'
        };
        return labels[category] || labels['other'];
    },

    // Quick adjust modal
    quickAdjust(productId) {
        const product = this.products.find(p => p.id === productId);
        if (!product) return;

        // Pre-fill adjustment form
        const select = document.getElementById('adjustProduct');
        const currentStockDisplay = document.getElementById('currentStockDisplay');
        
        if (select) select.value = productId;
        if (currentStockDisplay) {
            currentStockDisplay.innerHTML = `<strong>المخزون الحالي:</strong> ${product.stock} قطعة`;
        }

        showStockAdjustmentModal();
    },

    // Render backorders list
    renderBackordersList() {
        const container = document.getElementById('backordersList');
        const badge = document.getElementById('backordersBadge');
        
        if (!container) return;

        const pending = this.backorders.filter(b => b.status === 'pending');
        
        if (badge) {
            badge.textContent = pending.length;
        }

        if (pending.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2">
                        <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    <p>لا توجد طلبات مؤجلة</p>
                </div>
            `;
            return;
        }

        container.innerHTML = pending.map(bo => `
            <div class="backorder-item" data-id="${bo.id}">
                <div class="backorder-info">
                    <strong>${this.escapeHtml(bo.productName)}</strong>
                    <span>العميل: ${this.escapeHtml(bo.customerName)}</span>
                    <span>الكمية: ${bo.quantity}</span>
                </div>
                <div class="backorder-actions">
                    <button class="primary-btn small" onclick="Inventory.fulfillBackorder('${bo.id}')">
                        تنفيذ ✓
                    </button>
                    <button class="danger-btn small" onclick="Inventory.cancelBackorder('${bo.id}')">
                        إلغاء
                    </button>
                </div>
            </div>
        `).join('');
    },

    // Render stock alerts in dashboard
    renderStockAlerts() {
        const container = document.getElementById('stockAlertsList');
        if (!container) return;

        const lowStock = this.getLowStockProducts();
        const outOfStock = this.getOutOfStockProducts();
        const alerts = [
            ...outOfStock.map(p => ({ product, type: 'out' })),
            ...lowStock.map(p => ({ product, type: 'low' }))
        ];

        if (alerts.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2">
                        <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    <p>جميع المنتجات متوفرة</p>
                </div>
            `;
            return;
        }

        container.innerHTML = alerts.slice(0, 5).map(({ product, type }) => `
            <div class="alert-item ${type}">
                <span class="alert-icon">${type === 'out' ? '🚫' : '⚠️'}</span>
                <div class="alert-content">
                    <strong>${this.escapeHtml(product.name)}</strong>
                    <span>${type === 'out' ? 'نفذ المخزون' : `متبقي ${product.stock} قطعة`}</span>
                </div>
            </div>
        `).join('');
    },

    // Populate product select dropdowns
    populateProductSelect(selectId) {
        const select = document.getElementById(selectId);
        if (!select) return;

        select.innerHTML = '<option value="">-- اختر المنتج --</option>' +
            this.products.map(p => 
                `<option value="${p.id}">${p.name} (المتاح: ${p.stock})</option>`
            ).join('');
    },

    // Escape HTML helper
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    // Export data
    exportData() {
        return {
            products: this.products,
            backorders: this.backorders,
            exportedAt: new Date().toISOString()
        };
    },

    // Import data
    importData(data) {
        if (data.products) {
            this.products = data.products;
            this.saveProducts();
        }
        if (data.backorders) {
            this.backorders = data.backorders;
            this.saveBackorders();
        }
        this.updateStats();
        this.renderTable();
        this.renderBackordersList();
    },

    // Get stats summary
    getStats() {
        return {
            totalProducts: this.products.length,
            lowStock: this.getLowStockProducts().length,
            outOfStock: this.getOutOfStockProducts().length,
            totalValue: this.getTotalValue(),
            pendingBackorders: this.backorders.filter(b => b.status === 'pending').length
        };
    }
};

// Make available globally
window.Inventory = Inventory;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    Inventory.init();
});
