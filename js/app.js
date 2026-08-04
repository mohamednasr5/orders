
import { setLanguage, currentLang, t } from './core/i18n.js';
import { initTheme } from './core/theme.js';
import { renderDashboard } from './views/dashboard.js';
import { renderOrders } from './views/orders.js';
import { showToast } from './components/ui.js';

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Core Systems
    setLanguage(currentLang);
    initTheme();

    // 2. Setup Sidebar Logic
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('toggle-sidebar');
    toggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('close');
    });

    // 3. Setup Language Toggle
    document.getElementById('lang-toggle').addEventListener('click', () => {
        const newLang = currentLang === 'ar' ? 'en' : 'ar';
        setLanguage(newLang);
        // Re-render current view to apply language changes
        loadView(document.querySelector('.nav-links li.active a').getAttribute('data-route'));
    });

    // 4. Setup Routing
    const navLinks = document.querySelectorAll('.nav-links li a');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            navLinks.forEach(l => l.parentElement.classList.remove('active'));
            link.parentElement.classList.add('active');
            
            const route = link.getAttribute('data-route');
            loadView(route);
        });
    });

    // 5. Simulate System Loading (For Premium Feel)
    setTimeout(() => {
        document.getElementById('app-loader').classList.add('hidden');
        document.getElementById('app-container').classList.remove('hidden');
        loadView('dashboard');
        showToast(t('welcomeMessage'), 'success');
    }, 1500);

    // Re-render charts on theme change
    window.addEventListener('themeChanged', () => {
        if(document.querySelector('.nav-links li.active a').getAttribute('data-route') === 'dashboard') {
            loadView('dashboard');
        }
    });
});

function loadView(route) {
    const container = document.getElementById('view-container');
    container.innerHTML = `<div class="spinner" style="margin: 50px auto;"></div>`; // Loading state

    setTimeout(() => {
        switch(route) {
            case 'dashboard':
                renderDashboard(container);
                break;
            case 'orders':
                renderOrders(container);
                break;
            default:
                // Placeholder for other modules
                container.innerHTML = `
                    <div class="view-content" style="text-align: center; padding: 50px;">
                        <i class='bx bx-laptop' style="font-size: 80px; color: var(--text-secondary); margin-bottom: 20px;"></i>
                        <h2 style="font-size: 24px;">${t(route)} Module</h2>
                        <p style="color: var(--text-secondary); margin-top: 10px;">This module is under development for enterprise deployment.</p>
                    </div>
                `;
        }
    }, 300); // Simulate network latency slightly for animation effect
}
