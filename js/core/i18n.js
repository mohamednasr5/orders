
export const translations = {
    ar: {
        title: "نظام إدارة الطلبات | SaaS OMS",
        loading: "جاري تهيئة النظام الشامل...",
        dashboard: "لوحة القيادة",
        orders: "إدارة الطلبات",
        products: "المنتجات والفئات",
        inventory: "المخازن والمخزون",
        crm: "العملاء (CRM)",
        reports: "التقارير الذكية",
        settings: "إعدادات المتجر",
        searchPlaceholder: "البحث برقم الطلب، اسم العميل، التتبع...",
        totalSales: "إجمالي المبيعات",
        totalOrders: "إجمالي الطلبات",
        activeCustomers: "العملاء النشطين",
        pendingShipments: "شحنات قيد الانتظار",
        salesAnalytics: "تحليلات المبيعات (شهري)",
        recentOrders: "أحدث الطلبات",
        orderId: "رقم الطلب",
        customer: "العميل",
        date: "التاريخ",
        amount: "المبلغ",
        status: "الحالة",
        action: "الإجراء",
        status_pending: "قيد المراجعة",
        status_shipped: "تم الشحن",
        status_delivered: "تم التوصيل",
        status_cancelled: "ملغي",
        newOrder: "إنشاء طلب جديد",
        viewDetails: "عرض التفاصيل",
        currency: "ج.م",
        langToggleText: "EN",
        welcomeMessage: "مرحباً، تم تحميل النظام بنجاح!"
    },
    en: {
        title: "SaaS OMS | Enterprise Order Management",
        loading: "Initializing Enterprise System...",
        dashboard: "Dashboard",
        orders: "Order Management",
        products: "Products & Categories",
        inventory: "Warehouses & Stock",
        crm: "Customers (CRM)",
        reports: "Smart Reports",
        settings: "Store Settings",
        searchPlaceholder: "Search by Order ID, Customer, Tracking...",
        totalSales: "Total Revenue",
        totalOrders: "Total Orders",
        activeCustomers: "Active Customers",
        pendingShipments: "Pending Shipments",
        salesAnalytics: "Sales Analytics (Monthly)",
        recentOrders: "Recent Orders",
        orderId: "Order ID",
        customer: "Customer",
        date: "Date",
        amount: "Amount",
        status: "Status",
        action: "Action",
        status_pending: "Pending",
        status_shipped: "Shipped",
        status_delivered: "Delivered",
        status_cancelled: "Cancelled",
        newOrder: "Create New Order",
        viewDetails: "View Details",
        currency: "EGP",
        langToggleText: "عربي",
        welcomeMessage: "Welcome, System loaded successfully!"
    }
};

export let currentLang = localStorage.getItem('saas_lang') || 'ar';

export function setLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('saas_lang', lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    
    // Update static HTML elements
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[lang][key]) {
            if(el.tagName === 'TITLE') document.title = translations[lang][key];
            else el.textContent = translations[lang][key];
        }
    });

    document.querySelectorAll('[data-i18n-ph]').forEach(el => {
        const key = el.getAttribute('data-i18n-ph');
        if (translations[lang][key]) el.placeholder = translations[lang][key];
    });

    const langToggle = document.getElementById('lang-toggle');
    if (langToggle) langToggle.textContent = translations[lang].langToggleText;
}

export function t(key) {
    return translations[currentLang][key] || key;
}
