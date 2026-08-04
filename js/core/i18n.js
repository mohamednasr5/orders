
export const translations = {
    ar: {
        title: "نظام إدارة الطلبات | SaaS OMS", loading: "جاري تهيئة النظام...",
        dashboard: "لوحة القيادة", orders: "الطلبات", products: "المنتجات",
        inventory: "المخزون", crm: "العملاء (CRM)", reports: "التقارير", settings: "الإعدادات",
        searchPlaceholder: "البحث برقم الطلب، العميل...", loginDesc: "الرجاء تسجيل الدخول للوصول إلى النظام",
        loginGoogle: "تسجيل الدخول باستخدام Google", totalSales: "إجمالي المبيعات",
        totalOrders: "الطلبات", activeCustomers: "العملاء", pendingShipments: "شحنات معلقة",
        salesAnalytics: "المبيعات", recentOrders: "أحدث الطلبات", orderId: "رقم الطلب",
        customer: "العميل", date: "التاريخ", amount: "المبلغ", status: "الحالة", action: "الإجراء",
        status_pending: "قيد المراجعة", status_shipped: "تم الشحن", status_delivered: "تم التوصيل",
        status_cancelled: "ملغي", newOrder: "طلب جديد", viewDetails: "تفاصيل", currency: "ج.م",
        addProduct: "إضافة منتج", productName: "اسم المنتج", price: "السعر", stock: "الكمية",
        addCustomer: "إضافة عميل", email: "البريد الإلكتروني", phone: "الهاتف", save: "حفظ",
        langToggleText: "EN", welcomeMessage: "تم تسجيل الدخول بنجاح!"
    },
    en: {
        title: "SaaS OMS | Enterprise Order Management", loading: "Initializing System...",
        dashboard: "Dashboard", orders: "Orders", products: "Products",
        inventory: "Inventory", crm: "Customers (CRM)", reports: "Reports", settings: "Settings",
        searchPlaceholder: "Search by Order ID, Customer...", loginDesc: "Please login to access the system",
        loginGoogle: "Sign in with Google", totalSales: "Total Revenue",
        totalOrders: "Total Orders", activeCustomers: "Customers", pendingShipments: "Pending Shipments",
        salesAnalytics: "Sales Analytics", recentOrders: "Recent Orders", orderId: "Order ID",
        customer: "Customer", date: "Date", amount: "Amount", status: "Status", action: "Action",
        status_pending: "Pending", status_shipped: "Shipped", status_delivered: "Delivered",
        status_cancelled: "Cancelled", newOrder: "New Order", viewDetails: "Details", currency: "EGP",
        addProduct: "Add Product", productName: "Product Name", price: "Price", stock: "Stock",
        addCustomer: "Add Customer", email: "Email", phone: "Phone", save: "Save Settings",
        langToggleText: "عربي", welcomeMessage: "Logged in successfully!"
    }
};

export let currentLang = localStorage.getItem('saas_lang') || 'ar';
export function setLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('saas_lang', lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
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
export function t(key) { return translations[currentLang][key] || key; }
