/**
 * ===================================
 * Customers (CRM) View Module
 * ===================================
 */

const Customers = {
    currentView: 'grid',
    searchQuery: '',

    render(container) {
        container.innerHTML = `
            <div class="view-content">
                <div class="page-header">
                    <div class="header-content">
                        <h1 class="page-title"><i class='bx bx-user-pin'></i> العملاء</h1>
                        <p class="page-subtitle">إدارة بيانات العملاء وعلاقاتهم</p>
                    </div>
                    <button class="btn-primary" onclick="Customers.openCreateModal()">
                        <i class='bx bx-user-plus'></i> إضافة عميل
                    </button>
                </div>

                <div class="filters-bar">
                    <div class="search-box flex-1">
                        <i class='bx bx-search'></i>
                        <input type="text" placeholder="بحث بالاسم، الهاتف..." 
                               onkeyup="if(event.key==='Enter')Customers.search(this.value)">
                    </div>

                    <select class="filter-select" onchange="Customers.filterByType(this.value)">
                        <option value="all">كل العملاء</option>
                        <option value="active">نشط</option>
                        <option value="new">جديد</option>
                        <option value="vip">VIP</option>
                    </select>

                    <div class="view-toggle">
                        <button class="icon-btn ${this.currentView === 'grid' ? 'active' : ''}" onclick="Customers.setView('grid')">
                            <i class='bx bx-grid-alt'></i>
                        </button>
                        <button class="icon-btn ${this.currentView === 'list' ? 'active' : ''}" onclick="Customers.setView('list')">
                            <i class='bx bx-list-ul'></i>
                        </button>
                    </div>
                </div>

                <div id="customers-container">${this.renderCustomers()}</div>
            </div>
        `;
    },

    renderCustomers() {
        let customers = Utils.storage.get('customers', []);

        if (this.searchQuery) {
            const q = this.searchQuery.toLowerCase();
            customers = customers.filter(c => 
                (c.name || '').toLowerCase().includes(q) ||
                (c.phone || '').includes(q)
            );
        }

        if (customers.length === 0) {
            return `
                <div class="empty-state">
                    <i class='bx bx-user empty-state-icon'></i>
                    <h3 class="empty-state-title">لا يوجد عملاء</h3>
                    <p class="empty-state-description">ابدأ بإضافة عملائك</p>
                    <button class="btn-primary" onclick="Customers.openCreateModal()">
                        <i class='bx bx-user-plus'></i> إضافة عميل جديد
                    </button>
                </div>
            `;
        }

        if (this.currentView === 'grid') {
            return `<div class="customers-grid">${customers.map(c => this.renderCustomerCard(c)).join('')}</div>`;
        } else {
            return `
                <div class="table-container">
                    <table class="data-table">
                        <thead>
                            <tr><th>العميل</th><th>الهاتف</th><th>المدينة</th><th>الطلبات</th><th>إجمالي المشتريات</th><th>إجراءات</th></tr>
                        </thead>
                        <tbody>${customers.map(c => this.renderCustomerRow(c)).join('')}</tbody>
                    </table>
                </div>
            `;
        }
    },

    renderCustomerCard(customer) {
        const orders = Utils.storage.get('orders', []).filter(o => o.phone === customer.phone);
        const totalSpent = orders.reduce((sum, o) => sum + (o.total || 0), 0);

        return `
            <div class="card customer-card hover-lift">
                <div class="card-body" style="padding:20px;">
                    <div style="display:flex;align-items:center;gap:16px;margin-bottom:16px;">
                        <div class="customer-avatar-lg" style="
                            width:56px;height:56px;border-radius:50%;background:var(--primary-light);
                            display:flex;align-items:center;justify-content:center;font-size:24px;
                            color:var(--primary);font-weight:bold;flex-shrink:0;
                        ">
                            ${(customer.name || '').charAt(0)}
                        </div>
                        <div style="flex:1;min-width:0;">
                            <h3 style="font-size:18px;margin-bottom:4px;">${customer.name}</h3>
                            <p style="color:var(--text-secondary);font-size:14px;">${customer.phone || '-'}</p>
                        </div>
                        <span class="status-badge status-${customer.type === 'vip' ? 'purple' : 'success'}">
                            ${this.getTypeText(customer.type)}
                        </span>
                    </div>

                    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;text-align:center;margin-bottom:16px;">
                        <div>
                            <div style="font-weight:bold;font-size:18px;color:var(--primary);">${orders.length}</div>
                            <div style="font-size:12px;color:var(--text-secondary);">الطلبات</div>
                        </div>
                        <div>
                            <div style="font-weight:bold;font-size:18px;color:var(--success);">${Utils.formatCurrency(totalSpent)}</div>
                            <div style="font-size:12px;color:var(--text-secondary);">إجمالي المشتريات</div>
                        </div>
                        <div>
                            <div style="font-weight:bold;font-size:18px;">${customer.city || '-'}</div>
                            <div style="font-size:12px;color:var(--text-secondary);">المدينة</div>
                        </div>
                    </div>

                    <div style="display:flex;gap:8px;">
                        <button class="btn-outline btn-sm" onclick="Customers.viewCustomer('${customer.id}')" style="flex:1;">
                            <i class='bx bx-eye'></i> عرض
                        </button>
                        <button class="btn-outline btn-sm" onclick="Customers.editCustomer('${customer.id}')">
                            <i class='bx bx-edit'></i>
                        </button>
                        <button class="btn-danger btn-sm" onclick="Customers.deleteCustomer('${customer.id}')">
                            <i class='bx bx-trash'></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    renderCustomerRow(customer) {
        const orders = Utils.storage.get('orders', []).filter(o => o.phone === customer.phone);
        const totalSpent = orders.reduce((sum, o) => sum + (o.total || 0), 0);

        return `
            <tr>
                <td><strong>${customer.name}</strong></td>
                <td dir="ltr">${customer.phone || '-'}</td>
                <td>${customer.city || '-'}</td>
                <td>${orders.length}</td>
                <td><strong>${Utils.formatCurrency(totalSpent)}</strong></td>
                <td>
                    <div class="row-actions">
                        <button class="shipment-action-btn" onclick="Customers.viewCustomer('${customer.id}')"><i class='bx bx-eye'></i></button>
                        <button class="shipment-action-btn" onclick="Customers.editCustomer('${customer.id}')"><i class='bx bx-edit'></i></button>
                        <button class="shipment-action-btn" style="color:var(--danger);" onclick="Customers.deleteCustomer('${customer.id}')"><i class='bx bx-trash'></i></button>
                    </div>
                </td>
            </tr>
        `;
    },

    openCreateModal(customerId = null) {
        const isEdit = !!customerId;
        const customer = customerId ? Utils.storage.get('customers', []).find(c => c.id === customerId) : null;

        const modalHtml = `
            <div id="customer-modal" class="modal-overlay">
                <div class="modal">
                    <div class="modal-header modal-gradient">
                        <h3><i class='bx ${isEdit ? 'bx-edit' : 'bx-user-plus'}'></i> 
                            ${isEdit ? 'تعديل العميل' : 'إضافة عميل جديد'}
                        </h3>
                        <button class="btn-close" onclick="closeModal('customer-modal')">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="customer-form">
                            <div class="form-row">
                                <div class="form-group flex-2">
                                    <label>الاسم الكامل *</label>
                                    <input type="text" id="cust-name" required value="${customer?.name || ''}">
                                </div>
                                <div class="form-group flex-1">
                                    <label>الهاتف *</label>
                                    <input type="tel" id="cust-phone" required value="${customer?.phone || ''}">
                                </div>
                            </div>

                            <div class="form-row">
                                <div class="form-group flex-1">
                                    <label>المدينة</label>
                                    <input type="text" id="cust-city" value="${customer?.city || ''}">
                                </div>
                                <div class="form-group flex-1">
                                    <label>العنوان</label>
                                    <input type="text" id="cust-address" value="${customer?.address || ''}">
                                </div>
                            </div>

                            <div class="form-group">
                                <label>البريد الإلكتروني</label>
                                <input type="email" id="cust-email" value="${customer?.email || ''}">
                            </div>

                            <div class="form-row">
                                <div class="form-group flex-1">
                                    <label>نوع العميل</label>
                                    <select id="cust-type">
                                        <option value="regular" ${customer?.type === 'regular' ? 'selected' : ''}>عادي</option>
                                        <option value="new" ${customer?.type === 'new' ? 'selected' : ''}>جديد</option>
                                        <option value="active" ${customer?.type === 'active' ? 'selected' : ''}>نشط</option>
                                        <option value="vip" ${customer?.type === 'vip' ? 'selected' : ''}>VIP</option>
                                    </select>
                                </div>
                                <div class="form-group flex-1">
                                    <label>ملاحظات</label>
                                    <input type="text" id="cust-notes" value="${customer?.notes || ''}">
                                </div>
                            </div>

                            <div class="form-actions">
                                <button type="button" class="btn-outline" onclick="closeModal('customer-modal')">إلغاء</button>
                                <button type="submit" class="btn-primary">
                                    <i class='bx ${isEdit ? 'bx-check' : 'bx-user-plus'}'></i> 
                                    ${isEdit ? 'حفظ' : 'إضافة'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        openModal('customer-modal');

        document.getElementById('customer-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveCustomer(customerId);
        });

        setTimeout(() => {
            const modal = document.getElementById('customer-modal');
            if (modal) {
                const obs = new MutationObserver(() => {
                    if (modal.classList.contains('hidden')) { setTimeout(() => modal.remove(), 300); obs.disconnect(); }
                });
                obs.observe(modal, { attributes: true });
            }
        }, 100);
    },

    saveCustomer(customerId = null) {
        const data = {
            id: customerId || Utils.generateId(),
            name: document.getElementById('cust-name').value.trim(),
            phone: document.getElementById('cust-phone').value.trim(),
            city: document.getElementById('cust-city').value.trim(),
            address: document.getElementById('cust-address').value.trim(),
            email: document.getElementById('cust-email').value.trim(),
            type: document.getElementById('cust-type').value,
            notes: document.getElementById('cust-notes').value.trim(),
            createdAt: customerId ? undefined : new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        if (!data.name || !data.phone) { Toast.error('يرجى إدخال الاسم والهاتف'); return; }

        let customers = Utils.storage.get('customers', []);
        if (customerId) {
            const idx = customers.findIndex(c => c.id === customerId);
            if (idx !== -1) customers[idx] = { ...customers[idx], ...data };
        } else {
            customers.unshift(data);
        }

        Utils.storage.set('customers', customers);
        closeModal('customer-modal');
        Toast.success(customerId ? 'تم تحديث بيانات العميل' : 'تم إضافة العميل');
        navigateTo('customers');
    },

    viewCustomer(id) {
        const customer = Utils.storage.get('customers', []).find(c => c.id === id);
        if (!customer) return;

        const orders = Utils.storage.get('orders', []).filter(o => o.phone === customer.phone);
        const totalSpent = orders.reduce((sum, o) => sum + (o.total || 0), 0);

        // Show detail modal or navigate
        alert(`عميل: ${customer.name}\nهاتف: ${customer.phone}\nعدد الطلبات: ${orders.length}\nإجمالي المشتريات: ${Utils.formatCurrency(totalSpent)}`);
    },

    editCustomer(id) { this.openCreateModal(id); },
    
    deleteCustomer(id) {
        if (!confirm('حذف هذا العميل؟')) return;
        let customers = Utils.storage.get('customers', []).filter(c => c.id !== id);
        Utils.storage.set('customers', customers);
        Toast.success('تم حذف العميل');
        navigateTo('customers');
    },

    setView(view) { this.currentView = view; navigateTo('customers'); },
    filterByType(type) { /* implement */ },
    search(q) { this.searchQuery = q; navigateTo('customers'); },
    getTypeText(type) { const map = { regular: 'عادي', new: 'جديد', active: 'نشط', vip: 'VIP' }; return map[type] || '-'; }
};

window.Customers = Customers;

const customersStyles = `.customers-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:20px;}`;
if (!document.getElementById('customers-styles')) {
    const s = document.createElement('style'); s.id = 'customers-styles'; s.textContent = customersStyles;
    document.head.appendChild(s);
}
