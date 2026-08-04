
import { t } from '../core/i18n.js';
import { db, ref, onValue } from '../core/firebase-config.js';

export function renderOrders(container) {
    container.innerHTML = `
        <div class="view-content">
            <div class="table-container">
                <div class="table-header-actions">
                    <h2>${t('orders')}</h2>
                    <button class="btn-primary"><i class='bx bx-plus'></i> ${t('newOrder')}</button>
                </div>
                <table>
                    <thead><tr><th>${t('orderId')}</th><th>${t('customer')}</th><th>${t('amount')}</th><th>${t('status')}</th><th>${t('action')}</th></tr></thead>
                    <tbody id="orders-page-body"><tr><td colspan="5" style="text-align:center;">Loading...</td></tr></tbody>
                </table>
            </div>
        </div>
    `;
    const ordersRef = ref(db, 'orders');
    onValue(ordersRef, (snapshot) => {
        const data = snapshot.val();
        const tbody = document.getElementById('orders-page-body');
        if(data) {
            tbody.innerHTML = Object.values(data).map(o => `
                <tr><td style="font-weight: 600; color: var(--primary)">${o.id}</td><td>${o.customer}</td><td>${o.amount} ${t('currency')}</td><td><span class="status-badge status-${o.status}">${t('status_'+o.status)}</span></td><td><button class="icon-btn"><i class='bx bx-printer'></i></button></td></tr>
            `).join('');
        }
    });
}
