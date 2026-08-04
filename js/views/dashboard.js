
import { t, currentLang } from '../core/i18n.js';
import { mockOrders } from '../data/mockData.js';

let salesChartInstance = null;

export function renderDashboard(container) {
    container.innerHTML = `
        <div class="view-content">
            <div class="dashboard-grid">
                <div class="kpi-card">
                    <div class="kpi-info">
                        <h3>${t('totalSales')}</h3>
                        <div class="value">245,000 <span style="font-size: 16px; color: var(--text-secondary)">${t('currency')}</span></div>
                    </div>
                    <div class="kpi-icon blue"><i class='bx bx-wallet'></i></div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-info">
                        <h3>${t('totalOrders')}</h3>
                        <div class="value">1,284</div>
                    </div>
                    <div class="kpi-icon green"><i class='bx bx-shopping-bag'></i></div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-info">
                        <h3>${t('activeCustomers')}</h3>
                        <div class="value">842</div>
                    </div>
                    <div class="kpi-icon purple"><i class='bx bx-user-voice'></i></div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-info">
                        <h3>${t('pendingShipments')}</h3>
                        <div class="value">36</div>
                    </div>
                    <div class="kpi-icon orange"><i class='bx bx-package'></i></div>
                </div>
            </div>

            <div class="charts-grid">
                <div class="chart-card">
                    <h3>${t('salesAnalytics')}</h3>
                    <canvas id="salesChart" height="100"></canvas>
                </div>
                
                <div class="table-container" style="margin-top: 0; animation: scaleIn 0.5s ease forwards; animation-delay: 0.3s; opacity: 0;">
                    <div class="table-header-actions">
                        <h2>${t('recentOrders')}</h2>
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th>${t('orderId')}</th>
                                <th>${t('customer')}</th>
                                <th>${t('status')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${mockOrders.slice(0, 4).map(order => `
                                <tr>
                                    <td style="font-weight: 600; color: var(--primary)">${order.id}</td>
                                    <td>${currentLang === 'ar' ? order.customer : order.customerEn}</td>
                                    <td><span class="status-badge status-${order.status}">${t('status_' + order.status)}</span></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    setTimeout(initChart, 100);
}

function initChart() {
    const ctx = document.getElementById('salesChart');
    if(!ctx) return;
    
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#f8fafc' : '#0f172a';
    const gridColor = isDark ? '#334155' : '#e2e8f0';

    if (salesChartInstance) salesChartInstance.destroy();

    salesChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: currentLang === 'ar' ? ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو'] : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
            datasets: [{
                label: t('totalSales'),
                data: [65000, 59000, 80000, 81000, 56000, 95000, 110000],
                fill: true,
                backgroundColor: 'rgba(37, 99, 235, 0.1)',
                borderColor: '#2563eb',
                tension: 0.4,
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { color: gridColor }, ticks: { color: textColor } },
                y: { grid: { color: gridColor }, ticks: { color: textColor } }
            }
        }
    });
}
