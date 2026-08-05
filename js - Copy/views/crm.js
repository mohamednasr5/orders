import { t } from '../core/i18n.js';
import { db, ref, onValue, set, push, remove, get } from '../core/firebase-config.js';
import { showToast } from '../components/ui.js';

let currentCustomers = [];

export function renderCRM(container) {
    container.innerHTML = `
        <div class="view-content">
            <!-- Customer Stats -->
            <div class="stats-row" id="crm-stats">
                <div class="stat-item">
                    <div class="stat-value" id="stat-total-customers">0</div>
                    <div class="stat-label">إجمالي العملاء</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value" style="color:var(--success);" id="stat-active-customers">0</div>
                    <div class="stat-label">عملاء نشطون</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value" style="color:var(--primary);" id="stat-total-revenue">0</div>
                    <div class="stat-label">${t('totalSales')}</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value" style="color:var(--warning);" id="stat-avg-order">0</div>
                    <div class="stat-label">متوسط الطلب</div>
                </div>
            </div>

            <!-- Main Content -->
            <div class="table-container">
                <div class="table-header-actions">
                    <h2><i class='bx bx-user-pin'></i> ${t('crm')}</h2>
                    <div style="display:flex;gap:10px;align-items:center;">
                        <input type="text" class="filter-input" placeholder="${t('searchPlaceholder')}..." 
                               id="crm-search" oninput="filterCustomers()" style="width:220px;">
                        <button class="btn-primary" onclick="openCustomerModal()">
                            <i class='bx bx-plus'></i> ${t('addCustomer')}
                        </button>
                    </div>
                </div>

                <!-- Customers Table -->
                <table>
                    <thead>
                        <tr>
                            <th>العميل</th>
                            <th>${t('email')}</th>
                            <th>${t('phone')}</th>
                            <th>${t('company')}</th>
                            <th>${t('totalOrders')}</th>
                            <th>${t('totalSpent')}</th>
                            <th>${t('action')}</th>
                        </tr>
                    </thead>
                    <tbody id="crm-body">
                        <tr>
                            <td colspan="7" style="text-align:center;padding:40px;">
                                <div class="spinner"></div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- Top Customers -->
            <div class="chart-card" style="margin-top:20px;">
                <h3><i class='bx bx-trophy'></i> أفضل العملاء</h3>
                <div id="top-customers-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:15px;margin-top:15px;"></div>
            </div>
        </div>
    `;

    // Fetch customers
    const crmRef = ref(db, 'crm');
    onValue(crmRef, (snapshot) => {
        const data = snapshot.val();
        if(data) {
            currentCustomers = Object.entries(data).map(([key, val]) => ({...val, _key: key}));
            updateCRMStats(currentCustomers);
            renderCustomersTable(currentCustomers);
            renderTopCustomers(currentCustomers);
        } else {
            currentCustomers = [];
            document.getElementById('crm-body').innerHTML = `
                <tr>
                    <td colspan="7">
                        <div class="empty-state">
                            <i class='bx bx-user-x'></i>
                            <h3>${t('noCustomers')}</h3>
                            <p>ابدأ بإضافة عملائك الأولين</p>
                            <button class="btn-primary" onclick="openCustomerModal()" style="margin-top:15px;">
                                <i class='bx bx-plus'></i> ${t('addCustomer')}
                            </button>
                        </div>
                    </td>
                </tr>`;
        }
    });
}

function updateCRMStats(customers) {
    document.getElementById('stat-total-customers').innerText = customers.length;
    
    // Calculate total revenue and orders
    let totalRevenue = 0;
    let totalOrders = 0;
    
    customers.forEach(c => {
        totalRevenue += c.totalSpent || 0;
        totalOrders += c.totalOrders || 1;
    });
    
    document.getElementById('stat-total-revenue').innerText = totalRevenue.toLocaleString() + ' ' + t('currency');
    document.getElementById('stat-avg-order').innerText = customers.length > 0 ? Math.round(totalRevenue / totalOrders).toLocaleString() : '0';
    
    // Active customers (with orders in last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const activeCount = customers.filter(c => new Date(c.lastOrderDate || c.createdAt || 0) > thirtyDaysAgo).length;
    document.getElementById('stat-active-customers').innerText = activeCount;
}

