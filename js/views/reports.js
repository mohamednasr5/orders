import { t, currentLang } from '../core/i18n.js';
import { db, ref, onValue } from '../core/firebase-config.js';
import { showToast } from '../components/ui.js';

let salesReportChart = null;
let productsReportChart = null;

export function renderReports(container) {
    container.innerHTML = `
        <div class="view-content">
            <!-- Report Type Tabs -->
            <div class="tabs">
                <button class="tab-btn active" onclick="switchReportTab(this, 'sales')">${t('salesReport')}</button>
                <button class="tab-btn" onclick="switchReportTab(this, 'products')">${t('topProducts')}</button>
                <button class="tab-btn" onclick="switchReportTab(this, 'customers')">${t('customersReport')}</button>
                <button class="tab-btn" onclick="switchReportTab(this, 'inventory')">${t('inventoryReport')}</button>
            </div>

            <!-- Date Range Filter -->
            <div class="chart-card" style="margin-top:15px;">
                <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:15px;">
                    <h3 style="margin:0;"><i class='bx bx-calendar'></i> ${t('dateRange')}</h3>
                    <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
                        <input type="date" class="filter-input" id="report-from" onchange="updateReports()">
                        <span>-</span>
                        <input type="date" class="filter-input" id="report-to" onchange="updateReports()">
                        <select class="filter-select" id="report-period" onchange="setQuickPeriod(this.value)">
                            <option value="">مخصص</option>
                            <option value="today" selected>${t('today')}</option>
                            <option value="week">${t('thisWeek')}</option>
                            <option value="month">${t('thisMonth')}</option>
                            <option value="year">${t('thisYear')}</option>
                        </select>
                        <button class="btn-primary btn-sm" onclick="generatePDFReport()">
                            <i class='bx bx-download'></i> ${t('export')} PDF
                        </button>
                        <button class="btn-outline btn-sm" onclick="window.print()">
                            <i class='bx bx-printer'></i> ${t('print')}
                        </button>
                    </div>
                </div>
            </div>

            <!-- Sales Report Tab -->
            <div id="tab-sales" class="report-tab-content">
                <div class="stats-row" style="margin-top:20px;">
                    <div class="stat-item">
                        <div class="stat-value" id="report-total-revenue">0</div>
                        <div class="stat-label">${t('revenue')}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value" style="color:var(--success);" id="report-total-orders">0</div>
                        <div class="stat-label">${t('totalOrders')}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value" style="color:var(--primary);" id="report-avg-order">0</div>
                        <div class="stat-label">متوسط الطلب</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value" style="color:var(--purple);" id="report-growth">+12%</div>
                        <div class="stat-label">${t('growth')}</div>
                    </div>
                </div>

                <div class="charts-grid" style="margin-top:20px;">
                    <div class="chart-card">
                        <h3><i class='bx bx-line-chart'></i> ${t('monthlySales')}</h3>
                        <canvas id="sales-report-chart" height="150"></canvas>
                    </div>
                    <div class="chart-card">
                        <h3><i class='bx bx-pie-chart'></i> ${t('orderStatus')}</h3>
                        <canvas id="status-report-chart" height="200"></canvas>
                    </div>
                </div>

                <!-- Orders Table -->
                <div class="table-container" style="margin-top:20px;">
                    <div class="table-header-actions">
                        <h2>تفاصيل المبيعات</h2>
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th>${t('orderId')}</th>
                                <th>${t('customer')}</th>
                                <th>${t('amount')}</th>
                                <th>${t('status')}</th>
                                <th>${t('date')}</th>
                            </tr>
                        </thead>
                        <tbody id="report-orders-body"></tbody>
                    </table>
                </div>
            </div>

            <!-- Products Report Tab -->
            <div id="tab-products" class="report-tab-content" style="display:none;">
                <div class="chart-card" style="margin-top:20px;">
                    <h3><i class='bx bx-bar-chart-alt-2'></i> ${t('topProducts')}</h3>
                    <canvas id="products-report-chart" height="100"></canvas>
                </div>
                
                <div class="table-container" style="margin-top:20px;">
                    <div class="table-header-actions">
                        <h2>أداء المنتجات</h2>
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th>${t('productName')}</th>
                                <th>${t('sku')}</th>
                                <th>${t('price')}</th>
                                <th>${t('stock')}</th>
                                <th>قيمة المخزون</th>
                                <th>الحالة</th>
                            </tr>
                        </thead>
                        <tbody id="report-products-body"></tbody>
                    </table>
                </div>
            </div>

            <!-- Customers Report Tab -->
            <div id="tab-customers" class="report-tab-content" style="display:none;">
                <div class="stats-row" style="margin-top:20px;">
                    <div class="stat-item">
                        <div class="stat-value" id="report-customer-count">0</div>
                        <div class="stat-label">إجمالي العملاء</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value" style="color:var(--success);" id="report-new-customers">0</div>
                        <div class="stat-label">عملاء جدد</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value" style="color:var(--primary);" id="report-customer-revenue">0</div>
                        <div class="stat-label">إجمالي مشترياتهم</div>
                    </div>
                </div>

                <div class="chart-card" style="margin-top:20px;">
                    <h3><i class='bx bx-trophy'></i> ${t('topCustomers')}</h3>
                    <div id="top-customers-list"></div>
                </div>
            </div>

            <!-- Inventory Report Tab -->
            <div id="tab-inventory" class="report-tab-content" style="display:none;">
                <div class="stats-row" style="margin-top:20px;">
                    <div class="stat-item">
                        <div class="stat-value" id="inv-total-products">0</div>
                        <div class="stat-label">${t('products')}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value" style="color:var(--success);" id="inv-total-stock">0</div>
                        <div class="stat-label">إجمالي الكمية</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value" style="color:var(--warning);" id="inv-low-stock-count">0</div>
                        <div class="stat-label">${t('lowStock')}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value" style="color:var(--danger);" id="inv-total-value">0</div>
                        <div class="stat-label">قيمة المخزون</div>
                    </div>
                </div>

                <div class="chart-card" style="margin-top:20px;">
                    <h3><i class='bx bx-pie-chart-alt'></i> توزيع المخزون حسب الفئة</h3>
                    <canvas id="inventory-report-chart" height="200"></canvas>
                </div>
            </div>
        </div>
    `;

    // Set default date range (this month)
    setQuickPeriod('month');
    
    // Fetch data and render reports
    fetchReportData();
}

