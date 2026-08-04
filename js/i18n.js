const translations = {
    en: {
        title: "Enterprise SaaS Order Management",
        dashboard: "Dashboard",
        orders: "Orders",
        products: "Products",
        inventory: "Inventory",
        crm: "CRM",
        settings: "Settings",
        menu: "Menu",
        login: "Google Login",
        welcome: "Welcome to the Enterprise OMS",
        selectModule: "Select a module to begin.",
        toggleLang: "العربية"
    },
    ar: {
        title: "نظام إدارة الطلبات المؤسسي",
        dashboard: "لوحة القيادة",
        orders: "الطلبات",
        products: "المنتجات",
        inventory: "المخزون",
        crm: "إدارة العملاء",
        settings: "الإعدادات",
        menu: "القائمة",
        login: "تسجيل الدخول بـ Google",
        welcome: "مرحباً بك في نظام إدارة الطلبات",
        selectModule: "اختر وحدة للبدء.",
        toggleLang: "English"
    }
};

export function initI18n() {
    let currentLang = localStorage.getItem('appLang') || 'ar';
    setLanguage(currentLang);

    const langBtn = document.getElementById('lang-toggle');
    if (langBtn) {
        langBtn.addEventListener('click', () => {
            currentLang = currentLang === 'ar' ? 'en' : 'ar';
            setLanguage(currentLang);
        });
    }
}

function setLanguage(lang) {
    localStorage.setItem('appLang', lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[lang][key]) {
            el.textContent = translations[lang][key];
        }
    });
}