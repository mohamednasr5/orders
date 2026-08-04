
import { setLanguage, currentLang, t } from './core/i18n.js';
import { initTheme } from './core/theme.js';
import { auth, provider, signInWithPopup, signOut, onAuthStateChanged, db, ref, set } from './core/firebase-config.js';
import { showToast } from './components/ui.js';

// Views
import { renderDashboard } from './views/dashboard.js';
import { renderOrders } from './views/orders.js';
import { renderProducts } from './views/products.js';
import { renderCRM } from './views/crm.js';
import { renderInventory } from './views/inventory.js';
import { renderReports } from './views/reports.js';
import { renderSettings } from './views/settings.js';

document.addEventListener('DOMContentLoaded', () => {
    setLanguage(currentLang);
    initTheme();

    // Firebase Auth State
    onAuthStateChanged(auth, (user) => {
        if (user) {
            document.getElementById('login-screen').classList.add('hidden');
            document.getElementById('app-loader').classList.remove('hidden');
            
            document.getElementById('user-name').innerText = user.displayName || 'User';
            document.getElementById('user-avatar').src = user.photoURL || 'https://ui-avatars.com/api/?name=User';

            // Seed sample data if empty (just for demo integrity)
            seedInitialData();

            setTimeout(() => {
                document.getElementById('app-loader').classList.add('hidden');
                document.getElementById('app-container').classList.remove('hidden');
                loadView('dashboard');
                showToast(t('welcomeMessage'), 'success');
            }, 1000);
        } else {
            document.getElementById('app-container').classList.add('hidden');
            document.getElementById('login-screen').classList.remove('hidden');
        }
    });

    // Login Action
    document.getElementById('btn-google-login').addEventListener('click', () => {
        signInWithPopup(auth, provider).catch(error => showToast(error.message, 'error'));
    });

    // Logout Action
    document.getElementById('btn-logout').addEventListener('click', () => {
        signOut(auth);
    });

    // Sidebar Logic
    const sidebar = document.getElementById('sidebar');
    document.getElementById('toggle-sidebar').addEventListener('click', () => sidebar.classList.toggle('close'));

    // Language Toggle
    document.getElementById('lang-toggle').addEventListener('click', () => {
        setLanguage(currentLang === 'ar' ? 'en' : 'ar');
        const activeRoute = document.querySelector('.nav-links li.active a');
        if(activeRoute) loadView(activeRoute.getAttribute('data-route'));
    });

    // Routing
    const navLinks = document.querySelectorAll('.nav-links li a');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            navLinks.forEach(l => l.parentElement.classList.remove('active'));
            link.parentElement.classList.add('active');
            loadView(link.getAttribute('data-route'));
        });
    });
});

function loadView(route) {
    const container = document.getElementById('view-container');
    container.innerHTML = `<div class="spinner" style="margin: 50px auto;"></div>`; 
    setTimeout(() => {
        if(route === 'dashboard') renderDashboard(container);
        else if(route === 'orders') renderOrders(container);
        else if(route === 'products') renderProducts(container);
        else if(route === 'crm') renderCRM(container);
        else if(route === 'inventory') renderInventory(container);
        else if(route === 'reports') renderReports(container);
        else if(route === 'settings') renderSettings(container);
    }, 200);
}

function seedInitialData() {
    set(ref(db, 'orders/ord1'), { id: '#ORD-001', customer: 'Ahmed', amount: 1500, status: 'pending' });
    set(ref(db, 'orders/ord2'), { id: '#ORD-002', customer: 'Tech Co.', amount: 4500, status: 'shipped' });
    set(ref(db, 'crm/cust1'), { name: 'Ahmed', email: 'ahmed@test.com', phone: '01000000' });
}
