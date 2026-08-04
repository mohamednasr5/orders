
import { t } from '../core/i18n.js';
import { db, ref, onValue } from '../core/firebase-config.js';

export function renderProducts(container) {
    container.innerHTML = `
        <div class="view-content">
            <div class="table-container">
                <div class="table-header-actions">
                    <h2>${t('products')}</h2>
                    <button class="btn-primary" onclick="alert('Cloudflare R2 Image Upload Integration Triggered!')"><i class='bx bx-plus'></i> ${t('addProduct')}</button>
                </div>
                <table>
                    <thead><tr><th>${t('productName')}</th><th>${t('price')}</th><th>${t('stock')}</th><th>Image (R2)</th></tr></thead>
                    <tbody id="products-body"><tr><td colspan="4" style="text-align:center;">Loading Products from RTDB...</td></tr></tbody>
                </table>
            </div>
            <p style="margin-top:20px; color: var(--text-secondary); font-size: 14px;">
                <i class='bx bx-cloud' ></i> Images are configured to load from Cloudflare R2: <br>
                <code>https://pub-edc4c80125a74d37b7f5fbdb576a4ecf.r2.dev/</code>
            </p>
        </div>
    `;

    const productsRef = ref(db, 'products');
    onValue(productsRef, (snapshot) => {
        const data = snapshot.val();
        const tbody = document.getElementById('products-body');
        if(data) {
            tbody.innerHTML = Object.values(data).map(p => `
                <tr>
                    <td>${p.name}</td>
                    <td>${p.price} ${t('currency')}</td>
                    <td>${p.stock}</td>
                    <td><img src="${p.imageUrl || 'https://via.placeholder.com/40'}" style="width:40px; border-radius:5px;"></td>
                </tr>
            `).join('');
        } else {
            // Setup dummy data if empty
            tbody.innerHTML = `
                <tr><td>Premium Widget</td><td>150 ${t('currency')}</td><td>45</td><td><img src="https://pub-edc4c80125a74d37b7f5fbdb576a4ecf.r2.dev/sample1.png" onerror="this.src='https://via.placeholder.com/40'" style="width:40px; border-radius:5px;"></td></tr>
            `;
        }
    });
}
