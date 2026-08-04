
import { t } from '../core/i18n.js';
export function renderInventory(container) {
    container.innerHTML = `<div class="view-content"><div class="chart-card"><h3>${t('inventory')}</h3><p>Real-time sync active with Firebase RTDB.</p></div></div>`;
}