function fetchReportData() {
    // Orders Data
    const ordersRef = ref(db, 'orders');
    onValue(ordersRef, (snapshot) => {
        const data = snapshot.val();
        if(data) {
            const orders = Object.values(data);
            updateSalesReport(orders);
            updateStatusChart(orders);
        }
    });

    // Products Data
    const productsRef = ref(db, 'products');
    onValue(productsRef, (snapshot) => {
        const data = snapshot.val();
        if(data) {
            const products = Object.values(data);
            updateProductsReport(products);
            updateInventoryReport(products);
        }
    });

    // CRM Data
    const crmRef = ref(db, 'crm');
    onValue(crmRef, (snapshot) => {
        const data = snapshot.val();
        if(data) {
            const customers = Object.values(data);
            updateCustomersReport(customers);
        }
    });
}

function updateSalesReport(orders) {
    const totalRevenue = orders.reduce((acc, o) => acc + (o.amount || 0), 0);
    const totalOrders = orders.length;
    const avgOrder = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

    document.getElementById('report-total-revenue').innerText = totalRevenue.toLocaleString() + ' ' + t('currency');
    document.getElementById('report-total-orders').innerText = totalOrders;
    document.getElementById('report-avg-order').innerText = avgOrder.toLocaleString() + ' ' + t('currency');

    // Sales Chart
    const ctx = document.getElementById('sales-report-chart');
    if(!ctx) return;
    
    if(salesReportChart) salesReportChart.destroy();
    
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    
    // Monthly data
    const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    const monthlyData = [12000, 19000, 15000, 22000, 18000, 30000, 28000, 35000, 42000, 38000, 45000, 52000];
    
    salesReportChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: months,
            datasets: [{
                label: t('revenue'),
                data: monthlyData,
                backgroundColor: 'rgba(37, 99, 235, 0.8)',
                borderRadius: 6,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { display: false }, ticks: { color: isDark ? '#94a3b8' : '#64748b' } },
                y: { 
                    grid: { color: isDark ? '#334155' : '#e2e8f0' },
                    ticks: { 
                        color: isDark ? '#94a3b8' : '#64748b',
                        callback: v => v / 1000 + 'K'
                    }
                }
            }
        }
    });

    // Orders Table
    const tbody = document.getElementById('report-orders-body');
    tbody.innerHTML = orders.slice(-10).reverse().map(o => `
        <tr>
            <td style="font-weight:600;color:var(--primary);">${o.id}</td>
            <td>${o.customer}</td>
            <td style="font-weight:600;">${Number(o.amount).toLocaleString()} ${t('currency')}</td>
            <td><span class="status-badge status-${o.status}">${t('status_'+o.status)}</span></td>
            <td style="color:var(--text-secondary);font-size:13px;">${o.date || '-'}</td>
        </tr>
    `).join('');
}

