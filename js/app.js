
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

// Global navigation function
window.navigateTo = function(route) {
    const navLinks = document.querySelectorAll('.nav-links li a');
    navLinks.forEach(link => {
        link.parentElement.classList.remove('active');
        if(link.getAttribute('data-route') === route) {
            link.parentElement.classList.add('active');
        }
    });
    loadView(route);
};

document.addEventListener('DOMContentLoaded', () => {
    // Initialize language and theme
    setLanguage(currentLang);
    initTheme();

    // Firebase Auth State Listener
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // User is signed in - show app
            document.getElementById('login-screen').classList.add('hidden');
            document.getElementById('app-loader').classList.remove('hidden');
            
            // Update user info in navbar
            document.getElementById('user-name').innerText = user.displayName || 'User';
            document.getElementById('user-avatar').src = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'User')}&background=2563eb&color=fff`;

            // Seed initial data for demo purposes
            seedInitialData();

            // Show app after short delay for smooth transition
            setTimeout(() => {
                document.getElementById('app-loader').classList.add('hidden');
                document.getElementById('app-container').classList.remove('hidden');
                loadView('dashboard');
                showToast(t('welcomeMessage'), 'success');
                
                // Update notification badge
                updateNotificationBadge();
            }, 800);
        } else {
            // User is signed out - show login screen
            document.getElementById('app-container').classList.add('hidden');
            document.getElementById('app-loader').classList.add('hidden');
            document.getElementById('login-screen').classList.remove('hidden');
        }
    });

    // Google Login Button Handler
    document.getElementById('btn-google-login').addEventListener('click', (e) => {
        e.preventDefault();
        const btn = e.currentTarget;
        const originalHTML = btn.innerHTML;
        
        // Show loading state
        btn.innerHTML = `
            <div class="spinner" style="width: 20px; height: 20px; border-width: 3px; border-top-color: white; margin-left: 10px; display: inline-block; vertical-align: middle;"></div>
            <span>جاري تسجيل الدخول...</span>
        `;
        btn.style.opacity = '0.7';
        btn.style.pointerEvents = 'none';
        
        // Sign in with Google popup
        signInWithPopup(auth, provider).then((result) => {
            // Success handled by onAuthStateChanged
            console.log('Signed in user:', result.user);
        }).catch(error => {
            console.error('Sign in error:', error);
            
            // Handle specific errors
            if (error.code === 'auth/popup-closed-by-user') {
                showToast('تم إغلاق نافذة تسجيل الدخول', 'warning');
            } else if (error.code === 'auth/popup-blocked') {
                showToast('يرجى السماح بالنوافذ المنبثقة في متصفحك', 'error');
            } else if (error.code === 'auth/cancelled-popup-request') {
                showToast('تم إلغاء عملية تسجيل الدخول', 'warning');
            } else {
                showToast('خطأ: ' + error.message, 'error');
            }
            
            // Restore button state
            btn.innerHTML = originalHTML;
            btn.style.opacity = '1';
            btn.style.pointerEvents = 'auto';
        });
    });

    // Logout Handler
    document.getElementById('btn-logout').addEventListener('click', () => {
        if(confirm('هل تريد تسجيل الخروج؟')) {
            signOut(auth).then(() => {
                showToast('تم تسجيل الخروج بنجاح', 'info');
            }).catch(error => {
                showToast('خطأ في تسجيل الخروج: ' + error.message, 'error');
            });
        }
    });

    // Sidebar Toggle
    const sidebar = document.getElementById('sidebar');
    document.getElementById('toggle-sidebar').addEventListener('click', () => {
        sidebar.classList.toggle('close');
        
        // Save sidebar state
        localStorage.setItem('saas_sidebar_closed', sidebar.classList.contains('close'));
    });
    
    // Restore sidebar state
    if(localStorage.getItem('saas_sidebar_closed') === 'true') {
        sidebar.classList.add('close');
    }

    // Language Toggle
    document.getElementById('lang-toggle').addEventListener('click', () => {
        const newLang = currentLang === 'ar' ? 'en' : 'ar';
        setLanguage(newLang);
        
        // Reload current view to apply new language
        const activeRoute = document.querySelector('.nav-links li.active a');
        if(activeRoute) loadView(activeRoute.getAttribute('data-route'));
    });

    // Navigation Links
    const navLinks = document.querySelectorAll('.nav-links li a');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Update active state
            navLinks.forEach(l => l.parentElement.classList.remove('active'));
            link.parentElement.classList.add('active');
            
            // Load the view
            loadView(link.getAttribute('data-route'));
            
            // Close sidebar on mobile after navigation
            if(window.innerWidth <= 768) {
                sidebar.classList.remove('open');
            }
        });
    });

    // Search functionality
    const searchInput = document.querySelector('.search-box input');
    if(searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if(e.key === 'Enter') {
                const searchTerm = searchInput.value.trim();
                if(searchTerm) {
                    // Navigate to orders with search term
                    window.navigateTo('orders');
                    setTimeout(() => {
                        const ordersSearch = document.getElementById('orders-search');
                        if(ordersSearch) {
                            ordersSearch.value = searchTerm;
                            filterOrders();
                        }
                    }, 300);
                }
            }
        });
    }

    // Notification bell click
    const notifBell = document.querySelector('.notification-bell');
    if(notifBell) {
        notifBell.addEventListener('click', () => {
            showToast('لا توجد إشعارات جديدة', 'info');
        });
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + K to focus search
        if((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            searchInput?.focus();
        }
        
        // Escape to close modals
        if(e.key === 'Escape') {
            const modal = document.querySelector('.modal-overlay');
            if(modal) modal.remove();
        }
    });

    // Handle window resize
    window.addEventListener('resize', () => {
        if(window.innerWidth > 768) {
            sidebar.classList.remove('open');
        }
    });
});

/**
 * Load a view/route into the main container
 */
function loadView(route) {
    const container = document.getElementById('view-container');
    
    // Show loading spinner
    container.innerHTML = `
        <div style="display:flex;justify-content:center;align-items:center;height:300px;">
            <div class="spinner"></div>
        </div>
    `;
    
    // Small delay for smooth transition
    setTimeout(() => {
        switch(route) {
            case 'dashboard':
                renderDashboard(container);
                break;
            case 'orders':
                renderOrders(container);
                break;
            case 'products':
                renderProducts(container);
                break;
            case 'crm':
                renderCRM(container);
                break;
            case 'inventory':
                renderInventory(container);
                break;
            case 'reports':
                renderReports(container);
                break;
            case 'settings':
                renderSettings(container);
                break;
            default:
                renderDashboard(container);
        }
        
        // Update page title
        const titles = {
            dashboard: t('dashboard'),
            orders: t('orders'),
            products: t('products'),
            crm: t('crm'),
            inventory: t('inventory'),
            reports: t('reports'),
            settings: t('settings')
        };
        document.title = `${titles[route] || route} | SaaS OMS`;
    }, 150);
}

/**
 * Seed initial demo data into Firebase
 */
function seedInitialData() {
    // Check if we already have data to avoid overwriting
    get(ref(db, 'orders')).then(snapshot => {
        if(!snapshot.exists()) {
            // Seed orders
            set(ref(db, 'orders/ord1'), { 
                id: '#ORD-001', 
                customer: 'أحمد محمد', 
                customerEmail: 'ahmed@test.com',
                phone: '01012345678',
                amount: 1500, 
                status: 'delivered',
                date: new Date().toISOString().split('T')[0],
                notes: 'طلب تجريبي',
                createdAt: new Date().toISOString()
            });
            set(ref(db, 'orders/ord2'), { 
                id: '#ORD-002', 
                customer: 'شركة التقنية المتقدمة', 
                customerEmail: 'info@techco.com',
                phone: '0223456789',
                amount: 4500, 
                status: 'shipped',
                date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
                createdAt: new Date(Date.now() - 86400000).toISOString()
            });
            set(ref(db, 'orders/ord3'), { 
                id: '#ORD-003', 
                customer: 'سارة أحمد', 
                customerEmail: 'sara@email.com',
                phone: '01098765432',
                amount: 850, 
                status: 'pending',
                date: new Date().toISOString().split('T')[0],
                createdAt: new Date().toISOString()
            });
        }
    });
    
    // Seed CRM data
    get(ref(db, 'crm')).then(snapshot => {
        if(!snapshot.exists()) {
            set(ref(db, 'crm/cust1'), { 
                name: 'أحمد محمد', 
                email: 'ahmed@test.com', 
                phone: '01012345678',
                company: '',
                totalOrders: 5,
                totalSpent: 7500,
                lastOrderDate: new Date().toISOString(),
                createdAt: new Date().toISOString()
            });
            set(ref(db, 'crm/cust2'), { 
                name: 'شركة التقنية المتقدمة', 
                email: 'info@techco.com', 
                phone: '0223456789',
                company: 'Tech Co.',
                totalOrders: 12,
                totalSpent: 45000,
                lastOrderDate: new Date(Date.now() - 604800000).toISOString(),
                createdAt: new Date(Date.now() - 2592000000).toISOString()
            });
        }
    });
    
    // Seed Products data
    get(ref(db, 'products')).then(snapshot => {
        if(!snapshot.exists()) {
            set(ref(db, 'products/prod1'), { 
                name: 'لابتوب احترافي', 
                sku: 'LPT-001', 
                category: 'electronics',
                price: 25000, 
                stock: 15,
                description: 'لبتوب عالي الأداء للعمل والترفيه',
                imageUrl: '',
                createdAt: new Date().toISOString()
            });
            set(ref(db, 'products/prod2'), { 
                name: 'ماوس لاسلكي', 
                sku: 'MSE-001', 
                category: 'electronics',
                price: 299, 
                stock: 50,
                description: 'ماوس لاسلكي دقيق وبطارية طويلة',
                imageUrl: '',
                createdAt: new Date().toISOString()
            });
            set(ref(db, 'products/prod3'), { 
                name: 'تي شيرت قطني', 
                sku: 'TSH-001', 
                category: 'clothing',
                price: 199, 
                stock: 8,
                description: 'تي شيرت قطني عالي الجودة',
                imageUrl: '',
                createdAt: new Date().toISOString()
            });
            set(ref(db, 'products/prod4'), { 
                name: 'قهوة عربية', 
                sku: 'COF-001', 
                category: 'food',
                price: 85, 
                stock: 100,
                description: 'قهوة عربية فاخرة',
                imageUrl: '',
                createdAt: new Date().toISOString()
            });
        }
    });
}

/**
 * Update notification badge count
 */
function updateNotificationBadge() {
    const badge = document.querySelector('.notification-bell .badge');
    if(badge) {
        // Simulate some notifications
        const pendingCount = Math.floor(Math.random() * 3);
        if(pendingCount > 0) {
            badge.textContent = pendingCount;
            badge.classList.add('visible');
        }
    }
}
