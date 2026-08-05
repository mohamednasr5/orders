import { t } from '../core/i18n.js';
import { db, ref, onValue, set, push, remove } from '../core/firebase-config.js';
import { showToast } from '../components/ui.js';

let currentOrders = [];

export function renderOrders(container) {
    container.innerHTML = `
        <div class="view-content">
            <div class="table-container">
                <div class="table-header-actions">
                    <h2><i class='bx bx-cart'></i> ${t('orders')}</h2>
                    <div style="display:flex;gap:10px;align-items:center;">
                        <div class="table-filters">
                            <select class="filter-select" id="order-status-filter" onchange="filterOrders()">
                                <option value="">${t('allAll')}</option>
                                <option value="pending">${t('status_pending')}</option>
                                <option value="processing">${t('status_processing')}</option>
                                <option value="shipped">${t('status_shipped')}</option>
                                <option value="delivered">${t('status_delivered')}</option>
                                <option value="cancelled">${t('status_cancelled')}</option>
                            </select>
                        </div>
                        <button class="btn-primary" onclick="openOrderModal()">
                            <i class='bx bx-plus'></i> ${t('newOrder')}
                        </button>
                    </div>
                </div>
                
                <!-- Search Bar -->
                <div style="padding: 15px 22px; border-bottom: 1px solid var(--border-color);">
                    <input type="text" class="filter-input" style="width:100%;max-width:350px;" 
                           placeholder="${t('searchPlaceholder')}" id="orders-search" oninput="filterOrders()">
                </div>

                <table>
                    <thead>
                        <tr>
                            <th>${t('orderId')}</th>
                            <th>${t('customer')}</th>
                            <th>${t('amount')}</th>
                            <th>${t('status')}</th>
                            <th>${t('date')}</th>
                            <th>${t('action')}</th>
                        </tr>
                    </thead>
                    <tbody id="orders-page-body">
                        <tr>
                            <td colspan="6" style="text-align:center;padding:40px;">
                                <div class="spinner"></div>
                            </td>
                        </tr>
                    </tbody>
                </table>

                <!-- Pagination -->
                <div class="pagination" id="orders-pagination"></div>
            </div>
        </div>
    `;

    // Fetch orders from Firebase
    const ordersRef = ref(db, 'orders');
    onValue(ordersRef, (snapshot) => {
        const data = snapshot.val();
        if(data) {
            currentOrders = Object.values(data).sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
            renderOrdersTable(currentOrders);
        } else {
            currentOrders = [];
            document.getElementById('orders-page-body').innerHTML = `
                <tr>
                    <td colspan="6">
                        <div class="empty-state">
                            <i class='bx bx-cart-alt'></i>
                            <h3>${t('noData')}</h3>
                            <p>ابدأ بإنشاء طلبك الأول</p>
                        </div>
                    </td>
                </tr>`;
        }
    });
}

