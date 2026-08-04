
import { t, currentLang } from '../core/i18n.js';
import { db, ref, onValue } from '../core/firebase-config.js';

let salesChartInstance = null;

export function renderDashboard(container) {
    container.innerHTML = `
        <div class="view-content">
            <div class="dashboard-grid">
                <div class="kpi-card"><div class="kpi-info"><h3>${t('totalSales')}</h3><div class="value" id="kpi-sales">...</div></div><div class="kpi-icon blue"><i class='bx bx-wallet'></i></div></div>
                <div class="kpi-card"><div class="kpi-info"><h3>${t('totalOrders')}</h3><div class="value" id="kpi-orders">...</div></div><div class="kpi-icon green"><i class='bx bx-shopping-bag'></i></div></div>
                <div class="kpi-card"><div class="kpi-info"><h3>${t('activeCustomers')}</h3><div class="value" id="kpi-crm">...</div></div><div class="kpi-icon purple"><i class='bx bx-user-voice'></i></div></div>
                <div class="kpi-card"><div class="kpi-info"><h3>${t('pendingShipments')}</h3><div class="value" id="kpi-pending">...</div></div><div class="kpi-icon orange"><i class='bx bx-package'></i></div></div>
            </div>
            <div class="charts-grid">
                <div class="chart-card"><h3>${t('salesAnalytics')}</h3><canvas id="salesChart" height="100"></canvas></div>
                <div class="table-container" style="margin-top: 0;">
                    <div class="table-header-actions"><h2>${t('recentOrders')}</h2></div>
                    <table><thead><tr><th>${t('orderId')}</th><th>${t('customer')}</th><th>${t('status')}</th></tr></thead><tbody id="dash-orders-body"><tr><td colspan="3" style="text-align:center;">Loading RTDB...</td></tr></tbody></table>
                </div>
            </div>
        </div>
    `;

    // Fetch real-time data from Firebase RTDB
    const ordersRef = ref(db, 'orders');
    onValue(ordersRef, (snapshot) => {
        const data = snapshot.val();
        if(data) {
            const orderList = Object.values(data);
            document.getElementById('kpi-orders').innerText = orderList.length;
            document.getElementById('kpi-sales').innerHTML = orderList.reduce((acc, cur) => acc + (cur.amount||0), 0) + ` <span style="font-size:16px">${t('currency')}</span>`;
            document.getElementById('kpi-pending').innerText = orderList.filter(o => o.status === 'pending').length;
            
            const tbody = document.getElementById('dash-orders-body');
            tbody.innerHTML = orderList.slice(-4).map(o => `
                <tr><td style="font-weight: 600; color: var(--primary)">${o.id}</td><td>${o.customer}</td><td><span class="status-badge status-${o.status}">${t('status_'+o.status)}</span></td></tr>
            `).join('');
        }
    });

    const crmRef = ref(db, 'crm');
    onValue(crmRef, (snapshot) => {
        const data = snapshot.val();
        document.getElementById('kpi-crm').innerText = data ? Object.keys(data).length : 0;
    });

    setTimeout(initChart, 100);
}

function initChart() {
    const ctx = document.getElementById('salesChart');
    if(!ctx) return;
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    salesChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
            datasets: [{ label: t('totalSales'), data: [12000, 19000, 3000, 5000, 20000, 30000, 45000], borderColor: '#2563eb', fill: false }]
        },
        options: { responsive: true }
    });
}
