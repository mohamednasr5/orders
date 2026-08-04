
import { t } from '../core/i18n.js';
export function renderReports(container) {
    container.innerHTML = `<div class="view-content"><div class="chart-card"><h3>${t('reports')}</h3><p>Cloudflare Workers AI analytics endpoint configured.</p></div></div>`;
}
