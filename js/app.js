/**
 * ===================================
 * Shipping PWA - Main Application
 * ===================================
 * Professional Progressive Web App for
 * Shipping & Order Management System
 * 
 * Features:
 * - PWA with Install Banner
 * - Firebase Authentication
 * - Real-time Database Sync
 * - Shipping Module with Waybills
 * - Barcode Generation & Scanning
 * - Multi-company Support
 * - Store Branding (Logo/Name)
 */

// ===================================
// Application State
// ===================================

const AppState = {
    currentUser: null,
    storeConfig: null,
    currentRoute: 'dashboard',
    shippingCompanies: [],
    deferredPrompt: null,
    isOnline: navigator.onLine,
    theme: localStorage.getItem('app_theme') || 'light',
    language: localStorage.getItem('app_language') || 'ar'
};

// ===================================
// Utility Functions
// ===================================

const Utils = {
    /**
     * Generate unique ID
     */
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },

    /**
     * Format date to Arabic locale
     */
    formatDate(date, format = 'short') {
        const d = new Date(date);
        const options = {
            short: { day: 'numeric', month: 'short' },
            long: { day: 'numeric', month: 'long', year: 'numeric' },
            full: { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
        };
        return d.toLocaleDateString('ar-EG', options[format] || options.short);
    },

    /**
     * Format currency (EGP)
     */
    formatCurrency(amount) {
        return new Intl.NumberFormat('ar-EG', {
            style: 'currency',
            currency: 'EGP',
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        }).format(amount || 0);
    },

    /**
     * Format phone number
     */
    formatPhone(phone) {
        const cleaned = ('' + phone).replace(/\D/g, '');
        if (cleaned.length === 11) {
            return `0${cleaned.slice(1, 4)}-${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
        }
        return phone;
    },

    /**
     * Debounce function
     */
    debounce(func, wait = 300) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * Local storage helpers
     */
    storage: {
        get(key, defaultValue = null) {
            try {
                const item = localStorage.getItem(key);
                return item ? JSON.parse(item) : defaultValue;
            } catch {
                return defaultValue;
            }
        },
        set(key, value) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
                return true;
            } catch {
                return false;
            }
        },
        remove(key) {
            localStorage.removeItem(key);
        }
    },

    /**
     * Copy text to clipboard
     */
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            Toast.show('تم النسخ!', 'success');
            return true;
        } catch {
            // Fallback for older browsers
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            Toast.show('تم النسخ!', 'success');
            return true;
        }
    }
};

// ===================================
// Toast Notification System
// ===================================

const Toast = {
    container: null,

    init() {
        this.container = document.getElementById('toast-container');
    },

    show(message, type = 'info', duration = 4000) {
        if (!this.container) this.init();

        const icons = {
            success: 'bx-check-circle',
            error: 'bx-error-circle',
            warning: 'bx-error',
            info: 'bx-info-circle'
        };

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <i class='bx ${icons[type]}'></i>
            <div class="toast-content">
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close" onclick="this.parentElement.remove()">
                <i class='bx bx-x'></i>
            </button>
        `;

        this.container.appendChild(toast);

        // Auto remove
        setTimeout(() => {
            toast.style.animation = 'fadeOut 0.3s ease forwards';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    },

    success(message) { this.show(message, 'success'); },
    error(message) { this.show(message, 'error'); },
    warning(message) { this.show(message, 'warning'); },
    info(message) { this.show(message, 'info'); }
};

// ===================================
// PWA Installation Handler
// ===================================

const PWAInstaller = {
    banner: null,
    installBtn: null,
    dismissBtn: null,

    init() {
        this.banner = document.getElementById('pwa-install-banner');
        this.installBtn = document.getElementById('btn-install-pwa');
        this.dismissBtn = document.getElementById('btn-dismiss-install');

        // Listen for install prompt
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            AppState.deferredPrompt = e;
            this.showBanner();
        });

        // Listen for successful install
        window.addEventListener('appinstalled', () => {
            AppState.deferredPrompt = null;
            this.hideBanner();
            Toast.success('تم تثبيت التطبيق بنجاح! 🎉');
        });

        // Install button click
        if (this.installBtn) {
            this.installBtn.addEventListener('click', () => this.install());
        }

        // Dismiss button click
        if (this.dismissBtn) {
            this.dismissBtn.addEventListener('click', () => this.dismiss());
        }

        // Check if already installed
        if (window.matchMedia('(display-mode: standalone)').matches) {
            console.log('App is already installed');
        }

        // Show banner after delay for returning users
        setTimeout(() => {
            if (AppState.deferredPrompt && !Utils.storage.get('pwa_install_dismissed')) {
                this.showBanner();
            }
        }, 5000);
    },

    showBanner() {
        if (this.banner) {
            this.banner.classList.remove('hidden');
            setTimeout(() => this.banner.classList.add('visible'), 100);
        }
    },

    hideBanner() {
        if (this.banner) {
            this.banner.classList.remove('visible');
            setTimeout(() => this.banner.classList.add('hidden'), 400);
        }
    },

    async install() {
        if (!AppState.deferredPrompt) {
            Toast.info('التثبت غير متاح حالياً');
            return;
        }

        // Show the native install prompt
        AppState.deferredPrompt.prompt();

        // Wait for user choice
        const { outcome } = await AppState.deferredPrompt.userChoice;

        if (outcome === 'accepted') {
            Toast.success('جاري تثبيت التطبيق...');
        } else {
            Toast.info('يمكنك التثبيت لاحقاً');
        }

        AppState.deferredPrompt = null;
        this.hideBanner();
    },

    dismiss() {
        Utils.storage.set('pwa_install_dismissed', true);
        this.hideBanner();
        
        // Show again after 7 days
        setTimeout(() => {
            Utils.storage.remove('pwa_install_dismissed');
        }, 7 * 24 * 60 * 60 * 1000);
    }
};

// ===================================
// Theme Manager
// ===================================

const ThemeManager = {
    init() {
        const savedTheme = Utils.storage.get('app_theme', 'light');
        this.setTheme(savedTheme);

        const toggleBtn = document.getElementById('theme-toggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                const newTheme = AppState.theme === 'light' ? 'dark' : 'light';
                this.setTheme(newTheme);
                Toast.success(`تم التبديل إلى الوضع ${newTheme === 'light' ? 'الفاتح' : 'الداكن'}`);
            });
        }
    },

    setTheme(theme) {
        AppState.theme = theme;
        document.documentElement.setAttribute('data-theme', theme);
        Utils.storage.set('app_theme', theme);

        // Update toggle icon
        const toggleBtn = document.getElementById('theme-toggle');
        if (toggleBtn) {
            toggleBtn.innerHTML = theme === 'light' 
                ? '<i class=\'bx bx-moon\'></i>' 
                : '<i class=\'bx bx-sun\'></i>';
        }

        // Update meta theme-color
        const metaTheme = document.querySelector('meta[name="theme-color"]');
        if (metaTheme) {
            metaTheme.content = theme === 'dark' ? '#0f172a' : '#2563eb';
        }
    }
};

