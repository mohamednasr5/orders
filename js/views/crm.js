
import { t } from '../core/i18n.js';
import { db, ref, onValue } from '../core/firebase-config.js';

export function renderCRM(container) {
    container.innerHTML = `
        <div class="view-content">
            <div class="table-container">
                <div class="table-header-actions">
                    <h2>${t('crm')}</h2>
                    <button class="btn-primary"><i class='bx bx-plus'></i> ${t('addCustomer')}</button>
                </div>
                <table>
                    <thead><tr><th>${t('customer')}</th><th>${t('email')}</th><th>${t('phone')}</th><th>${t('action')}</th></tr></thead>
                    <tbody id="crm-body"><tr><td colspan="4" style="text-align:center;">Loading CRM Data...</td></tr></tbody>
                </table>
            </div>
        </div>
    `;
    const crmRef = ref(db, 'crm');
    onValue(crmRef, (snapshot) => {
        const data = snapshot.val();
        const tbody = document.getElementById('crm-body');
        if(data) {
            tbody.innerHTML = Object.values(data).map(c => `
                <tr><td>${c.name}</td><td>${c.email}</td><td>${c.phone}</td><td><button class="icon-btn"><i class='bx bx-show'></i></button></td></tr>
            `).join('');
        } else {
             tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;">No customers found in Firebase RTDB.</td></tr>`;
        }
    });
}