function renderOrdersTable(orders) {
    const tbody = document.getElementById('orders-page-body');
    
    if(orders.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><p>${t('noData')}</p></div></td></tr>`;
        return;
    }
    
    tbody.innerHTML = orders.map(order => `
        <tr>
            <td>
                <span style="font-weight: 600; color: var(--primary); background: var(--primary-light); padding: 4px 10px; border-radius: 6px;">
                    ${order.id}
                </span>
            </td>
            <td>
                <div style="display:flex;align-items:center;gap:10px;">
                    <img src="${order.customerAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(order.customer)}&background=2563eb&color=fff`}" 
                         class="avatar avatar-sm" alt="">
                    <div>
                        <div style="font-weight:500;">${order.customer}</div>
                        <div style="font-size:12px;color:var(--text-secondary);">${order.customerEmail || ''}</div>
                    </div>
                </div>
            </td>
            <td style="font-weight:600;">${Number(order.amount).toLocaleString()} ${t('currency')}</td>
            <td>
                <select class="filter-select status-select" data-order-id="${order.id}" onchange="updateOrderStatus(this)">
                    <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>${t('status_pending')}</option>
                    <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>${t('status_processing')}</option>
                    <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>${t('status_shipped')}</option>
                    <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>${t('status_delivered')}</option>
                    <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>${t('status_cancelled')}</option>
                </select>
            </td>
            <td style="color:var(--text-secondary);font-size:13px;">${order.date || '-'}</td>
            <td>
                <div class="action-btns">
                    <button class="icon-btn view" title="${t('viewDetails')}" onclick="viewOrder('${order.id}')">
                        <i class='bx bx-show'></i>
                    </button>
                    <button class="icon-btn edit" title="${t('edit')}" onclick="openOrderModal('${order.id}')">
                        <i class='bx bx-edit'></i>
                    </button>
                    <button class="icon-btn delete" title="${t('delete')}" onclick="deleteOrder('${order.id}')">
                        <i class='bx bx-trash'></i>
                    </button>
                    <button class="icon-btn" title="Print" onclick="printOrder('${order.id}')">
                        <i class='bx bx-printer'></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Global functions for order management
window.filterOrders = function() {
    const statusFilter = document.getElementById('order-status-filter').value;
    const searchTerm = document.getElementById('orders-search').value.toLowerCase();
    
    let filtered = currentOrders;
    
    if(statusFilter) {
        filtered = filtered.filter(o => o.status === statusFilter);
    }
    
    if(searchTerm) {
        filtered = filtered.filter(o => 
            o.id.toLowerCase().includes(searchTerm) || 
            o.customer.toLowerCase().includes(searchTerm)
        );
    }
    
    renderOrdersTable(filtered);
};

window.updateOrderStatus = function(selectElement) {
    const orderId = selectElement.dataset.orderId;
    const newStatus = selectElement.value;
    
    // Find the order in currentOrders
    const order = currentOrders.find(o => o.id === orderId);
    if(order) {
        const orderRef = ref(db, `orders/${Object.keys(currentOrders.find(o => o.id === orderId) || {})[0] || orderId}`);
        
        // Find the actual key
        const ordersRef = ref(db, 'orders');
        get(ordersRef).then(snapshot => {
            const data = snapshot.val();
            if(data) {
                const key = Object.keys(data).find(k => data[k].id === orderId);
                if(key) {
                    set(ref(db, `orders/${key}/status`), newStatus);
                    showToast(`تم تحديث حالة الطلب ${orderId}`, 'success');
                }
            }
        });
    }
};

window.openOrderModal = function(orderId = null) {
    const isEdit = !!orderId;
    let order = null;
    
    if(isEdit) {
        order = currentOrders.find(o => o.id === orderId);
    }
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal" style="max-width:650px;">
            <div class="modal-header">
                <h3><i class='bx ${isEdit ? 'bx-edit' : 'bx-plus-circle'}'></i> ${isEdit ? t('edit') + ' ' + t('orders') : t('newOrder')}</h3>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
                    <i class='bx bx-x'></i>
                </button>
            </div>
            <div class="modal-body">
                <form id="order-form">
                    <div class="form-row">
                        <div class="form-group">
                            <label>${t('customer')} *</label>
                            <input type="text" class="form-control" name="customer" required 
                                   value="${order?.customer || ''}" placeholder="اسم العميل">
                        </div>
                        <div class="form-group">
                            <label>${t('email')}</label>
                            <input type="email" class="form-control" name="email" 
                                   value="${order?.customerEmail || ''}" placeholder="example@email.com">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>${t('phone')}</label>
                            <input type="tel" class="form-control" name="phone" 
                                   value="${order?.phone || ''}" placeholder="01012345678">
                        </div>
                        <div class="form-group">
                            <label>${t('amount')} *</label>
                            <input type="number" class="form-control" name="amount" required 
                                   value="${order?.amount || ''}" placeholder="0.00">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>${t('status')}</label>
                            <select class="form-control" name="status">
                                <option value="pending" ${(!order || order.status === 'pending') ? 'selected' : ''}>${t('status_pending')}</option>
                                <option value="processing" ${order?.status === 'processing' ? 'selected' : ''}>${t('status_processing')}</option>
                                <option value="shipped" ${order?.status === 'shipped' ? 'selected' : ''}>${t('status_shipped')}</option>
                                <option value="delivered" ${order?.status === 'delivered' ? 'selected' : ''}>${t('status_delivered')}</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>${t('date')}</label>
                            <input type="date" class="form-control" name="date" 
                                   value="${order?.date || new Date().toISOString().split('T')[0]}">
                        </div>
                    </div>
                    <div class="form-group">
                        <label>${t('notes')}</label>
                        <textarea class="form-control" name="notes" rows="3" 
                                  placeholder="ملاحظات إضافية...">${order?.notes || ''}</textarea>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button class="btn-primary btn-outline btn-sm" onclick="this.closest('.modal-overlay').remove()">${t('cancel')}</button>
                <button class="btn-primary btn-sm" onclick="saveOrder('${orderId || ''}')">
                    <i class='bx bx-save'></i> ${t('save')}
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
};

window.saveOrder = function(orderId) {
    const form = document.getElementById('order-form');
    const formData = new FormData(form);
    
    const orderData = {
        id: orderId || `#ORD-${Date.now().toString(-8).slice(-6)}`,
        customer: formData.get('customer'),
        customerEmail: formData.get('email'),
        phone: formData.get('phone'),
        amount: Number(formData.get('amount')),
        status: formData.get('status'),
        date: formData.get('date') || new Date().toISOString().split('T')[0],
        notes: formData.get('notes'),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    if(orderId) {
        // Update existing
        const ordersRef = ref(db, 'orders');
        get(ordersRef).then(snapshot => {
            const data = snapshot.val();
            if(data) {
                const key = Object.keys(data).find(k => data[k].id === orderId);
                if(key) {
                    set(ref(db, `orders/${key}`), orderData).then(() => {
                        showToast('تم تحديث الطلب بنجاح', 'success');
                        document.querySelector('.modal-overlay')?.remove();
                    });
                }
            }
        });
    } else {
        // Create new
        push(ref(db, 'orders'), orderData).then(() => {
            showToast('تم إنشاء الطلب بنجاح', 'success');
            document.querySelector('.modal-overlay')?.remove();
        });
    }
};

window.viewOrder = function(orderId) {
    const order = currentOrders.find(o => o.id === orderId);
    if(!order) return;
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal" style="max-width:600px;">
            <div class="modal-header">
                <h3><i class='bx bx-receipt'></i> ${t('orderDetails')}</h3>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
                    <i class='bx bx-x'></i>
                </button>
            </div>
            <div class="modal-body">
                <div style="text-align:center;margin-bottom:20px;">
                    <span style="font-size:24px;font-weight:700;color:var(--primary);">${order.id}</span>
                    <span class="status-badge status-${order.status}" style="margin-right:10px;">${t('status_'+order.status)}</span>
                </div>
                
                <div style="background:var(--bg-main);padding:18px;border-radius:var(--radius-md);margin-bottom:15px;">
                    <h4 style="margin-bottom:12px;color:var(--text-secondary);font-size:13px;">معلومات العميل</h4>
                    <div style="display:flex;align-items:center;gap:12px;">
                        <img src="${order.customerAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(order.customer)}&background=2563eb&color=fff&size=64`}" 
                             class="avatar-lg" alt="">
                        <div>
                            <div style="font-weight:600;font-size:16px;">${order.customer}</div>
                            <div style="color:var(--text-secondary);font-size:13px;">${order.customerEmail || '-'}</div>
                            <div style="color:var(--text-secondary);font-size:13px;">${order.phone || '-'}</div>
                        </div>
                    </div>
                </div>
                
                <div style="background:var(--bg-main);padding:18px;border-radius:var(--radius-md);">
                    <h4 style="margin-bottom:12px;color:var(--text-secondary);font-size:13px;">تفاصيل الدفع</h4>
                    <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
                        <span>${t('subtotal')}</span>
                        <span style="font-weight:600;">${Number(order.amount).toLocaleString()} ${t('currency')}</span>
                    </div>
                    <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
                        <span>${t('shipping')}</span>
                        <span style="font-weight:600;">50 ${t('currency')}</span>
                    </div>
                    <hr style="border-color:var(--border-color);margin:10px 0;">
                    <div style="display:flex;justify-content:space-between;font-size:16px;">
                        <span style="font-weight:700;">${t('total')}</span>
                        <span style="font-weight:700;color:var(--primary);">${(Number(order.amount) + 50).toLocaleString()} ${t('currency')}</span>
                    </div>
                </div>
                
                ${order.notes ? `
                <div style="margin-top:15px;padding:12px;background:var(--warning-light);border-radius:var(--radius-md);">
                    <strong>${t('notes')}:</strong> ${order.notes}
                </div>` : ''}
            </div>
            <div class="modal-footer">
                <button class="btn-outline btn-sm" onclick="this.closest('.modal-overlay').remove()">${t('close')}</button>
                <button class="btn-primary btn-sm" onclick="printOrder('${orderId}');this.closest('.modal-overlay').remove();">
                    <i class='bx bx-printer'></i> ${t('print')}
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
};

window.deleteOrder = function(orderId) {
    if(confirm(t('deleteConfirm'))) {
        const ordersRef = ref(db, 'orders');
        get(ordersRef).then(snapshot => {
            const data = snapshot.val();
            if(data) {
                const key = Object.keys(data).find(k => data[k].id === orderId);
                if(key) {
                    remove(ref(db, `orders/${key}`)).then(() => {
                        showToast('تم حذف الطلب', 'success');
                    });
                }
            }
        });
    }
};

window.printOrder = function(orderId) {
    const order = currentOrders.find(o => o.id === orderId);
    if(!order) return;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html dir="rtl">
        <head>
            <title>Invoice - ${order.id}</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
                .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #2563eb; padding-bottom: 20px; }
                .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; }
                .info-box { background: #f8fafc; padding: 15px; border-radius: 8px; }
                table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                th, td { padding: 12px; text-align: right; border-bottom: 1px solid #e2e8f0; }
                th { background: #2563eb; color: white; }
                .total { font-size: 20px; font-weight: bold; color: #2563eb; text-align: left; margin-top: 20px; }
                @media print { body { padding: 0; } }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>SaaS OMS</h1>
                <h2>Invoice ${order.id}</h2>
            </div>
            <div class="info-grid">
                <div class="info-box">
                    <strong>Customer:</strong><br>${order.customer}<br>${order.email || '-'}
                </div>
                <div class="info-box" style="text-align:left;">
                    <strong>Date:</strong><br>${order.date || '-'}<br>Status: ${t('status_' + order.status)}
                </div>
            </div>
            <table>
                <thead><tr><th>Description</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead>
                <tbody>
                    <tr><td>Products/Services</td><td>1</td><td>${Number(order.amount).toLocaleString()}</td><td>${Number(order.amount).toLocaleString()}</td></tr>
                </tbody>
            </table>
            <div class="total">Total: ${(Number(order.amount) + 50).toLocaleString()} EGP</div>
        </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
};
