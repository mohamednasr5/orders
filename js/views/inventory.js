import { t } from '../core/i18n.js';
import { db, ref, onValue, set, push, get } from '../core/firebase-config.js';
import { showToast } from '../components/ui.js';

let currentInventory = [];

export function renderInventory(container) {
    container.innerHTML = `
        <div class="view-content">
            <!-- Stats Summary -->
            <div class="stats-row" id="inventory-stats">
                <div class="stat-item">
                    <div class="stat-value" id="stat-total-products">0</div>
                    <div class="stat-label">${t('products')}</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value" style="color:var(--success);" id="stat-in-stock">0</div>
                    <div class="stat-label">${t('inStock')}</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value" style="color:var(--warning);" id="stat-low-stock">0</div>
                    <div class="stat-label">${t('lowStock')}</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value" style="color:var(--danger);" id="stat-out-of-stock">0</div>
                    <div class="stat-label">${t('outOfStock')}</div>
                </div>
            </div>

            <!-- Tabs -->
            <div class="tabs">
                <button class="tab-btn active" onclick="switchInventoryTab(this, 'overview')">نظرة عامة</button>
                <button class="tab-btn" onclick="switchInventoryTab(this, 'movements')">حركة المخزون</button>
                <button class="tab-btn" onclick="switchInventoryTab(this, 'alerts')">تنبيهات</button>
            </div>

            <!-- Overview Tab -->
            <div id="tab-overview" class="inventory-tab-content">
                <div class="table-container">
                    <div class="table-header-actions">
                        <h2><i class='bx bx-package'></i> ${t('inventory')} - ${t('allAll')} المنتجات</h2>
                        <div style="display:flex;gap:10px;align-items:center;">
                            <select class="filter-select" id="stock-filter" onchange="filterInventory()">
                                <option value="">${t('allAll')}</option>
                                <option value="in-stock">${t('inStock')}</option>
                                <option value="low-stock">${t('lowStock')}</option>
                                <option value="out-of-stock">${t('outOfStock')}</option>
                            </select>
                            <button class="btn-primary btn-sm" onclick="openStockAdjustmentModal()">
                                <i class='bx bx-transfer'></i> تعديل المخزون
                            </button>
                        </div>
                    </div>

                    <!-- Inventory Grid -->
                    <div class="inventory-grid" id="inventory-grid" style="padding: 20px;">
                        <div style="grid-column:1/-1;text-align:center;padding:40px;">
                            <div class="spinner"></div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Movements Tab -->
            <div id="tab-movements" class="inventory-tab-content" style="display:none;">
                <div class="table-container">
                    <div class="table-header-actions">
                        <h2><i class='bx bx-transfer'></i> حركة المخزون</h2>
                        <button class="btn-primary btn-sm" onclick="openMovementModal()">
                            <i class='bx bx-plus'></i> تسجيل حركة
                        </button>
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th>${t('date')}</th>
                                <th>${t('productName')}</th>
                                <th>النوع</th>
                                <th>الكمية</th>
                                <th>الرصيد بعد</th>
                                <th>ملاحظات</th>
                            </tr>
                        </thead>
                        <tbody id="movements-body">
                            <tr><td colspan="6" style="text-align:center;padding:30px;color:var(--text-secondary);">لا توجد حركات مسجلة</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Alerts Tab -->
            <div id="tab-alerts" class="inventory-tab-content" style="display:none;">
                <div class="chart-card">
                    <h3><i class='bx bx-bell'></i> تنبيهات المخزون</h3>
                    <div id="alerts-list"></div>
                </div>
            </div>
        </div>
    `;

    // Fetch inventory data
    fetchInventoryData();
}

function fetchInventoryData() {
    const productsRef = ref(db, 'products');
    onValue(productsRef, (snapshot) => {
        const data = snapshot.val();
        if(data) {
            currentInventory = Object.entries(data).map(([key, val]) => ({...val, _key: key}));
            updateStats();
            renderInventoryGrid(currentInventory);
            generateAlerts(currentInventory);
        } else {
            currentInventory = [];
            document.getElementById('inventory-grid').innerHTML = `
                <div class="empty-state" style="grid-column:1/-1;">
                    <i class='bx bx-package'></i>
                    <h3>${t('noInventory')}</h3>
                    <p>لم يتم العثور على بيانات مخزونية</p>
                </div>`;
        }
    });

    // Fetch movements
    const movementsRef = ref(db, 'movements');
    onValue(movementsRef, (snapshot) => {
        const data = snapshot.val();
        if(data) {
            renderMovements(Object.values(data).sort((a,b) => new Date(b.date) - new Date(a.date)));
        }
    });
}

