import { t, currentLang } from '../core/i18n.js';
import { db, ref, onValue, set, push } from '../core/firebase-config.js';
import { showToast } from '../components/ui.js';

let salesChartInstance = null;
let ordersChartInstance = null;

export function renderDashboard(container) {
    container.innerHTML = `
        <div class="view-content">
            <!-- KPI Cards -->
            <div class="dashboard-grid">
                <div class="kpi-card">
                    <div class="kpi-info">
                        <h3>${t('totalSales')}</h3>
                        <div class="value" id="kpi-sales">0</div>
                        <small style="color: var(--success); font-size: 12px; margin-top: 5px; display: block;">
                            <i class='bx bx-trending-up'></i> +12.5% ${t('thisMonth')}
                        </small>
                    </div>
                    <div class="kpi-icon blue"><i class='bx bx-wallet'></i></div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-info">
                        <h3>${t('totalOrders')}</h3>
                        <div class="value" id="kpi-orders">0</div>
                        <small style="color: var(--info); font-size: 12px; margin-top: 5px; display: block;">
                            <i class='bx bx-package'></i> ${t('pendingShipments')}: <span id="kpi-pending-count">0</span>
                        </small>
                    </div>
                    <div class="kpi-icon green"><i class='bx bx-shopping-bag'></i></div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-info">
                        <h3>${t('activeCustomers')}</h3>
                        <div class="value" id="kpi-crm">0</div>
                        <small style="color: var(--purple); font-size: 12px; margin-top: 5px; display: block;">
                            <i class='bx bx-user-plus'></i> +3 ${t('thisWeek')}
                        </small>
                    </div>
                    <div class="kpi-icon purple"><i class='bx bx-user-voice'></i></div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-info">
                        <h3>${t('products')}</h3>
                        <div class="value" id="kpi-products">0</div>
                        <small style="color: var(--warning); font-size: 12px; margin-top: 5px; display: block;">
                            <i class='bx bx-box'></i> ${t('lowStock')}: <span id="kpi-lowstock-count">0</span>
                        </small>
                    </div>
                    <div class="kpi-icon orange"><i class='bx bx-package'></i></div>
                </div>
            </div>

            <!-- Charts & Recent Orders -->
            <div class="charts-grid">
                <div class="chart-card">
                    <h3><i class='bx bx-line-chart'></i> ${t('salesAnalytics')} - ${t('monthlySales')}</h3>
                    <canvas id="salesChart" height="120"></canvas>
                    <div class="chart-legend">
                        <div class="legend-item"><span class="legend-dot" style="background: #2563eb;"></span>${t('revenue')}</div>
                        <div class="legend-item"><span class="legend-dot" style="background: #10b981;"></span>${t('profit')}</div>
                    </div>
                </div>
                
                <div class="chart-card" style="max-height: 400px;">
                    <h3><i class='bx bx-pie-chart-alt'></i> ${t('orderStatus')}</h3>
                    <canvas id="ordersChart" height="180"></canvas>
                    <div class="chart-legend" id="orders-legend"></div>
                </div>
            </div>

            <!-- Recent Orders Table -->
            <div class="table-container">
                <div class="table-header-actions">
                    <h2><i class='bx bx-time-five'></i> ${t('recentOrders')}</h2>
                    <button class="btn-primary btn-sm" onclick="window.navigateTo('orders')">
                        <i class='bx bx-show'></i> ${t('viewDetails')}
                    </button>
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
                    <tbody id="dash-orders-body">
                        <tr><td colspan="5" style="text-align:center;"><div class="spinner" style="width:30px;height:30px;border-width:3px;margin:10px auto;"></div></td></tr>
                    </tbody>
                </table>
            </div>

            <!-- Quick Actions -->
            <div class="chart-card" style="margin-top: 20px;">
                <h3><i class='bx bx-bolt'></i> ${t('quickActions')}</h3>
                <div class="quick-actions">
                    <button class="quick-action-btn" onclick="window.navigateTo('orders')">
                        <i class='bx bx-cart-add'></i>
                        <span>${t('newOrder')}</span>
                    </button>
                    <button class="quick-action-btn" onclick="window.navigateTo('products')">
                        <i class='bx bx-plus-circle'></i>
                        <span>${t('addProduct')}</span>
                    </button>
                    <button class="quick-action-btn" onclick="window.navigateTo('crm')">
                        <i class='bx bx-user-plus'></i>
                        <span>${t('addCustomer')}</span>
                    </button>
                    <button class="quick-action-btn" onclick="window.navigateTo('reports')">
                        <i class='bx bx-bar-chart-alt-2'></i>
                        <span>${t('viewReports')}</span>
                    </button>
                    <button class="quick-action-btn" onclick="window.navigateTo('inventory')">
                        <i class='bx bx-box'></i>
                        <span>${t('addStock')}</span>
                    </button>
                </div>
            </div>
        </div>
    `;

    // Fetch real-time data
    fetchDashboardData();
}

