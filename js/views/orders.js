
import { t, currentLang } from '../core/i18n.js';
import { mockOrders } from '../data/mockData.js';

export function renderOrders(container) {
    container.innerHTML = `
        <div class="view-content">
            <div class="table-container">
                <div class="table-header-actions">
                    <h2>${t('orders')}</h2>
                    <button class="btn-primary"><i class='bx bx-plus'></i> ${t('newOrder')}</button>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>${t('orderId')}</th>
                            <th>${t('customer')}</th>
                            <th>${t('date')}</th>
                            <th>${t('amount')}</th>
                            <th>${t('status')}</th>
                            <th>${t('action')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${mockOrders.map(order => `
                            <tr>
                                <td style="font-weight: 600; color: var(--primary)">${order.id}</td>
                                <td>${currentLang === 'ar' ? order.customer : order.customerEn}</td>
                                <td>${order.date}</td>
                                <td>${order.amount.toLocaleString()} ${t('currency')}</td>
                                <td><span class="status-badge status-${order.status}">${t('status_' + order.status)}</span></td>
                                <td>
                                    <button class="icon-btn" title="${t('viewDetails')}"><i class='bx bx-show'></i></button>
                                    <button class="icon-btn" title="Print"><i class='bx bx-printer'></i></button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}