function updateStats() {
    const total = currentInventory.length;
    const inStock = currentInventory.filter(p => p.stock > 10).length;
    const lowStock = currentInventory.filter(p => p.stock > 0 && p.stock <= 10).length;
    const outOfStock = currentInventory.filter(p => p.stock === 0).length;

    document.getElementById('stat-total-products').innerText = total;
    document.getElementById('stat-in-stock').innerText = inStock;
    document.getElementById('stat-low-stock').innerText = lowStock;
    document.getElementById('stat-out-of-stock').innerText = outOfStock;
}

function renderInventoryGrid(products) {
    const grid = document.getElementById('inventory-grid');
    
    grid.innerHTML = products.map(product => {
        const stockPercent = Math.min((product.stock / 100) * 100, 100);
        const stockColor = product.stock === 0 ? 'var(--danger)' : 
                          product.stock <= 10 ? 'var(--warning)' : 'var(--success)';
        
        return `
        <div class="inventory-card ${product.stock <= 10 ? 'low-stock' : ''} ${product.stock === 0 ? 'out-of-stock' : ''}">
            <div class="inventory-card-header">
                <div>
                    <div class="inventory-card-title">${product.name}</div>
                    <div class="inventory-card-sku">SKU: ${product.sku || '-'}</div>
                </div>
                <span class="badge badge-${product.stock <= 5 ? 'danger' : product.stock <= 10 ? 'warning' : 'success'}">
                    ${product.stock} قطعة
                </span>
            </div>
            
            <div style="margin:15px 0;">
                <div style="display:flex;justify-content:space-between;margin-bottom:6px;font-size:12px;">
                    <span>المستوى</span>
                    <span style="font-weight:600;">${Math.round(stockPercent)}%</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width:${stockPercent}%;background:${stockColor};"></div>
                </div>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:15px;">
                <div style="background:var(--bg-main);padding:10px;border-radius:8px;text-align:center;">
                    <div style="font-size:11px;color:var(--text-secondary);">السعر</div>
                    <div style="font-weight:700;color:var(--primary);">${Number(product.price || 0).toLocaleString()}</div>
                </div>
                <div style="background:var(--bg-main);padding:10px;border-radius:8px;text-align:center;">
                    <div style="font-size:11px;color:var(--text-secondary);">القيمة</div>
                    <div style="font-weight:700;color:var(--success);">${(Number(product.price || 0) * product.stock).toLocaleString()}</div>
                </div>
            </div>

            <div style="margin-top:12px;display:flex;gap:8px;">
                <button class="btn-primary btn-sm" style="flex:1;" onclick="quickAdjustStock('${product._key}', 'add')">
                    <i class='bx bx-plus'></i> إضافة
                </button>
                <button class="btn-warning btn-sm" style="flex:1;background:var(--warning);color:#333;border:none;padding:8px;border-radius:6px;cursor:pointer;" onclick="quickAdjustStock('${product._key}', 'subtract')">
                    <i class='bx bx-minus'></i> خصم
                </button>
            </div>
        </div>
    `}).join('');
}

function renderMovements(movements) {
    const tbody = document.getElementById('movements-body');
    
    if(movements.length === 0) return;
    
    tbody.innerHTML = movements.slice(0, 50).map(m => `
        <tr>
            <td style="font-size:13px;">${m.date}</td>
            <td style="font-weight:500;">${m.productName}</td>
            <td>
                <span class="badge badge-${m.type === 'in' ? 'success' : 'danger'}">
                    ${m.type === 'in' ? t('in') : t('out')}
                </span>
            </td>
            <td style="font-weight:600;">${m.type === 'in' ? '+' : '-'}${m.quantity}</td>
            <td>${m.balanceAfter}</td>
            <td style="color:var(--text-secondary);font-size:13px;">${m.notes || '-'}</td>
        </tr>
    `).join('');
}

function generateAlerts(products) {
    const alertsList = document.getElementById('alerts-list');
    const alerts = [];
    
    // Out of stock
    products.filter(p => p.stock === 0).forEach(p => {
        alerts.push({
            type: 'danger',
            icon: 'bx-x-circle',
            title: `${t('outOfStock')}: ${p.name}`,
            message: 'هذا المنتج نفد من المخزون بالكامل'
        });
    });
    
    // Low stock
    products.filter(p => p.stock > 0 && p.stock <= 10).forEach(p => {
        alerts.push({
            type: 'warning',
            icon: 'bx-error',
            title: `${t('lowStock')}: ${p.name}`,
            message: `المتبقي: ${p.stock} قطعة فقط`
        });
    });
    
    if(alerts.length === 0) {
        alertsList.innerHTML = `
            <div style="text-align:center;padding:40px;color:var(--success);">
                <i class='bx bx-check-circle' style="font-size:48px;"></i>
                <p style="margin-top:10px;">جميع المخزون في مستوى جيد!</p>
            </div>`;
        return;
    }
    
    alertsList.innerHTML = alerts.map(alert => `
        <div style="display:flex;align-items:start;gap:12px;padding:14px;margin-bottom:10px;background:${alert.type === 'danger' ? 'var(--danger-light)' : 'var(--warning-light)'};border-radius:var(--radius-md);">
            <i class='bx ${alert.icon}' style="font-size:24px;color:var(--${alert.type});"></i>
            <div>
                <div style="font-weight:600;">${alert.title}</div>
                <div style="font-size:13px;color:var(--text-secondary);">${alert.message}</div>
            </div>
        </div>
    `).join('');
}