// ===================================
// Language Manager
// ===================================

const LanguageManager = {
    translations: {
        ar: {
            dashboard: 'لوحة القيادة',
            orders: 'الطلبات',
            shipping: 'الشحنات',
            products: 'المنتجات',
            inventory: 'المخزون',
            customers: 'العملاء',
            reports: 'التقارير',
            settings: 'الإعدادات',
            loginDesc: 'سجّل دخولك لإدارة شحناتك',
            searchPlaceholder: 'بحث في الطلبات، العملاء...',
            welcomeMessage: 'مرحباً بك في نظام الشحن',
            totalOrders: 'إجمالي الطلبات',
            pendingOrders: 'طلبات معلقة',
            shippedOrders: 'طلبات تم شحنها',
            deliveredOrders: 'طلبات تم تسليمها',
            totalRevenue: 'إجمالي الإيرادات',
            totalCustomers: 'إجمالي العملاء',
            totalProducts: 'إجمالي المنتجات',
            lowStock: 'منتجات منخفضة',
            recentActivity: 'النشاط الأخير'
        },
        en: {
            dashboard: 'Dashboard',
            orders: 'Orders',
            shipping: 'Shipping',
            products: 'Products',
            inventory: 'Inventory',
            customers: 'Customers',
            reports: 'Reports',
            settings: 'Settings',
            loginDesc: 'Sign in to manage your shipments',
            searchPlaceholder: 'Search orders, customers...',
            welcomeMessage: 'Welcome to Shipping System',
            totalOrders: 'Total Orders',
            pendingOrders: 'Pending Orders',
            shippedOrders: 'Shipped Orders',
            deliveredOrders: 'Delivered Orders',
            totalRevenue: 'Total Revenue',
            totalCustomers: 'Total Customers',
            totalProducts: 'Total Products',
            lowStock: 'Low Stock Items',
            recentActivity: 'Recent Activity'
        }
    },

    init() {
        const savedLang = Utils.storage.get('app_language', 'ar');
        this.setLanguage(savedLang);

        const langToggle = document.getElementById('lang-toggle');
        if (langToggle) {
            langToggle.addEventListener('click', () => {
                const newLang = AppState.language === 'ar' ? 'en' : 'ar';
                this.setLanguage(newLang);
                Toast.success(`Language changed to ${newLang === 'ar' ? 'العربية' : 'English'}`);
                
                // Reload current view
                navigateTo(AppState.currentRoute);
            });
        }
    },

    setLanguage(lang) {
        AppState.language = lang;
        document.documentElement.lang = lang;
        document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
        Utils.storage.set('app_language', lang);

        // Update lang button text
        const langToggle = document.getElementById('lang-toggle');
        if (langToggle) {
            langToggle.textContent = lang === 'ar' ? 'EN' : 'عربي';
        }

        // Translate all elements with data-i18n attribute
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (this.translations[lang]?.[key]) {
                el.textContent = this.translations[lang][key];
            }
        });

        // Translate placeholders
        document.querySelectorAll('[data-i18n-ph]').forEach(el => {
            const key = el.getAttribute('data-i18n-ph');
            if (this.translations[lang]?.[key]) {
                el.placeholder = this.translations[lang][key];
            }
        });
    },

    t(key) {
        return this.translations[AppState.language]?.[key] || key;
    }
};