function renderCustomersTable(customers) {
    const tbody = document.getElementById('crm-body');
    
    tbody.innerHTML = customers.map(customer => `
        <tr>
            <td>
                <div style="display:flex;align-items:center;gap:12px;">
                    <img src="${customer.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(customer.name)}&background=2563eb&color=fff`}" 
                         class="avatar" alt="" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(customer.name)}'">
                    <div>
                        <div style="font-weight:600;">${customer.name}</div>
                        <small style="color:var(--text-secondary);">منذ ${getTimeAgo(customer.createdAt)}</small>
                    </div>
                </div>
            </td>
            <td>
                <a href="mailto:${customer.email}" style="color:var(--primary);text-decoration:none;">
                    ${customer.email || '-'}
                </a>
            </td>
            <td dir="ltr" style="text-align:right;">${customer.phone || '-'}</td>
            <td>${customer.company || '-'}</td>
            <td><span class="badge badge-primary">${customer.totalOrders || 1}</span></td>
            <td style="font-weight:600;color:var(--success);">${(customer.totalSpent || 0).toLocaleString()} ${t('currency')}</td>
            <td>
                <div class="action-btns">
                    <button class="icon-btn view" title="${t('viewDetails')}" onclick="viewCustomer('${customer._key}')">
                        <i class='bx bx-show'></i>
                    </button>
                    <button class="icon-btn edit" title="${t('edit')}" onclick="openCustomerModal('${customer._key}')">
                        <i class='bx bx-edit'></i>
                    </button>
                    <button class="icon-btn delete" title="${t('delete')}" onclick="deleteCustomer('${customer._key}')">
                        <i class='bx bx-trash'></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function renderTopCustomers(customers) {
    const grid = document.getElementById('top-customers-grid');
    const topCustomers = [...customers]
        .sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0))
        .slice(0, 4);
    
    grid.innerHTML = topCustomers.map((c, index) => `
        <div style="background:var(--bg-main);padding:16px;border-radius:var(--radius-md);display:flex;align-items:center;gap:12px;">
            <div style="width:36px;height:36px;background:${index === 0 ? '#fbbf24' : index === 1 ? '#94a3b8' : index === 2 ? '#cd7c32' : 'var(--border-color)'};border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;color:white;">
                ${index + 1}
            </div>
            <img src="${c.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.name)}&background=2563eb&color=fff`}" 
                 class="avatar avatar-sm" alt="">
            <div style="flex:1;min-width:0;">
                <div style="font-weight:600;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${c.name}</div>
                <div style="font-size:12px;color:var(--success);font-weight:600;">${(c.totalSpent || 0).toLocaleString()} ${t('currency')}</div>
            </div>
        </div>
    `).join('');
}

// Helper function
function getTimeAgo(dateString) {
    if(!dateString) return 'فترة طويلة';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if(diffDays === 0) return 'اليوم';
    if(diffDays === 1) return 'أمس';
    if(diffDays < 30) return `منذ ${diffDays} يوم`;
    if(diffDays < 365) return `منذ ${Math.floor(diffDays / 30)} شهر`;
    return `منذ ${Math.floor(diffDays / 365)} سنة`;
}

// Global functions
window.filterCustomers = function() {
    const searchTerm = document.getElementById('crm-search').value.toLowerCase();
    
    if(!searchTerm) {
        renderCustomersTable(currentCustomers);
        return;
    }
    
    const filtered = currentCustomers.filter(c =>
        c.name.toLowerCase().includes(searchTerm) ||
        (c.email && c.email.toLowerCase().includes(searchTerm)) ||
        (c.phone && c.phone.includes(searchTerm)) ||
        (c.company && c.company.toLowerCase().includes(searchTerm))
    );
    
    renderCustomersTable(filtered);
};

window.openCustomerModal = function(customerKey = null) {
    const isEdit = !!customerKey;
    let customer = null;
    
    if(isEdit) {
        customer = currentCustomers.find(c => c._key === customerKey);
    }
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal" style="max-width:550px;">
            <div class="modal-header">
                <h3><i class='bx ${isEdit ? 'bx-edit' : 'bx-user-plus'}'></i> ${isEdit ? t('edit') + ' عميل' : t('addCustomer')}</h3>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
                    <i class='bx bx-x'></i>
                </button>
            </div>
            <div class="modal-body">
                <form id="customer-form">
                    <div class="form-group">
                        <label>${t('customer')} *</label>
                        <input type="text" class="form-control" name="name" required 
                               value="${customer?.name || ''}" placeholder="اسم العميل الكامل">
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>${t('email')} *</label>
                            <input type="email" class="form-control" name="email" required 
                                   value="${customer?.email || ''}" placeholder="example@email.com">
                        </div>
                        <div class="form-group">
                            <label>${t('phone')}</label>
                            <input type="tel" class="form-control" name="phone" 
                                   value="${customer?.phone || ''}" placeholder="01012345678">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>${t('company')}</label>
                            <input type="text" class="form-control" name="company" 
                                   value="${customer?.company || ''}" placeholder="اسم الشركة">
                        </div>
                        <div class="form-group">
                            <label>${t('address')}</label>
                            <input type="text" class="form-control" name="address" 
                                   value="${customer?.address || ''}" placeholder="العنوان الكامل">
                        </div>
                    </div>
                    <div class="form-group">
                        <label>ملاحظات إضافية</label>
                        <textarea class="form-control" name="notes" rows="3" 
                                  placeholder="ملاحظات عن العميل...">${customer?.notes || ''}</textarea>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button class="btn-outline btn-sm" onclick="this.closest('.modal-overlay').remove()">${t('cancel')}</button>
                <button class="btn-primary btn-sm" onclick="saveCustomer('${customerKey || ''}')">
                    <i class='bx bx-save'></i> ${t('save')}
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
};

window.saveCustomer = function(customerKey) {
    const form = document.getElementById('customer-form');
    const formData = new FormData(form);
    
    const customerData = {
        name: formData.get('name'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        company: formData.get('company'),
        address: formData.get('address'),
        notes: formData.get('notes'),
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.get('name'))}&background=2563eb&color=fff`,
        updatedAt: new Date().toISOString()
    };
    
    if(!customerData.name || !customerData.email) {
        showToast('يرجى ملء الحقول المطلوبة', 'error');
        return;
    }
    
    if(customerKey) {
        set(ref(db, `crm/${customerKey}`), customerData).then(() => {
            showToast('تم تحديث بيانات العميل', 'success');
            document.querySelector('.modal-overlay')?.remove();
        });
    } else {
        customerData.createdAt = new Date().toISOString();
        customerData.totalOrders = 1;
        customerData.totalSpent = 0;
        
        push(ref(db, 'crm'), customerData).then(() => {
            showToast('تم إضافة العميل بنجاح', 'success');
            document.querySelector('.modal-overlay')?.remove();
        });
    }
};