// Global functions
window.switchInventoryTab = function(btn, tabId) {
    // Update tab buttons
    document.querySelectorAll('.tabs .tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    // Show/hide tab content
    document.querySelectorAll('.inventory-tab-content').forEach(tab => tab.style.display = 'none');
    document.getElementById(`tab-${tabId}`).style.display = 'block';
};

window.filterInventory = function() {
    const filterValue = document.getElementById('stock-filter').value;
    let filtered = currentInventory;
    
    switch(filterValue) {
        case 'in-stock':
            filtered = currentInventory.filter(p => p.stock > 10);
            break;
        case 'low-stock':
            filtered = currentInventory.filter(p => p.stock > 0 && p.stock <= 10);
            break;
        case 'out-of-stock':
            filtered = currentInventory.filter(p => p.stock === 0);
            break;
    }
    
    renderInventoryGrid(filtered);
};

window.quickAdjustStock = function(productKey, action) {
    const product = currentInventory.find(p => p._key === productKey);
    if(!product) return;
    
    const quantity = prompt(action === 'add' ? 'أدخل الكمية المضافة:' : 'أدخل الكمية المخصومة:', '1');
    if(!quantity || isNaN(quantity)) return;
    
    const newStock = action === 'add' ? product.stock + Number(quantity) : Math.max(0, product.stock - Number(quantity));
    
    set(ref(db, `products/${productKey}/stock`), newStock).then(() => {
        // Record movement
        push(ref(db, 'movements'), {
            productName: product.name,
            type: action === 'add' ? 'in' : 'out',
            quantity: Number(quantity),
            balanceAfter: newStock,
            date: new Date().toISOString(),
            notes: `تعديل سريع - ${action === 'add' ? 'إضافة' : 'خصم'}`
        });
        
        showToast(`تم ${action === 'add' ? 'إضافة' : 'خصم'} ${quantity} قطعة`, 'success');
    });
};

window.openStockAdjustmentModal = function() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal">
            <div class="modal-header">
                <h3><i class='bx bx-transfer'></i> تعديل المخزون</h3>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
                    <i class='bx bx-x'></i>
                </button>
            </div>
            <div class="modal-body">
                <form id="adjustment-form">
                    <div class="form-group">
                        <label>اختر المنتج *</label>
                        <select class="form-control" name="productKey" required>
                            <option value="">-- اختر منتج --</option>
                            ${currentInventory.map(p => `<option value="${p._key}">${p.name} (المتوفر: ${p.stock})</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>نوع الحركة *</label>
                            <select class="form-control" name="type" required>
                                <option value="in">إضافة (وارد)</option>
                                <option value="out">خصم (صادر)</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>الكمية *</label>
                            <input type="number" class="form-control" name="quantity" required min="1" placeholder="0">
                        </div>
                    </div>
                    <div class="form-group">
                        <label>السبب / ملاحظات</label>
                        <textarea class="form-control" name="notes" rows="2" placeholder="سبب التعديل..."></textarea>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button class="btn-outline btn-sm" onclick="this.closest('.modal-overlay').remove()">${t('cancel')}</button>
                <button class="btn-primary btn-sm" onclick="saveStockAdjustment()">
                    <i class='bx bx-save'></i> ${t('save')}
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
};

window.saveStockAdjustment = function() {
    const form = document.getElementById('adjustment-form');
    const formData = new FormData(form);
    
    const productKey = formData.get('productKey');
    const type = formData.get('type');
    const quantity = Number(formData.get('quantity'));
    const notes = formData.get('notes');
    
    if(!productKey || !quantity) {
        showToast('يرجى ملء جميع الحقول', 'error');
        return;
    }
    
    const product = currentInventory.find(p => p._key === productKey);
    if(!product) return;
    
    const newStock = type === 'in' ? product.stock + quantity : Math.max(0, product.stock - quantity);
    
    set(ref(db, `products/${productKey}/stock`), newStock).then(() => {
        push(ref(db, 'movements'), {
            productName: product.name,
            type: type,
            quantity: quantity,
            balanceAfter: newStock,
            date: new Date().toISOString(),
            notes: notes
        });
        
        showToast('تم تحديث المخزون بنجاح', 'success');
        document.querySelector('.modal-overlay')?.remove();
    });
};

window.openMovementModal = function() {
    openStockAdjustmentModal();
};