// ===================================
// Navigation & Router
// ===================================

function navigateTo(route) {
    AppState.currentRoute = route;

    // Update active nav item
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.route === route);
    });

    // Load view
    loadView(route);

    // Close mobile sidebar
    document.getElementById('sidebar')?.classList.remove('mobile-open');
}

function loadView(route) {
    const contentArea = document.getElementById('content-area');
    
    // Show loading state
    contentArea.innerHTML = `
        <div class="page-loader">
            <div class="spinner"></div>
            <p style="color: var(--text-secondary); margin-top: 16px;">جاري التحميل...</p>
        </div>
    `;

    // Load appropriate view module
    setTimeout(() => {
        switch (route) {
            case 'dashboard':
                Dashboard.render(contentArea);
                break;
            case 'orders':
                Orders.render(contentArea);
                break;
            case 'shipping':
                Shipping.render(contentArea);
                break;
            case 'products':
                Products.render(contentArea);
                break;
            case 'inventory':
                Inventory.render(contentArea);
                break;
            case 'customers':
                Customers.render(contentArea);
                break;
            case 'reports':
                Reports.render(contentArea);
                break;
            case 'settings':
                Settings.render(contentArea);
                break;
            default:
                Dashboard.render(contentArea);
        }

        // Update page title
        document.title = `${LanguageManager.t(route)} | نظام الشحن`;
    }, 200);
}

// ===================================
// Modal Management
// ===================================

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
    }
}

// Close modal on backdrop click
document.querySelectorAll('.modal-overlay').forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.add('hidden');
            document.body.style.overflow = '';
        }
    });
});

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay:not(.hidden)').forEach(modal => {
            modal.classList.add('hidden');
        });
        document.body.style.overflow = '';
    }
});

// ===================================
// Password Visibility Toggle
// ===================================

window.togglePasswordVisibility = function(inputId, btn) {
    const input = document.getElementById(inputId);
    const icon = btn.querySelector('i');

    if (input.type === 'password') {
        input.type = 'text';
        icon.className = 'bx bx-hide';
    } else {
        input.type = 'password';
        icon.className = 'bx bx-show';
    }
};

// ===================================
// Logo Upload Preview
// ===================================

window.previewLogo = function(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        const preview = document.getElementById('logo-preview');
        
        reader.onload = function(e) {
            preview.innerHTML = `<img src="${e.target.result}" alt="Logo Preview">`;
            preview.classList.add('has-image');
            
            // Also update splash and sidebar logos temporarily
            const splashLogo = document.getElementById('splash-logo');
            if (splashLogo) {
                splashLogo.innerHTML = `<img src="${e.target.result}" alt="Store Logo" style="width:80px;height:80px;object-fit:contain;border-radius:20px;">`;
            }
        };
        
        reader.readAsDataURL(input.files[0]);
    }
};