window.viewCustomer = function(customerKey) {
    const customer = currentCustomers.find(c => c._key === customerKey);
    if(!customer) return;
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal" style="max-width:500px;">
            <div class="modal-header">
                <h3><i class='bx bx-user'></i> تفاصيل العميل</h3>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
                    <i class='bx bx-x'></i>
                </button>
            </div>
            <div class="modal-body">
                <div style="text-align:center;margin-bottom:24px;">
                    <img src="${customer.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(customer.name)}&background=2563eb&color=fff&size=96`}" 
                         style="width:80px;height:80px;border-radius:50%;border:3px solid var(--primary);">
                    <h3 style="margin-top:12px;">${customer.name}</h3>
                    ${customer.company ? `<p style="color:var(--text-secondary);">${customer.company}</p>` : ''}
                </div>
                
                <div style="background:var(--bg-main);padding:18px;border-radius:var(--radius-md);margin-bottom:15px;">
                    <h4 style="margin-bottom:12px;font-size:13px;color:var(--text-secondary);">معلومات الاتصال</h4>
                    <div style="display:flex;flex-direction:column;gap:10px;">
                        <div style="display:flex;justify-content:space-between;">
                            <span style="color:var(--text-secondary);"><i class='bx bx-envelope'></i> ${t('email')}</span>
                            <span>${customer.email || '-'}</span>
                        </div>
                        <div style="display:flex;justify-content:space-between;">
                            <span style="color:var(--text-secondary);"><i class='bx bx-phone'></i> ${t('phone')}</span>
                            <span dir="ltr">${customer.phone || '-'}</span>
                        </div>
                        ${customer.address ? `
                        <div style="display:flex;justify-content:space-between;">
                            <span style="color:var(--text-secondary);"><i class='bx bx-map'></i> ${t('address')}</span>
                            <span>${customer.address}</span>
                        </div>` : ''}
                    </div>
                </div>
                
                <div style="background:var(--bg-main);padding:18px;border-radius:var(--radius-md);">
                    <h4 style="margin-bottom:12px;font-size:13px;color:var(--text-secondary);">إحصائيات</h4>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:15px;">
                        <div style="text-align:center;padding:12px;background:var(--bg-surface);border-radius:8px;">
                            <div style="font-size:22px;font-weight:700;color:var(--primary);">${customer.totalOrders || 1}</div>
                            <div style="font-size:12px;color:var(--text-secondary);">${t('totalOrders')}</div>
                        </div>
                        <div style="text-align:center;padding:12px;background:var(--bg-surface);border-radius:8px;">
                            <div style="font-size:22px;font-weight:700;color:var(--success);">${(customer.totalSpent || 0).toLocaleString()}</div>
                            <div style="font-size:12px;color:var(--text-secondary);">${t('totalSpent')} (${t('currency')})</div>
                        </div>
                    </div>
                </div>
                
                ${customer.notes ? `
                <div style="margin-top:15px;padding:12px;background:var(--info-light);border-radius:var(--radius-md);font-size:14px;">
                    <strong>ملاحظات:</strong> ${customer.notes}
                </div>` : ''}
            </div>
            <div class="modal-footer">
                <button class="btn-outline btn-sm" onclick="this.closest('.modal-overlay').remove()">${t('close')}</button>
                <button class="btn-primary btn-sm" onclick="this.closest('.modal-overlay').remove();openCustomerModal('${customerKey}');">
                    <i class='bx bx-edit'></i> ${t('edit')}
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
};

window.deleteCustomer = function(customerKey) {
    if(confirm(t('deleteConfirm'))) {
        remove(ref(db, `crm/${customerKey}`)).then(() => {
            showToast('تم حذف العميل', 'success');
        });
    }
};
