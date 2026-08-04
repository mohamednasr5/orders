
import { t } from '../core/i18n.js';
export function renderSettings(container) {
    container.innerHTML = `
        <div class="view-content">
            <div class="chart-card" style="max-width: 600px;">
                <h3>${t('settings')}</h3>
                <div class="form-group"><label>API Endpoint (Cloudflare Worker)</label><input type="text" class="form-control" value="https://orders.usastud42.workers.dev" disabled></div>
                <div class="form-group"><label>Firebase Project ID</label><input type="text" class="form-control" value="orders-8f568" disabled></div>
                <div class="form-group"><label>R2 Bucket Binding</label><input type="text" class="form-control" value="orders" disabled></div>
                <button class="btn-primary" onclick="alert('Settings Saved to RTDB')">${t('save')}</button>
            </div>
        </div>
    `;
}