// ===================================
// Quick Actions (FAB)
// ===================================

window.openQuickAction = function(action) {
    // Close FAB first
    closeFAB();

    switch (action) {
        case 'order':
            Orders.openCreateModal();
            break;
        case 'shipping':
            Shipping.openWaybillModal();
            break;
        case 'customer':
            Customers.openCreateModal();
            break;
    }
};

function toggleFAB() {
    const fabContainer = document.querySelector('.fab-container');
    const fabBtn = document.getElementById('fab-btn');
    
    fabContainer.classList.toggle('open');
    fabBtn.classList.toggle('active');
}

function closeFAB() {
    const fabContainer = document.querySelector('.fab-container');
    const fabBtn = document.getElementById('fab-btn');
    
    fabContainer?.classList.remove('open');
    fabBtn?.classList.remove('active');
}

// ===================================
// Profile Dropdown
// ===================================

const profileDropdown = document.getElementById('profile-dropdown');
if (profileDropdown) {
    profileDropdown.querySelector('.profile-btn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        profileDropdown.classList.toggle('open');
    });
}

// Close dropdown on outside click
document.addEventListener('click', () => {
    profileDropdown?.classList.remove('open');
});

// ===================================
// Mobile Menu
// ===================================

const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const sidebar = document.getElementById('sidebar');

if (mobileMenuBtn && sidebar) {
    mobileMenuBtn.addEventListener('click', () => {
        sidebar.classList.toggle('mobile-open');
        
        // Create overlay if needed
        let overlay = document.querySelector('.mobile-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'mobile-overlay';
            document.body.appendChild(overlay);
            overlay.addEventListener('click', () => {
                sidebar.classList.remove('mobile-open');
                overlay.classList.remove('active');
            });
        }
        
        overlay.classList.toggle('active', sidebar.classList.contains('mobile-open'));
    });
}

// ===================================
// Sidebar Toggle (Desktop)
// ===================================

const sidebarToggle = document.getElementById('toggle-sidebar');
if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
        Utils.storage.set('sidebar_collapsed', sidebar.classList.contains('collapsed'));
    });

    // Restore state
    if (Utils.storage.get('sidebar_collapsed')) {
        sidebar.classList.add('collapsed');
    }
}

// ===================================
// Global Search
// ===================================

const globalSearch = document.getElementById('global-search');
if (globalSearch) {
    globalSearch.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const query = globalSearch.value.trim();
            if (query) {
                navigateTo('orders');
                setTimeout(() => {
                    // Pass search query to orders view
                    if (typeof Orders !== 'undefined' && Orders.search) {
                        Orders.search(query);
                    }
                }, 300);
            }
        }
    });
}

// ===================================
// Keyboard Shortcuts
// ===================================

document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + K for search
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        globalSearch?.focus();
    }
    
    // Ctrl/Cmd + / for quick actions
    if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        toggleFAB();
    }
});

// ===================================
// Online/Offline Status
// ===================================

window.addEventListener('online', () => {
    AppState.isOnline = true;
    Toast.success('تم استعادة الاتصال بالإنترنت');
});

window.addEventListener('offline', () => {
    AppState.isOnline = false;
    Toast.warning('أنت غير متصل بالإنترنت - بعض الميزات قد لا تعمل');
});

// ===================================
// Logout Handler
// ===================================

window.handleLogout = function() {
    if (confirm('هل أنت متأكد من تسجيل الخروج؟')) {
        // Clear session
        Utils.storage.remove('user_session');
        
        // Show login screen
        document.getElementById('app-container')?.classList.add('hidden');
        document.getElementById('login-screen')?.classList.remove('hidden');
        
        Toast.info('تم تسجيل الخروج بنجاح');
    }
};

// ===================================
// Initialize Application
// ===================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Initializing Shipping PWA...');

    // Initialize core modules
    Toast.init();
    PWAInstaller.init();
    ThemeManager.init();
    LanguageManager.init();

    // Initialize FAB
    const fabBtn = document.getElementById('fab-btn');
    if (fabBtn) {
        fabBtn.addEventListener('click', toggleFAB);
    }

    // Check for existing session
    const userSession = Utils.storage.get('user_session');
    
    // Simulate loading delay for splash screen effect
    setTimeout(() => {
        const splashScreen = document.getElementById('splash-screen');
        
        if (userSession) {
            // User has session - show app
            AppState.currentUser = userSession;
            updateUIForUser(userSession);
            
            splashScreen?.classList.add('hidden');
            document.getElementById('app-container')?.classList.remove('hidden');
            
            // Load default view
            navigateTo('dashboard');
            
            Toast.success(LanguageManager.t('welcomeMessage'));
        } else {
            // No session - show login
            splashScreen?.classList.add('hidden');
            document.getElementById('login-screen')?.classList.remove('hidden');
        }
    }, 1500);

    // Setup form handlers
    setupLoginForm();
    setupRegisterForm();

    console.log('✅ Shipping PWA Initialized Successfully!');
});