function updateStatusChart(orders) {
    const ctx = document.getElementById('status-report-chart');
    if(!ctx) return;
    
    const statusCounts = {
        pending: orders.filter(o => o.status === 'pending').length,
        processing: orders.filter(o => o.status === 'processing').length,
        shipped: orders.filter(o => o.status === 'shipped').length,
        delivered: orders.filter(o => o.status === 'delivered').length,
        cancelled: orders.filter(o => o.status === 'cancelled').length
    };
    
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(statusCounts).map(k => t('status_' + k)),
            datasets: [{
                data: Object.values(statusCounts),
                backgroundColor: ['#f59e0b', '#8b5cf6', '#3b82f6', '#10b981', '#ef4444'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '60%',
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });
}

function updateProductsReport(products) {
    const ctx = document.getElementById('products-report-chart');
    if(!ctx || !products.length) return;
    
    if(productsReportChart) productsReportChart.destroy();
    
    const topProducts = [...products].sort((a, b) => b.stock - a.stock).slice(0, 5);
    
    productsReportChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: topProducts.map(p => p.name.substring(0, 15) + '...'),
            datasets: [
                { label: 'المخزون', data: topProducts.map(p => p.stock), backgroundColor: '#2563eb', borderRadius: 4 },
                { label: 'السعر', data: topProducts.map(p => p.price), backgroundColor: '#10b981', borderRadius: 4 }
            ]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom' } }
        }
    });

    // Products Table
    const tbody = document.getElementById('report-products-body');
    tbody.innerHTML = products.map(p => `
        <tr>
            <td style="font-weight:500;">${p.name}</td>
            <td><code>${p.sku || '-'}</code></td>
            <td>${Number(p.price).toLocaleString()} ${t('currency')}</td>
            <td><span class="badge badge-${p.stock <= 5 ? 'danger' : p.stock <= 10 ? 'warning' : 'success'}">${p.stock}</span></td>
            <td style="font-weight:600;">${(Number(p.price) * p.stock).toLocaleString()} ${t('currency')}</td>
            <td>${p.stock === 0 ? '<span class="badge badge-danger">نفذ</span>' : p.stock <= 10 ? '<span class="badge badge-warning">منخفض</span>' : '<span class="badge badge-success">متوفر</span>'}</td>
        </tr>
    `).join('');
}

