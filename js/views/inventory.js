/**
 * ===================================
 * Inventory View Module
 * ===================================
 */

const Inventory = {
    render(container) {
        const products = Utils.storage.get('products', []);
        const lowStock = products.filter(p => (p.stock || 0) <= (p.lowStockThreshold || 10));
        const outOfStock = products.filter(p => (p.stock || 0) === 0);
        const totalValue = products.reduce((sum, p) => sum + ((p.stock || 0) * (p.cost || 0)), 0);

        container.innerHTML = `
            <div class="view-content">
                <div class="page-header">
                    <div class="header-content">
                        <h1 class="page-title"><i class='bx bx-store'></i> المخزون</h1>
                        <p class="page-subtitle">متابعة مستويات المخزون والتنبيهات</p>
                    </div>
                    <button class="btn-outline" onclick="Inventory.exportInventory()">
                        <i class='bx bx-download'></i> تصدير التقرير
                    </button>
                </div>

                <!-- Stats -->
                <div class="shipping-stats">
                    <div class="shipping-stat-card">
                        <div class="shipping-stat-icon" style="background:var(--primary-light);color:var(--primary);">
                            <i class='bx bx-box'></i>
                        </div>
                        <div class="shipping-stat-content">
                            <div class="shipping-stat-value">${products.length}</div>
                            <div class="shipping-stat-label">إجمالي المنتجات</div>
                        </div>
                    </div>
                    <div class="shipping-stat-card">
                        <div class="shipping-stat-icon" style="background:var(--success-light);color:var(--success);">
                            <i class='bx bx-check-circle'></i>
                        </div>
                        <div class="shipping-stat-content">
                            <div class="shipping-stat-value">${products.filter(p => p.stock > 0).length}</div>
                            <div class="shipping-stat-label">متوفر</div>
                        </div>
                    </div>
                    <div class="shipping-stat-card">
                        <div class="shipping-stat-icon" style="background:var(--warning-light);color:var(--warning);">
                            <i class='bx bx-error'></i>
                        </div>
                        <div class="shipping-stat-content">
                            <div class="shipping-stat-value">${lowStock.length}</div>
                            <div class="shipping-stat-label">منخفض المخزون</div>
                        </div>
                    </div>
                    <div class="shipping-stat-card">
                        <div class="shipping-stat-icon" style="background:var(--danger-light);color:var(--danger);">
                            <i class='bx bx-x-circle'></i>
                        </div>
                        <div class="shipping-stat-content">
                            <div class="shipping-stat-value">${outOfStock.length}</div>
                            <div class="shipping-stat-label">نفذ من المخزون</div>
                        </div>
                    </div>
                    <div class="shipping-stat-card">
                        <div class="shipping-stat-icon" style="background:var(--purple-light);color:var(--purple);">
                            <i class='bx bx-wallet'></i>
                        </div>
                        <div class="shipping-stat-content">
                            <div class="shipping-stat-value">${Utils.formatCurrency(totalValue)}</div>
                            <div class="shipping-stat-label">قيمة المخزون</div>
                        </div>
                    </div>
                </div>

                <!-- Low Stock Alert -->
                ${lowStock.length > 0 ? `
                    <div class="card" style="margin-bottom:24px;border-color:var(--warning);">
                        <div class="card-header" style="background:var(--warning-light);">
                            <h3><i class='bx bx-error' style="color:var(--warning);"></i> تنبيهات المخزون المنخفض (${lowStock.length})</h3>
                        </div>
                        <div class="card-body">
                            <div class="table-container">
                                <table class="data-table">
                                    <thead><tr><th>المنتج</th><th>المخزون الحالي</th><th>حد التنبيه</th><th>الحالة</th></tr></thead>
                                    <tbody>
                                        ${lowStock.map(p => `
                                            <tr>
                                                <td>${p.name}</td>
                                                <td><strong style="color:${p.stock === 0 ? 'var(--danger)' : 'var(--warning)'};">${p.stock}</strong></td>
                                                <td>${p.lowStockThreshold || 10}</td>
                                                <td><span class="status-badge status-${p.stock === 0 ? 'danger' : 'warning'}">${p.stock === 0 ? 'نفذ' : 'منخفض'}</span></td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                ` : ''}

                <!-- Inventory Table -->
                <div class="card">
                    <div class="card-header">
                        <h3>جميع المنتجات</h3>
                        <input type="text" placeholder="بحث..." class="filter-select" 
                               onkeyup="Inventory.filterTable(this.value)" style="width:200px;">
                    </div>
                    <div class="card-body" style="padding:0;">
                        <div class="table-container" style="border:none;">
                            <table class="data-table" id="inventory-table">
                                <thead>
                                    <tr>
                                        <th>المنتج</th>
                                        <th>SKU</th>
                                        <th>السعر</th>
                                        <th>التكلفة</th>
                                        <th>المخزون</th>
                                        <th>القيمة</th>
                                        <th>الحالة</th>
                                        <th>تعديل</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${products.map(p => {
                                        const stockVal = (p.stock || 0) * (p.cost || 0);
                                        const status = (p.stock || 0) <= (p.lowStockThreshold || 10) ? (p.stock === 0 ? 'out' : 'low') : 'ok';
                                        return `
                                            <tr data-name="${(p.name||'').toLowerCase()}" data-sku="${(p.sku||'').toLowerCase()}">
                                                <td><strong>${p.name}</strong></td>
                                                <td dir="ltr">${p.sku || '-'}</td>
                                                <td>${Utils.formatCurrency(p.price)}</td>
                                                <td>${Utils.formatCurrency(p.cost)}</td>
                                                <td>
                                                    <input type="number" value="${p.stock || 0}" min="0" 
                                                           style="width:70px;padding:4px 8px;text-align:center;"
                                                           onchange="Inventory.updateStock('${p.id}', this.value)">
                                                </td>
                                                <td>${Utils.formatCurrency(stockVal)}</td>
                                                <td><span class="status-badge status-${status === 'ok' ? 'success' : status}">${status === 'ok' ? 'متوفر' : status === 'low' ? 'منخفض' : 'نفذ'}</span></td>
                                                <td><button class="btn-outline btn-sm" onclick="Products.editProduct('${p.id}')"><i class='bx bx-edit'></i></button></td>
                                            </tr>
                                        `;
                                    }).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    updateStock(productId, newStock) {
        let products = Utils.storage.get('products', []);
        const idx = products.findIndex(p => p.id === productId);
        if (idx !== -1) {
            products[idx].stock = parseInt(newStock) || 0;
            products[idx].updatedAt = new Date().toISOString();
            Utils.storage.set('products', products);
            Toast.success('تم تحديث المخزون');
        }
    },

    filterTable(query) {
        const q = query.toLowerCase();
        document.querySelectorAll('#inventory-table tbody tr').forEach(row => {
            const name = row.dataset.name || '';
            const sku = row.dataset.sku || '';
            row.style.display = name.includes(q) || sku.includes(q) ? '' : 'none';
        });
    },

    exportInventory() {
        const products = Utils.storage.get('products', []);
        const csv = ['اسم المنتج,SKU,السعر,التكلفة,المخزون,القيمة,CStatus\n',
            ...products.map(p => `"${p.name}",${p.sku},${p.price},${p.cost},${p.stock},${(p.stock||0)*(p.cost||0)},${p.stock <= (p.lowStockThreshold||10) ? 'Low' : 'OK'}`
            )].join('\n');

        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `inventory_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        Toast.success('تم تصدير تقرير المخزون');
    }
};

window.Inventory = Inventory;