// ===================================
// UI Update Functions
// ===================================

function updateUIForUser(user) {
    // Update header avatar and name
    const headerAvatar = document.getElementById('header-avatar');
    const headerName = document.getElementById('header-user-name');
    const sidebarAvatar = document.getElementById('sidebar-user-avatar');
    const sidebarName = document.getElementById('sidebar-user-name');

    if (headerAvatar) headerAvatar.src = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}&background=2563eb&color=fff`;
    if (headerName) headerName.textContent = user.name || 'مدير النظام';
    if (sidebarAvatar) sidebarAvatar.src = headerAvatar?.src;
    if (sidebarName) sidebarName.textContent = user.name || 'المستخدم';

    // Load store config
    loadStoreConfig();
}

function loadStoreConfig() {
    const config = Utils.storage.get('store_config');
    AppState.storeConfig = config;

    if (config) {
        // Update store branding throughout app
        updateStoreBranding(config);
    }
}

function updateStoreBranding(config) {
    // Sidebar logo
    const sidebarLogoImg = document.getElementById('store-logo-img');
    const sidebarIcon = document.getElementById('sidebar-icon');
    const sidebarStoreName = document.getElementById('sidebar-store-name');
    
    if (config.logo && sidebarLogoImg) {
        sidebarLogoImg.src = config.logo;
        sidebarLogoImg.classList.remove('hidden');
        sidebarIcon?.classList.add('hidden');
    }
    
    if (config.name && sidebarStoreName) {
        sidebarStoreName.textContent = config.name;
    }

    // Login/Splash logos
    const loginLogo = document.getElementById('login-logo');
    const loginAppName = document.getElementById('login-app-name');
    const splashLogo = document.getElementById('splash-logo');
    const splashTitle = document.getElementById('splash-title');

    if (config.logo) {
        const logoHtml = `<img src="${config.logo}" alt="${config.name}" style="width:56px;height:56px;object-fit:contain;border-radius:16px;">`;
        if (loginLogo) loginLogo.innerHTML = logoHtml;
        if (splashLogo) splashLogo.innerHTML = `<img src="${config.logo}" alt="${config.name}" style="width:80px;height:80px;object-fit:contain;border-radius:20px;">`;
    }

    if (config.name) {
        if (loginAppName) loginAppName.textContent = config.name;
        if (splashTitle) splashTitle.textContent = config.name;
    }

    // Page title
    document.title = `${config.name || 'نظام الشحن'} - نظام إدارة الشحن والمخازن`;
}

// ===================================
// Login Form Handler
// ===================================

function setupLoginForm() {
    const loginForm = document.getElementById('login-form');
    
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('login-email').value.trim();
            const password = document.getElementById('login-password').value;
            const btn = document.getElementById('btn-login');
            
            // Validation
            if (!email || !password) {
                Toast.error('يرجى إدخال البريد الإلكتروني وكلمة المرور');
                return;
            }

            // Show loading state
            btn.disabled = true;
            btn.innerHTML = '<div class="spinner spinner-sm"></div> جاري تسجيل الدخول...';

            try {
                // Simulate authentication (replace with real auth)
                await new Promise(resolve => setTimeout(resolve, 1500));

                // Create mock user session
                const userData = {
                    id: Utils.generateId(),
                    name: email.split('@')[0],
                    email: email,
                    role: 'admin',
                    createdAt: new Date().toISOString()
                };

                // Save session
                Utils.storage.set('user_session', userData);
                AppState.currentUser = userData;

                // Update UI
                updateUIForUser(userData);

                // Show app
                document.getElementById('login-screen')?.classList.add('hidden');
                document.getElementById('app-container')?.classList.remove('hidden');

                // Navigate to dashboard
                navigateTo('dashboard');
                
                Toast.success(LanguageManager.t('welcomeMessage'));

            } catch (error) {
                Toast.error('فشل تسجيل الدخول: ' + error.message);
            } finally {
                btn.disabled = false;
                btn.innerHTML = '<i class=\'bx bx-log-in\'></i> <span>تسجيل الدخول</span>';
            }
        });
    }

    // Google login button (placeholder)
    const googleBtn = document.getElementById('btn-google-login');
    if (googleBtn) {
        googleBtn.addEventListener('click', async () => {
            googleBtn.disabled = true;
            googleBtn.innerHTML = '<div class="spinner spinner-sm"></div> جاري التحويل...';

            // Simulate Google auth
            await new Promise(resolve => setTimeout(resolve, 1500));

            const userData = {
                id: Utils.generateId(),
                name: 'مستخدم Google',
                email: 'user@gmail.com',
                photoURL: 'https://ui-avatars.com/api/?name=Google+User&background=2563eb&color=fff',
                role: 'admin',
                createdAt: new Date().toISOString()
            };

            Utils.storage.set('user_session', userData);
            AppState.currentUser = userData;
            updateUIForUser(userData);

            document.getElementById('login-screen')?.classList.add('hidden');
            document.getElementById('app-container')?.classList.remove('hidden');
            navigateTo('dashboard');

            Toast.success(LanguageManager.t('welcomeMessage'));

            googleBtn.disabled = false;
            googleBtn.innerHTML = '<i class=\'bx bxl-google\'></i> المتابعة بـ Google';
        });
    }

    // Register link
    const registerLink = document.getElementById('show-register');
    if (registerLink) {
        registerLink.addEventListener('click', (e) => {
            e.preventDefault();
            openModal('register-modal');
        });
    }
}

// ===================================
// Register Form Handler
// ===================================

function setupRegisterForm() {
    const registerForm = document.getElementById('register-form');
    
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const storeName = document.getElementById('reg-store-name').value.trim();
            const name = document.getElementById('reg-name').value.trim();
            const email = document.getElementById('reg-email').value.trim();
            const password = document.getElementById('reg-password').value;
            const confirm = document.getElementById('reg-confirm').value;
            const phone = document.getElementById('reg-store-phone').value.trim();
            const address = document.getElementById('reg-store-address').value.trim();

            // Validation
            if (!storeName || !name || !email || !password) {
                Toast.error('يرجى ملء جميع الحقول المطلوبة');
                return;
            }

            if (password.length < 6) {
                Toast.error('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
                return;
            }

            if (password !== confirm) {
                Toast.error('كلمتا المرور غير متطابقتين');
                return;
            }

            const submitBtn = registerForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<div class="spinner spinner-sm"></div> جاري إنشاء الحساب...';

            try {
                // Get logo if uploaded
                const logoInput = document.getElementById('reg-store-logo');
                let logoData = null;
                
                if (logoInput.files && logoInput.files[0]) {
                    logoData = await new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onload = (e) => resolve(e.target.result);
                        reader.readAsDataURL(logoInput.files[0]);
                    });
                }

                // Create store config
                const storeConfig = {
                    name: storeName,
                    logo: logoData,
                    phone: phone,
                    address: address,
                    createdAt: new Date().toISOString()
                };

                // Save store config
                Utils.storage.set('store_config', storeConfig);
                AppState.storeConfig = storeConfig;

                // Create user data
                const userData = {
                    id: Utils.generateId(),
                    name: name,
                    email: email,
                    role: 'admin',
                    storeName: storeName,
                    createdAt: new Date().toISOString()
                };

                // Save session
                Utils.storage.set('user_session', userData);
                AppState.currentUser = userData;

                // Update UI
                updateStoreBranding(storeConfig);
                updateUIForUser(userData);

                // Close modal and show app
                closeModal('register-modal');
                document.getElementById('login-screen')?.classList.add('hidden');
                document.getElementById('app-container')?.classList.remove('hidden');

                navigateTo('dashboard');

                Toast.success('تم إنشاء حسابك بنجاح! مرحباً بك 🎉');

            } catch (error) {
                Toast.error('حدث خطأ: ' + error.message);
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class=\'bx bx-user-plus\'></i> إنشاء الحساب';
            }
        });
    }
}

// ===================================
// Export functions for global access
// ===================================

window.navigateTo = navigateTo;
window.openModal = openModal;
window.closeModal = closeModal;
window.Toast = Toast;
window.Utils = Utils;