function updateCustomersReport(customers) {
    document.getElementById('report-customer-count').innerText = customers.length;
    document.getElementById('report-new-customers').innerText = Math.max(1, Math.floor(customers.length * 0.3));
    
    const totalSpent = customers.reduce((acc, c) => acc + (c.totalSpent || 0), 0);
    document.getElementById('report-customer-revenue').innerText = totalSpent.toLocaleString() + ' ' + t('currency');

    // Top Customers List
    const listContainer = document.getElementById('top-customers-list');
    const topCustomers = [...customers].sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0)).slice(0, 5);
    
    if(topCustomers.length === 0) {
        listContainer.innerHTML = `<p style="text-align:center;color:var(--text-secondary);padding:30px;">لا توجد بيانات</p>`;
        return;
    }
    
    listContainer.innerHTML = `
        <table>
            <thead>
                <tr>
                    <th>#</th>
                    <th>${t('customer')}</th>
                    <th>${t('totalOrders')}</th>
                    <th>${t('totalSpent')}</th>
                </tr>
            </thead>
            <tbody>
                ${topCustomers.map((c, i) => `
                    <tr>
                        <td><span style="width:28px;height:28px;background:${i === 0 ? '#fbbf24' : i === 1 ? '#94a3b8' : i === 2 ? '#cd7c32' : 'var(--border-color)'};border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;">${i + 1}</span></td>
                        <td style="font-weight:500;">${c.name}</td>
                        <td>${c.totalOrders || 1}</td>
                        <td style="font-weight:600;color:var(--success);">${(c.totalSpent || 0).toLocaleString()} ${t('currency')}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function updateInventoryReport(products) {
    const totalProducts = products.length;
    const totalStock = products.reduce((acc, p) => acc + (p.stock || 0), 0);
    const lowStockCount = products.filter(p => p.stock > 0 && p.stock <= 10).length;
    const totalValue = products.reduce((acc, p) => acc + ((p.price || 0) * (p.stock || 0)), 0);

    document.getElementById('inv-total-products').innerText = totalProducts;
    document.getElementById('inv-total-stock').innerText = totalStock.toLocaleString();
    document.getElementById('inv-low-stock-count').innerText = lowStockCount;
    document.getElementById('inv-total-value').innerText = totalValue.toLocaleString() + ' ' + t('currency');

    // Inventory by Category Chart
    const ctx = document.getElementById('inventory-report-chart');
    if(!ctx || !products.length) return;
    
    const categoryData = {};
    products.forEach(p => {
        const cat = p.category || 'other';
        categoryData[cat] = (categoryData[cat] || 0) + p.stock;
    });
    
    const categoryNames = { electronics: 'إلكترونيات', clothing: 'ملابس', food: 'أغذية', other: 'أخرى' };
    
    new Chart(ctx, {
        type: 'pie',
        data: {
            labels: Object.keys(categoryData).map(k => categoryNames[k] || k),
            datasets: [{
                data: Object.values(categoryData),
                backgroundColor: ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom' } }
        }
    });
}

// Global functions
window.switchReportTab = function(btn, tabId) {
    document.querySelectorAll('.tabs .tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    document.querySelectorAll('.report-tab-content').forEach(tab => tab.style.display = 'none');
    document.getElementById(`tab-${tabId}`).style.display = 'block';
};

window.setQuickPeriod = function(period) {
    const today = new Date();
    let fromDate = new Date();
    
    switch(period) {
        case 'today':
            break; // Today to today
        case 'week':
            fromDate.setDate(today.getDate() - 7);
            break;
        case 'month':
            fromDate.setMonth(today.getMonth() - 1);
            break;
        case 'year':
            fromDate.setFullYear(today.getFullYear() - 1);
            break;
        default:
            return;
    }
    
    document.getElementById('report-from').value = fromDate.toISOString().split('T')[0];
    document.getElementById('report-to').value = today.toISOString().split('T')[0];
    document.getElementById('report-period').value = period;
};

window.updateReports = function() {
    fetchReportData();
    showToast('تم تحديث التقارير', 'info');
};

window.generatePDFReport = function() {
    showToast('جاري إنشاء التقرير... يرجى الانتظار', 'info');
    
    // Simulate PDF generation
    setTimeout(() => {
        // Create a simple printable report
        const printContent = document.querySelector('.view-content').innerHTML;
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html dir="rtl">
            <head>
                <title>SaaS OMS - ${t('reports')}</title>
                <style>
                    body { font-family: Cairo, Arial, sans-serif; padding: 40px; max-width: 900px; margin: 0 auto; }
                    h1 { color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px; }
                    .stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin: 20px 0; }
                    .stat-item { background: #f8fafc; padding: 15px; border-radius: 8px; text-align: center; }
                    .stat-value { font-size: 24px; font-weight: bold; color: #2563eb; }
                    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                    th, td { padding: 12px; border: 1px solid #e2e8f0; text-align: right; }
                    th { background: #2563eb; color: white; }
                    @media print { body { padding: 20px; } }
                </style>
            </head>
            <body>
                <h1>SaaS OMS - ${t('reports')}</h1>
                <p>تاريخ التوليد: ${new Date().toLocaleDateString('ar-EG')}</p>
                ${printContent}
            </body>
            </html>
        `);
        printWindow.document.close();
        showToast('تم فتح التقرير للطباعة/الحفظ كـ PDF', 'success');
    }, 500);
};