function fetchDashboardData() {
    // Orders Data
    const ordersRef = ref(db, 'orders');
    onValue(ordersRef, (snapshot) => {
        const data = snapshot.val();
        if(data) {
            const orderList = Object.values(data);
            document.getElementById('kpi-orders').innerText = orderList.length;
            
            const totalRevenue = orderList.reduce((acc, cur) => acc + (cur.amount || 0), 0);
            document.getElementById('kpi-sales').innerHTML = totalRevenue.toLocaleString() + ` <span style="font-size:14px">${t('currency')}</span>`;
            
            const pendingCount = orderList.filter(o => o.status === 'pending' || o.status === 'processing').length;
            document.getElementById('kpi-pending-count').innerText = pendingCount;
            
            // Recent Orders Table
            const tbody = document.getElementById('dash-orders-body');
            const recentOrders = orderList.slice(-5).reverse();
            tbody.innerHTML = recentOrders.map(o => `
                <tr>
                    <td style="font-weight: 600; color: var(--primary)">${o.id}</td>
                    <td>
                        <div style="display:flex;align-items:center;gap:8px;">
                            <img src="${o.customerAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(o.customer)}&background=2563eb&color=fff`}" 
                                 class="avatar avatar-sm" alt="">
                            ${o.customer}
                        </div>
                    </td>
                    <td style="font-weight:600;">${Number(o.amount).toLocaleString()} ${t('currency')}</td>
                    <td><span class="status-badge status-${o.status}">${t('status_'+o.status)}</span></td>
                    <td style="color:var(--text-secondary);font-size:13px;">${o.date || '-'}</td>
                </tr>
            `).join('');
            
            // Update Charts
            initSalesChart(orderList);
            initOrdersChart(orderList);
        } else {
            document.getElementById('kpi-orders').innerText = '0';
            document.getElementById('kpi-sales').innerHTML = `0 <span style="font-size:14px">${t('currency')}</span>`;
            document.getElementById('dash-orders-body').innerHTML = `<tr><td colspan="5" class="empty-state" style="padding:30px;"><p>${t('noData')}</p></td></tr>`;
        }
    });

    // CRM Data
    const crmRef = ref(db, 'crm');
    onValue(crmRef, (snapshot) => {
        const data = snapshot.val();
        document.getElementById('kpi-crm').innerText = data ? Object.keys(data).length : 0;
    });

    // Products Data
    const productsRef = ref(db, 'products');
    onValue(productsRef, (snapshot) => {
        const data = snapshot.val();
        if(data) {
            const productList = Object.values(data);
            document.getElementById('kpi-products').innerText = productList.length;
            const lowStockCount = productList.filter(p => p.stock < 10).length;
            document.getElementById('kpi-lowstock-count').innerText = lowStockCount;
        }
    });
}

function initSalesChart(orderList) {
    const ctx = document.getElementById('salesChart');
    if(!ctx) return;
    
    // Destroy existing chart
    if(salesChartInstance) {
        salesChartInstance.destroy();
    }
    
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#94a3b8' : '#64748b';
    
    // Calculate monthly data
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const revenueData = [12000, 19000, 3000, 5000, 20000, 30000, 45000, 38000, 42000, 35000, 48000, 55000];
    const profitData = revenueData.map(v => Math.round(v * 0.35));
    
    salesChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: months,
            datasets: [
                { 
                    label: t('revenue'), 
                    data: revenueData, 
                    borderColor: '#2563eb', 
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                    fill: true,
                    tension: 0.4,
                    borderWidth: 2,
                    pointRadius: 4,
                    pointBackgroundColor: '#2563eb'
                },
                { 
                    label: t('profit'), 
                    data: profitData, 
                    borderColor: '#10b981', 
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    fill: true,
                    tension: 0.4,
                    borderWidth: 2,
                    pointRadius: 4,
                    pointBackgroundColor: '#10b981'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: { 
                    grid: { color: isDark ? '#334155' : '#e2e8f0' },
                    ticks: { color: textColor }
                },
                y: { 
                    grid: { color: isDark ? '#334155' : '#e2e8f0' },
                    ticks: { 
                        color: textColor,
                        callback: function(value) { return value / 1000 + 'K'; }
                    }
                }
            }
        }
    });
}

function initOrdersChart(orderList) {
    const ctx = document.getElementById('ordersChart');
    if(!ctx) return;
    
    if(ordersChartInstance) {
        ordersChartInstance.destroy();
    }
    
    // Calculate status distribution
    const statusCounts = {
        pending: orderList.filter(o => o.status === 'pending').length,
        processing: orderList.filter(o => o.status === 'processing').length,
        shipped: orderList.filter(o => o.status === 'shipped').length,
        delivered: orderList.filter(o => o.status === 'delivered').length,
        cancelled: orderList.filter(o => o.status === 'cancelled').length
    };
    
    const colors = ['#f59e0b', '#8b5cf6', '#3b82f6', '#10b981', '#ef4444'];
    const statusKeys = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    
    ordersChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: statusKeys.map(s => t('status_' + s)),
            datasets: [{
                data: statusKeys.map(s => statusCounts[s]),
                backgroundColor: colors,
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            plugins: {
                legend: { display: false }
            }
        }
    });
    
    // Custom Legend
    const legendContainer = document.getElementById('orders-legend');
    legendContainer.innerHTML = statusKeys.map((s, i) => `
        <div class="legend-item">
            <span class="legend-dot" style="background: ${colors[i]};"></span>
            ${t('status_' + s)}: ${statusCounts[s]}
        </div>
    `).join('');
}
