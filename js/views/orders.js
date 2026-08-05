/**
 * ===================================
 * Orders View Module
 * ===================================
 */

const Orders = {
    currentFilter: 'all',
    searchQuery: '',

    /**
     * Render Orders View
     */
    render(container) {
        container.innerHTML = `
            <div class="view-content">
                <!-- Page Header -->
                <div class="page-header">
                    <div class="header-content">
                        <h1 class="page-title">
                            <i class='bx bx-cart'></i>
                            الطلبات
                        </h1>
                        <p class="page-subtitle">إدارة جميع طلبات المتجر</p>
                    </div>
                    <button class="btn-primary" onclick="Orders.openCreateModal()">
                        <i class='bx bx-plus'></i> إضافة طلب
                    </button>
                </div>

                <!-- Filters Bar -->
                <div class="filters-bar">
                    <div class="search-box flex-1">
                        <i class='bx bx-search'></i>
                        <input type="text" id="orders-search" placeholder="بحث برقم الطلب، اسم العميل..." 
                               value="${this.searchQuery}" onkeyup="Orders.handleSearch(event)">
                    </div>
                    
                    <div class="filter-group">
                        <select class="filter-select" id="status-filter" onchange="Orders.filterByStatus(this.value)">
                            <option value="all" ${this.currentFilter === 'all' ? 'selected' : ''}>كل الحالات</option>
                            <option value="pending" ${this.currentFilter === 'pending' ? 'selected' : ''}>معلق</option>
                            <option value="processing" ${this.currentFilter === 'processing' ? 'selected' : ''}>قيد المعالجة</option>
                            <option value="shipped" ${this.currentFilter === 'shipped' ? 'selected' : ''}>تم الشحن</option>
                            <option value="delivered" ${this.currentFilter === 'delivered' ? 'selected' : ''}>تم التسليم</option>
                            <option value="cancelled" ${this.currentFilter === 'cancelled' ? 'selected' : ''}>ملغي</option>
                            <option value="returned" ${this.currentFilter === 'returned' ? 'selected' : ''}>مرتجع</option>
                        </select>
                        
                        <select class="filter-select" id="date-filter">
                            <option value="all">كل الفترات</option>
                            <option value="today">اليوم</option>
                            <option value="week">هذا الأسبوع</option>
                            <option value="month">هذا الشهر</option>
                        </select>
                    </div>

                    <div class="view-toggle">
                        <button class="icon-btn active" id="table-view-btn" onclick="Orders.setView('table')" title="عرض جدول">
                            <i class='bx bx-list-ul'></i>
                        </button>
                        <button class="icon-btn" id="card-view-btn" onclick="Orders.setView('card')" title="عرض بطاقات">
                            <i class='bx bx-grid-alt'></i>
                        </button>
                    </div>
                </div>

                <!-- Orders Container -->
                <div id="orders-container">
                    ${this.renderOrdersList()}
                </div>
            </div>
        `;

        this.initInteractions();
    },

    /**
     * Render Orders List (Table View)
     */
    renderOrdersList() {
        let orders = Utils.storage.get('orders', []);

        // Apply filters
        if (this.currentFilter !== 'all') {
            orders = orders.filter(o => o.status === this.currentFilter);
        }

        if (this.searchQuery) {
            const query = this.searchQuery.toLowerCase();
            orders = orders.filter(o => 
                (o.customerName || '').toLowerCase().includes(query) ||
                (o.id || '').toLowerCase().includes(query) ||
                (o.phone || '').includes(query)
            );
        }

        if (orders.length === 0) {
            return `
                <div class="empty-state">
                    <i class='bx bx-cart empty-state-icon'></i>
                    <h3 class="empty-state-title">لا توجد طلبات</h3>
                    <p class="empty-state-description">
                        ${this.searchQuery || this.currentFilter !== 'all' 
                            ? 'لا توجد نتائج مطابقة للبحث' 
                            : 'ابدأ بإنشاء أول طلب لك'}
                    </p>
                    ${!this.searchQuery && this.currentFilter === 'all' ? `
                        <button class="btn-primary" onclick="Orders.openCreateModal()">
                            <i class='bx bx-plus'></i> إنشاء طلب جديد
                        </button>
                    ` : ''}
                </div>
            `;
        }

        // Sort by date (newest first)
        orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        return `
            <div class="table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>الطلب</th>
                            <th>العميل</th>
                            <th>الهاتف</th>
                            <th>المدينة</th>
                            <th>الإجمالي</th>
                            <th>الحالة</th>
                            <th>التاريخ</th>
                            <th>إجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${orders.map(order => this.renderOrderRow(order)).join('')}
                    </tbody>
                </table>
            </div>
            <div class="pagination-info">
                عرض ${orders.length} من ${Utils.storage.get('orders', []).length} طلب
            </div>
        `;
    },

    /**
     * Render Single Order Row
     */
    renderOrderRow(order) {
        const statusClass = order.status || 'pending';
        const statusText = this.getStatusText(statusClass);
        
        return `
            <tr data-order-id="${order.id}">
                <td>
                    <strong>#${(order.id || '').slice(-8)}</strong>
                </td>
                <td>${order.customerName || '-'}</td>
                <td dir="ltr">${order.phone || '-'}</td>
                <td>${order.city || '-'}</td>
                <td><strong>${Utils.formatCurrency(order.total)}</strong></td>
                <td>
                    <span class="status-badge status-${statusClass}">${statusText}</span>
                </td>
                <td style="white-space:nowrap;">${Utils.formatDate(order.createdAt, 'short')}</td>
                <td>
                    <div class="row-actions">
                        <button class="shipment-action-btn" onclick="Orders.viewOrder('${order.id}')" title="عرض">
                            <i class='bx bx-eye'></i>
                        </button>
                        <button class="shipment-action-btn" onclick="Orders.editOrder('${order.id}')" title="تعديل">
                            <i class='bx bx-edit'></i>
                        </button>
                        <button class="shipment-action-btn" onclick="Orders.createShipmentFromOrder('${order.id}')" title="إنشاء شحنة">
                            <i class='bx bx-truck'></i>
                        </button>
                        <button class="shipment-action-btn" onclick="Orders.deleteOrder('${order.id}')" title="حذف" style="color:var(--danger);">
                            <i class='bx bx-trash'></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    },

    /**
     * Open Create Order Modal
     */
    openCreateModal(orderId = null) {
        const isEdit = !!orderId;
        const order = orderId ? Utils.storage.get('orders', []).find(o => o.id === orderId) : null;
        
        const modalHtml = `
            <div id="order-modal" class="modal-overlay">
                <div class="modal modal-lg">
                    <div class="modal-header modal-gradient">
                        <h3><i class='bx ${isEdit ? 'bx-edit' : 'bx-cart-add'}'></i> 
                            ${isEdit ? 'تعديل الطلب' : 'إضافة طلب جديد'}
                        </h3>
                        <button class="btn-close" onclick="closeModal('order-modal')">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="order-form">
                            <!-- Customer Info -->
                            <div class="form-section">
                                <h4 class="section-title"><i class='bx bx-user'></i> بيانات العميل</h4>
                                <div class="form-row">
                                    <div class="form-group flex-2">
                                        <label>اسم العميل *</label>
                                        <input type="text" id="order-customer-name" required 
                                               value="${order?.customerName || ''}" placeholder="أحمد محمد">
                                    </div>
                                    <div class="form-group flex-1">
                                        <label>الهاتف *</label>
                                        <input type="tel" id="order-phone" required 
                                               value="${order?.phone || ''}" placeholder="01xxxxxxxxx">
                                    </div>
                                </div>
                                <div class="form-row">
                                    <div class="form-group flex-1">
                                        <label>المدينة</label>
                                        <select id="order-city">
                                            <option value="">اختر المدينة</option>
                                            <option value="cairo" ${order?.city === 'cairo' ? 'selected' : ''}>القاهرة</option>
                                            <option value="alexandria" ${order?.city === 'alexandria' ? 'selected' : ''}>الإسكندرية</option>
                                            <option value="giza" ${order?.city === 'giza' ? 'selected' : ''}>الجيزة</option>
                                            <option value="mansoura" ${order?.city === 'mansoura' ? 'selected' : ''}>المنصورة</option>
                                            <option value="other">أخرى</option>
                                        </select>
                                    </div>
                                    <div class="form-group flex-1">
                                        <label>العنوان</label>
                                        <input type="text" id="order-address" 
                                               value="${order?.address || ''}" placeholder="العنوان التفصيلي">
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label>ملاحظات</label>
                                    <textarea id="order-notes" rows="2" 
                                              placeholder="ملاحظات إضافية...">${order?.notes || ''}</textarea>
                                </div>
                            </div>

                            <!-- Order Items -->
                            <div class="form-section">
                                <h4 class="section-title"><i class='bx bx-package'></i> المنتجات</h4>
                                <div id="order-items-container">
                                    ${this.renderOrderItemsForm(order?.items || [])}
                                </div>
                                <button type="button" class="btn-outline btn-sm" onclick="Orders.addOrderItem()" style="margin-top:12px;">
                                    <i class='bx bx-plus'></i> إضافة منتج
                                </button>
                            </div>

                            <!-- Payment & Totals -->
                            <div class="form-section">
                                <h4 class="section-title"><i class='bx bx-wallet'></i> الدفع</h4>
                                <div class="financial-grid">
                                    <div class="form-group">
                                        <label>طريقة الدفع</label>
                                        <select id="order-payment-method">
                                            <option value="cod" ${order?.paymentMethod === 'cod' ? 'selected' : ''}>الدفع عند الاستلام</option>
                                            <option value="card" ${order?.paymentMethod === 'card' ? 'selected' : ''}>بطاقة ائتمان</option>
                                            <option value="transfer" ${order?.paymentMethod === 'transfer' ? 'selected' : ''}>تحويل بنكي</option>
                                        </select>
                                    </div>
                                    <div class="form-group">
                                        <label>الإجمالي</label>
                                        <input type="number" id="order-total" readonly 
                                               value="${order?.total || 0}" style="font-weight:bold;font-size:18px;">
                                    </div>
                                </div>
                            </div>

                            <div class="form-actions">
                                <button type="button" class="btn-outline" onclick="closeModal('order-modal')">
                                    إلغاء
                                </button>
                                <button type="submit" class="btn-primary">
                                    <i class='bx ${isEdit ? 'bx-check' : 'bx-plus'}'></i> 
                                    ${isEdit ? 'حفظ التعديلات' : 'إنشاء الطلب'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;

        // Add modal to DOM
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        openModal('order-modal');

        // Setup form submission
        document.getElementById('order-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveOrder(orderId);
        });

        // Remove modal from DOM when closed
        const observer = new MutationObserver(() => {
            const modal = document.getElementById('order-modal');
            if (modal && modal.classList.contains('hidden')) {
                setTimeout(() => modal.remove(), 300);
                observer.disconnect();
            }
        });
        observer.observe(document.getElementById('order-modal'), { attributes: true });
    },

    /**
     * Render Order Items Form
     */
    renderOrderItemsForm(items = []) {
        if (items.length === 0) items = [{}];

        return items.map((item, index) => `
            <div class="order-item-row" data-index="${index}" style="
                display:flex;gap:12px;align-items:flex-end;
                padding:12px;background:var(--bg-tertiary);border-radius:8px;margin-bottom:8px;
            ">
                <div class="form-group flex-2" style="margin-bottom:0;">
                    <label>المنتج</label>
                    <input type="text" name="item-name-${index}" value="${item.name || ''}" 
                           placeholder="اسم المنتج" onchange="Orders.updateOrderTotal()">
                </div>
                <div class="form-group" style="margin-bottom:0;width:80px;">
                    <label>الكمية</label>
                    <input type="number" name="item-qty-${index}" value="${item.quantity || 1}" min="1"
                           onchange="Orders.updateOrderTotal()">
                </div>
                <div class="form-group" style="margin-bottom:0;width:100px;">
                    <label>السعر</label>
                    <input type="number" name="item-price-${index}" value="${item.price || 0}" min="0"
                           onchange="Orders.updateOrderTotal()">
                </div>
                <div class="form-group" style="margin-bottom:0;width:100px;">
                    <label>المجموع</label>
                    <input type="text" name="item-total-${index}" readonly 
                           value="${Utils.formatCurrency((item.quantity || 1) * (item.price || 0))}">
                </div>
                <button type="button" class="btn-danger btn-sm" onclick="Orders.removeOrderItem(${index})" 
                        style="padding:8px;margin-bottom:0;" ${items.length <= 1 ? 'disabled' : ''}>
                    <i class='bx bx-x'></i>
                </button>
            </div>
        `).join('');
    },

    /**
     * Add New Order Item Row
     */
    addOrderItem() {
        const container = document.getElementById('order-items-container');
        const itemCount = container.querySelectorAll('.order-item-row').length;
        
        const newItemHtml = `
            <div class="order-item-row animate-fadeInUp" data-index="${itemCount}" style="
                display:flex;gap:12px;align-items:flex-end;
                padding:12px;background:var(--bg-tertiary);border-radius:8px;margin-bottom:8px;
            ">
                <div class="form-group flex-2" style="margin-bottom:0;">
                    <label>المنتج</label>
                    <input type="text" name="item-name-${itemCount}" placeholder="اسم المنتج" 
                           onchange="Orders.updateOrderTotal()">
                </div>
                <div class="form-group" style="margin-bottom:0;width:80px;">
                    <label>الكمية</label>
                    <input type="number" name="item-qty-${itemCount}" value="1" min="1"
                           onchange="Orders.updateOrderTotal()">
                </div>
                <div class="form-group" style="margin-bottom:0;width:100px;">
                    <label>السعر</label>
                    <input type="number" name="item-price-${itemCount}" value="0" min="0"
                           onchange="Orders.updateOrderTotal()">
                </div>
                <div class="form-group" style="margin-bottom:0;width:100px;">
                    <label>المجموع</label>
                    <input type="text" name="item-total-${itemCount}" readonly value="0 ج.م">
                </div>
                <button type="button" class="btn-danger btn-sm" onclick="Orders.removeOrderItem(${itemCount})" 
                        style="padding:8px;margin-bottom:0;">
                    <i class='bx bx-x'></i>
                </button>
            </div>
        `;
        
        container.insertAdjacentHTML('beforeend', newItemHtml);
    },

    /**
     * Remove Order Item Row
     */
    removeOrderItem(index) {
        const row = document.querySelector(`.order-item-row[data-index="${index}"]`);
        if (row && document.querySelectorAll('.order-item-row').length > 1) {
            row.remove();
            this.updateOrderTotal();
        }
    },

    /**
     * Update Order Total
     */
    updateOrderTotal() {
        let total = 0;
        document.querySelectorAll('.order-item-row').forEach(row => {
            const qty = parseFloat(row.querySelector('[name^="item-qty"]')?.value) || 0;
            const price = parseFloat(row.querySelector('[name^="item-price"]')?.value) || 0;
            const itemTotal = qty * price;
            
            const totalInput = row.querySelector('[name^="item-total"]');
            if (totalInput) totalInput.value = Utils.formatCurrency(itemTotal);
            
            total += itemTotal;
        });
        
        const totalInput = document.getElementById('order-total');
        if (totalInput) totalInput.value = total.toFixed(2);
    },

    /**
     * Save Order (Create or Update)
     */
    saveOrder(orderId = null) {
        // Collect form data
        const orderData = {
            id: orderId || Utils.generateId(),
            customerName: document.getElementById('order-customer-name').value.trim(),
            phone: document.getElementById('order-phone').value.trim(),
            city: document.getElementById('order-city').value,
            address: document.getElementById('order-address').value.trim(),
            notes: document.getElementById('order-notes').value.trim(),
            paymentMethod: document.getElementById('order-payment-method').value,
            total: parseFloat(document.getElementById('order-total').value) || 0,
            status: orderId ? Utils.storage.get('orders', []).find(o => o.id === orderId)?.status : 'pending',
            createdAt: orderId ? Utils.storage.get('orders', []).find(o => o.id === orderId)?.createdAt : new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            items: []
        };

        // Collect items
        document.querySelectorAll('.order-item-row').forEach(row => {
            const name = row.querySelector('[name^="item-name"]')?.value.trim();
            const quantity = parseFloat(row.querySelector('[name^="item-qty"]')?.value) || 0;
            const price = parseFloat(row.querySelector('[name^="item-price"]')?.value) || 0;
            
            if (name) {
                orderData.items.push({ name, quantity, price });
            }
        });

        // Validate
        if (!orderData.customerName || !orderData.phone) {
            Toast.error('يرجى ملء حقلي اسم العميل والهاتف');
            return;
        }

        // Save to storage
        let orders = Utils.storage.get('orders', []);
        
        if (orderId) {
            const index = orders.findIndex(o => o.id === orderId);
            if (index !== -1) {
                orders[index] = { ...orders[index], ...orderData };
            }
        } else {
            orders.unshift(orderData);
        }
        
        Utils.storage.set('orders', orders);

        // Close modal and refresh
        closeModal('order-modal');
        Toast.success(orderId ? 'تم تحديث الطلب بنجاح' : 'تم إنشاء الطلب بنجاح');
        navigateTo('orders');
    },

    /**
     * View Order Details
     */
    viewOrder(orderId) {
        const order = Utils.storage.get('orders', []).find(o => o.id === orderId);
        if (!order) {
            Toast.error('الطلب غير موجود');
            return;
        }

        const modalHtml = `
            <div id="order-detail-modal" class="modal-overlay">
                <div class="modal modal-lg">
                    <div class="modal-header">
                        <h3><i class='bx bx-receipt'></i> تفاصيل الطلب #${order.id.slice(-8)}</h3>
                        <button class="btn-close" onclick="closeModal('order-detail-modal')">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="detail-grid">
                            <div class="detail-section">
                                <h4><i class='bx bx-user'></i> بيانات العميل</h4>
                                <p><strong>الاسم:</strong> ${order.customerName}</p>
                                <p><strong>الهاتف:</strong> ${order.phone}</p>
                                <p><strong>المدينة:</strong> ${order.city || '-'}</p>
                                <p><strong>العنوان:</strong> ${order.address || '-'}</p>
                            </div>
                            
                            <div class="detail-section">
                                <h4><i class='bx bx-package'></i> المنتجات</h4>
                                ${(order.items || []).map(item => `
                                    <div class="item-detail">
                                        <span>${item.name}</span>
                                        <span>${item.quantity} × ${Utils.formatCurrency(item.price)} = ${Utils.formatCurrency(item.quantity * item.price)}</span>
                                    </div>
                                `).join('<br>') || '-'}
                            </div>
                            
                            <div class="detail-section">
                                <h4><i class='bx bx-wallet'></i> المالية</h4>
                                <p><strong>الإجمالي:</strong> <span style="color:var(--primary);font-size:20px;">${Utils.formatCurrency(order.total)}</span></p>
                                <p><strong>طريقة الدفع:</strong> ${this.getPaymentMethodText(order.paymentMethod)}</p>
                                <p><strong>الحالة:</strong> <span class="status-badge status-${order.status}">${this.getStatusText(order.status)}</span></p>
                            </div>
                            
                            <div class="detail-section">
                                <h4><i class='bx bx-time'></i> التواريخ</h4>
                                <p><strong>تاريخ الإنشاء:</strong> ${Utils.formatDate(order.createdAt, 'long')}</p>
                                <p><strong>آخر تحديث:</strong> ${Utils.formatDate(order.updatedAt, 'long')}</p>
                            </div>
                        </div>
                        
                        ${order.notes ? `<div class="notes-section"><strong>ملاحظات:</strong><p>${order.notes}</p></div>` : ''}
                        
                        <div class="detail-actions">
                            <button class="btn-primary" onclick="closeModal('order-detail-modal');Orders.editOrder('${order.id}')">
                                <i class='bx bx-edit'></i> تعديل
                            </button>
                            <button class="btn-secondary" onclick="Orders.createShipmentFromOrder('${order.id}')">
                                <i class='bx bx-truck'></i> إنشاء شحنة
                            </button>
                            <button class="btn-outline" onclick="Orders.printOrder('${order.id}')">
                                <i class='bx bx-printer'></i> طباعة
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        openModal('order-detail-modal');

        // Cleanup on close
        setTimeout(() => {
            const modal = document.getElementById('order-detail-modal');
            if (modal) {
                const obs = new MutationObserver(() => {
                    if (modal.classList.contains('hidden')) {
                        setTimeout(() => modal.remove(), 300);
                        obs.disconnect();
                    }
                });
                obs.observe(modal, { attributes: true });
            }
        }, 100);
    },

    /**
     * Edit Order
     */
    editOrder(orderId) {
        this.openCreateModal(orderId);
    },

    /**
     * Delete Order
     */
    deleteOrder(orderId) {
        if (!confirm('هل أنت متأكد من حذف هذا الطلب؟')) return;

        let orders = Utils.storage.get('orders', []);
        orders = orders.filter(o => o.id !== orderId);
        Utils.storage.set('orders', orders);

        Toast.success('تم حذف الطلب');
        navigateTo('orders');
    },

    /**
     * Create Shipment from Order
     */
    createShipmentFromOrder(orderId) {
        const order = Utils.storage.get('orders', []).find(o => o.id === orderId);
        if (!order) {
            Toast.error('الطلب غير موجود');
            return;
        }

        // Close any open modals
        document.querySelectorAll('.modal-overlay:not(.hidden)').forEach(m => m.classList.add('hidden'));

        // Open waybill modal with pre-filled data
        Shipping.openWaybillModal({
            receiverName: order.customerName,
            receiverPhone: order.phone,
            receiverCity: order.city,
            receiverAddress: order.address,
            productsValue: order.total,
            linkedOrderId: order.id,
            items: order.items
        });
    },

    /**
     * Filter by Status
     */
    filterByStatus(status) {
        this.currentFilter = status;
        this.render(document.getElementById('content-area'));
    },

    /**
     * Handle Search
     */
    handleSearch(event) {
        if (event.key === 'Enter') {
            this.searchQuery = event.target.value.trim();
            this.render(document.getElementById('content-area'));
        }
    },

    /**
     * Search function for global access
     */
    search(query) {
        this.searchQuery = query;
        navigateTo('orders');
    },

    /**
     * Set View Mode
     */
    setView(mode) {
        document.getElementById('table-view-btn')?.classList.toggle('active', mode === 'table');
        document.getElementById('card-view-btn')?.classList.toggle('active', mode === 'card');
        // Implement card view if needed
    },

    /**
     * Print Order
     */
    printOrder(orderId) {
        const order = Utils.storage.get('orders', []).find(o => o.id === orderId);
        if (!order) return;

        const printContent = `
            <div style="padding:20px;font-family:Cairo,sans-serif;direction:rtl;">
                <h1 style="text-align:center;color:#2563eb;">فاتورة الطلب #${order.id.slice(-8)}</h1>
                <hr>
                <p><strong>العميل:</strong> ${order.customerName}</p>
                <p><strong>الهاتف:</strong> ${order.phone}</p>
                <hr>
                <h3>المنتجات:</h3>
                ${(order.items || []).map(i => `<p>${i.name} - الكمية: ${i.quantity} - السعر: ${Utils.formatCurrency(i.price)}</p>`).join('')}
                <hr>
                <p style="font-size:20px;"><strong>الإجمالي: ${Utils.formatCurrency(order.total)}</strong></p>
                <p style="text-align:center;color:#666;">شكراً لتعاملك معنا</p>
            </div>
        `;

        const printWindow = window.open('', '_blank');
        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.print();
    },

    /**
     * Get Status Text
     */
    getStatusText(status) {
        const map = {
            pending: 'معلق',
            processing: 'قيد المعالجة',
            shipped: 'تم الشحن',
            delivered: 'تم التسليم',
            cancelled: 'ملغي',
            returned: 'مرتجع'
        };
        return map[status] || status || 'معلق';
    },

    /**
     * Get Payment Method Text
     */
    getPaymentMethodText(method) {
        const map = {
            cod: 'الدفع عند الاستلام',
            card: 'بطاقة ائتمان',
            transfer: 'تحويل بنكي'
        };
        return map[method] || method || '-';
    },

    /**
     * Initialize Interactions
     */
    initInteractions() {
        // Additional initialization if needed
    }
};

// Styles for Orders view
const ordersStyles = `
    .filters-bar {
        display:flex;gap:16px;align-items:center;margin-bottom:24px;flex-wrap:wrap;
        background:var(--bg-card);padding:16px;border-radius:12px;border:1px solid var(--border-color);
    }
    
    .filter-group {
        display:flex;gap:8px;
    }
    
    .view-toggle {
        display:flex;gap:4px;
    }
    
    .view-toggle .icon-btn.active {
        background:var(--primary-light);color:var(--primary);
    }
    
    .row-actions {
        display:flex;gap:4px;
    }
    
    .pagination-info {
        text-align:left;padding:12px;font-size:13px;color:var(--text-secondary);
    }
    
    .detail-grid {
        display:grid;grid-template-columns:repeat(2,1fr);gap:24px;
    }
    
    @media(max-width:768px){
        .detail-grid{grid-template-columns:1fr;}
        .filters-bar{flex-direction:column;}
        .filter-group{width:100%;}
        .filter-group select{flex:1;}
    }
    
    .detail-section h4{
        font-size:14px;color:var(--primary);margin-bottom:12px;padding-bottom:8px;
        border-bottom:1px solid var(--border-color);
    }
    
    .detail-section p{margin-bottom:8px;font-size:14px;}
    
    .item-detail{
        display:flex;justify-content:space-between;padding:6px 0;
        border-bottom:1px dashed var(--border-color);
    }
    
    .notes-section{
        margin-top:20px;padding:16px;background:var(--bg-tertiary);border-radius:8px;
    }
    
    .detail-actions{
        margin-top:24px;display:flex;gap:12px;justify-content:flex-end;
    }
`;

if (!document.getElementById('orders-styles')) {
    const s = document.createElement('style');
    s.id = 'orders-styles';
    s.textContent = ordersStyles;
    document.head.appendChild(s);
}
