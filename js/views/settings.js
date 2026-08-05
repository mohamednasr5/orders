/**
 * ===================================
 * Settings View Module
 * ===================================
 */

const Settings = {
    render(container) {
        const storeConfig = AppState.storeConfig || Utils.storage.get('store_config') || {};
        const user = AppState.currentUser || {};

        container.innerHTML = `
            <div class="view-content">
                <div class="page-header">
                    <h1 class="page-title"><i class='bx bx-cog'></i> الإعدادات</h1>
                    <p class="page-subtitle">تخصيص النظام وإدارة بيانات متجرك</p>
                </div>

                <!-- Settings Tabs -->
                <div class="settings-tabs">
                    <button class="settings-tab active" onclick="Settings.showTab('store')">
                        <i class='bx bx-store'></i> بيانات المتجر
                    </button>
                    <button class="settings-tab" onclick="Settings.showTab('shipping')">
                        <i class='bx bx-truck'></i> الشحن
                    </button>
                    <button class="settings-tab" onclick="Settings.showTab('notifications')">
                        <i class='bx bx-bell'></i> الإشعارات
                    </button>
                    <button class="settings-tab" onclick="Settings.showTab('appearance')">
                        <i class='bx bx-palette'></i> المظهر
                    </button>
                    <button class="settings-tab" onclick="Settings.showTab('data')">
                        <i class='bx bx-data'></i> البيانات
                    </button>
                    <button class="settings-tab" onclick="Settings.showTab('about')">
                        <i class='bx bx-info-circle'></i> حول
                    </button>
                </div>

                <!-- Settings Content -->
                <div id="settings-content">
                    ${this.renderStoreSettings(storeConfig)}
                </div>
            </div>
        `;
    },

    showTab(tabName) {
        // Update active tab
        document.querySelectorAll('.settings-tab').forEach(tab => {
            tab.classList.toggle('active', tab.onclick.toString().includes(`'${tabName}'`));
        });

        const content = document.getElementById('settings-content');
        
        switch (tabName) {
            case 'store':
                content.innerHTML = this.renderStoreSettings(Utils.storage.get('store_config') || {});
                break;
            case 'shipping':
                content.innerHTML = this.renderShippingSettings();
                break;
            case 'notifications':
                content.innerHTML = this.renderNotificationSettings();
                break;
            case 'appearance':
                content.innerHTML = this.renderAppearanceSettings();
                break;
            case 'data':
                content.innerHTML = this.renderDataSettings();
                break;
            case 'about':
                content.innerHTML = this.renderAboutSection();
                break;
        }
    },

    renderStoreSettings(config) {
        return `
            <div class="card settings-card">
                <div class="card-header">
                    <h3><i class='bx bx-store-alt'></i> بيانات المتجر</h3>
                </div>
                <div class="card-body">
                    <!-- Store Logo -->
                    <div class="form-group">
                        <label><i class='bx bx-image'></i> شعار المتجر</label>
                        <div class="logo-upload" id="settings-logo-upload">
                            <input type="file" id="settings-logo-input" accept="image/*" onchange="Settings.previewLogo(this)">
                            <div class="upload-placeholder" id="settings-logo-preview">
                                ${config.logo 
                                    ? `<img src="${config.logo}" alt="Store Logo">` 
                                    : '<i class=\'bx bx-cloud-upload\' style="font-size:36px;"></i><span>اضغط لرفع الشعار</span>'}
                            </div>
                        </div>
                    </div>

                    <!-- Store Name -->
                    <div class="form-group">
                        <label><i class='bx bx-building-house'></i> اسم المتجر *</label>
                        <input type="text" id="settings-store-name" value="${config.name || ''}" 
                               placeholder="اسم متجرك على التطبيق">
                    </div>

                    <!-- Contact Info -->
                    <div class="form-row">
                        <div class="form-group flex-1">
                            <label><i class='bx bx-phone'></i> هاتف المتجر</label>
                            <input type="tel" id="settings-phone" value="${config.phone || ''}" placeholder="01xxxxxxxxx">
                        </div>
                        <div class="form-group flex-1">
                            <label><i class='bx bx-envelope'></i> البريد الإلكتروني</label>
                            <input type="email" id="settings-email" value="${config.email || ''}" placeholder="store@email.com">
                        </div>
                    </div>

                    <!-- Address -->
                    <div class="form-group">
                        <label><i class='bx bx-map'></i> عنوان المتجر</label>
                        <textarea id="settings-address" rows="2" placeholder="العنوان الكامل">${config.address || ''}</textarea>
                    </div>

                    <!-- Social Links -->
                    <div class="form-row">
                        <div class="form-group flex-1">
                            <label><i class='bx bxl-facebook'></i> فيسبوك</label>
                            <input type="url" id="settings-facebook" value="${config.facebook || ''}" placeholder="https://facebook.com/...">
                        </div>
                        <div class="form-group flex-1">
                            <label><i class='bx bxl-instagram'></i> إنستغرام</label>
                            <input type="url" id="settings-instagram" value="${config.instagram || ''}" placeholder="https://instagram.com/...">
                        </div>
                    </div>

                    <div class="form-actions">
                        <button class="btn-primary" onclick="Settings.saveStoreConfig()">
                            <i class='bx bx-check'></i> حفظ التغييرات
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    renderShippingSettings() {
        const shippingConfig = Utils.storage.get('shipping_config') || {};
        
        return `
            <div class="card settings-card">
                <div class="card-header">
                    <h3><i class='bx bx-truck'></i> إعدادات الشحن</h3>
                </div>
                <div class="card-body">
                    <div class="form-group">
                        <label>الشركة الافتراضية للشحن</label>
                        <select id="default-shipping-company">
                            <option value="">اختر شركة افتراضية</option>
                            <option value="aramex" ${shippingConfig.defaultCompany === 'aramex' ? 'selected' : ''}>أرامكس</option>
                            <option value="smsamisr" ${shippingConfig.defaultCompany === 'smsamisr' ? 'selected' : ''}>سمسام إيجر</option>
                            <option value="bosta" ${shippingConfig.defaultCompany === 'bosta' ? 'selected' : ''}>بوسطة</option>
                            <option value="h3odi" ${shippingConfig.defaultCompany === 'h3odi' ? 'selected' : ''}>حوضي</option>
                            <option value="emsellem" ${shippingConfig.defaultCompany === 'emsellem' ? 'selected' : ''}>إمسلم</option>
                            <option value="sprint" ${shippingConfig.defaultCompany === 'sprint' ? 'selected' : ''}>سبرينت</option>
                        </select>
                    </div>

                    <div class="form-row">
                        <div class="form-group flex-1">
                            <label>مدينة المرسل الافتراضية</label>
                            <input type="text" id="default-sender-city" value="${shippingConfig.senderCity || 'القاهرة'}">
                        </div>
                        <div class="form-group flex-1">
                            <label>عنوان المستودع</label>
                            <input type="text" id="warehouse-address" value="${shippingConfig.warehouseAddress || ''}">
                        </div>
                    </div>

                    <div class="setting-item" style="margin:20px 0;">
                        <span class="setting-label"><i class='bx bx-barcode'></i> تفعيل QR Code</span>
                        <label class="toggle-switch">
                            <input type="checkbox" id="qr-enabled" ${shippingConfig.qrEnabled !== false ? 'checked' : ''}>
                            <span class="toggle-slider"></span>
                        </label>
                    </div>

                    <div class="setting-item" style="margin:20px 0;">
                        <span class="setting-label"><i class='bx bx-printer'></i> طباعة البوليصة تلقائياً</span>
                        <label class="toggle-switch">
                            <input type="checkbox" id="auto-print" ${shippingConfig.autoPrint ? 'checked' : ''}>
                            <span class="toggle-slider"></span>
                        </label>
                    </div>

                    <div class="form-actions">
                        <button class="btn-primary" onclick="Settings.saveShippingConfig()">
                            <i class='bx bx-check'></i> حفظ إعدادات الشحن
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    renderNotificationSettings() {
        const notifConfig = Utils.storage.get('notification_config') || {};

        return `
            <div class="card settings-card">
                <div class="card-header">
                    <h3><i class='bx bx-bell'></i> إعدادات الإشعارات</h3>
                </div>
                <div class="card-body">
                    <div class="setting-item" style="padding:16px 0;border-bottom:1px solid var(--border-color);">
                        <span class="setting-label"><i class='bx bx-cart'></i> إشعارات الطلبات الجديدة</span>
                        <label class="toggle-switch">
                            <input type="checkbox" id="notif-orders" ${notifConfig.orders !== false ? 'checked' : ''}>
                            <span class="toggle-slider"></span>
                        </label>
                    </div>

                    <div class="setting-item" style="padding:16px 0;border-bottom:1px solid var(--border-color);">
                        <span class="setting-label"><i class='bx bx-truck'></i> إشعارات حالة الشحن</span>
                        <label class="toggle-switch">
                            <input type="checkbox" id="notif-shipping" ${notifConfig.shipping !== false ? 'checked' : ''}>
                            <span class="toggle-slider"></span>
                        </label>
                    </div>

                    <div class="setting-item" style="padding:16px 0;border-bottom:1px solid var(--border-color);">
                        <span class="setting-label"><i class='bx bx-error'></i> تنبيهات المخزون المنخفض</span>
                        <label class="toggle-switch">
                            <input type="checkbox" id="notif-low-stock" ${notifConfig.lowStock !== false ? 'checked' : ''}>
                            <span class="toggle-slider"></span>
                        </label>
                    </div>

                    <div class="setting-item" style="padding:16px 0;">
                        <span class="setting-label"><i class='bx bx-volume-full'></i> الصوت</span>
                        <label class="toggle-switch">
                            <input type="checkbox" id="notif-sound" ${notifConfig.sound !== false ? 'checked' : ''}>
                            <span class="toggle-slider"></span>
                        </label>
                    </div>

                    <div class="form-actions">
                        <button class="btn-primary" onclick="Settings.saveNotificationConfig()">
                            <i class='bx bx-check'></i> حفظ الإعدادات
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    renderAppearanceSettings() {
        return `
            <div class="card settings-card">
                <div class="card-header">
                    <h3><i class='bx bx-palette'></i> المظهر واللغة</h3>
                </div>
                <div class="card-body">
                    <div class="setting-item" style="padding:16px 0;">
                        <span class="setting-label"><i class='bx bx-moon'></i> الوضع الداكن</span>
                        <label class="toggle-switch">
                            <input type="checkbox" id="theme-toggle-setting" ${AppState.theme === 'dark' ? 'checked' : ''}
                                   onchange="ThemeManager.setTheme(this.checked ? 'dark' : 'light')">
                            <span class="toggle-slider"></span>
                        </label>
                    </div>

                    <div class="setting-item" style="padding:16px 0;">
                        <span class="setting-label"><i class='bx bx-globe'></i> اللغة / Language</span>
                        <div style="display:flex;gap:8px;">
                            <button class="btn-sm btn-primary ${AppState.language === 'ar' ? '' : 'btn-outline'}"
                                    onclick="LanguageManager.setLanguage('ar');Settings.showTab('appearance')"
                                    style="flex:1;">العربية</button>
                            <button class="btn-sm ${AppState.language === 'en' ? 'btn-primary' : 'btn-outline'}"
                                    onclick="LanguageManager.setLanguage('en');Settings.showTab('appearance')"
                                    style="flex:1;">English</button>
                        </div>
                    </div>

                    <div class="form-group" style="margin-top:20px;">
                        <label>تنسيق التاريخ</label>
                        <select id="date-format" onchange="Utils.storage.set('date_format', this.value)">
                            <option value="dd/mm/yyyy" ${Utils.storage.get('date_format') === 'dd/mm/yyyy' ? 'selected' : ''}>DD/MM/YYYY</option>
                            <option value="mm/dd/yyyy" ${Utils.storage.get('date_format') === 'mm/dd/yyyy' ? 'selected' : ''}>MM/DD/YYYY</option>
                            <option value="yyyy-mm-dd" ${Utils.storage.get('date_format') === 'yyyy-mm-dd' ? 'selected' : ''}>YYYY-MM-DD</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label>عملة العرض</label>
                        <select id="currency-format" onchange="Utils.storage.set('currency', this.value)">
                            <option value="EGP" ${Utils.storage.get('currency') === 'EGP' ? 'selected' : ''}>EGP - جنيه مصري</option>
                            <option value="USD" ${Utils.storage.get('currency') === 'USD' ? 'selected' : ''}>USD - دولار أمريكي</option>
                            <option value="SAR" ${Utils.storage.get('currency') === 'SAR' ? 'selected' : ''}>SAR - ريال سعودي</option>
                        </select>
                    </div>
                </div>
            </div>
        `;
    },

    renderDataSettings() {
        const ordersCount = Utils.storage.get('orders', []).length;
        const productsCount = Utils.storage.get('products', []).length;
        const customersCount = Utils.storage.get('customers', []).length;
        const shipmentsCount = Utils.storage.get('shipments', []).length;

        return `
            <div class="card settings-card">
                <div class="card-header">
                    <h3><i class='bx bx-data'></i> إدارة البيانات</h3>
                </div>
                <div class="card-body">
                    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-bottom:24px;padding:16px;background:var(--bg-tertiary);border-radius:8px;">
                        <div style="text-align:center;"><strong>${ordersCount}</strong><br><small>طلب</small></div>
                        <div style="text-align:center;"><strong>${productsCount}</strong><br><small>منتج</small></div>
                        <div style="text-align:center;"><strong>${customersCount}</strong><br><small>عميل</small></div>
                        <div style="text-align:center;"><strong>${shipmentsCount}</strong><br><small>شحنة</small></div>
                    </div>

                    <div style="display:flex;flex-direction:column;gap:12px;">
                        <button class="btn-outline" onclick="Settings.exportAllData()">
                            <i class='bx bx-download'></i> تصدير جميع البيانات (JSON)
                        </button>
                        
                        <button class="btn-outline" onclick="Settings.exportCSV()">
                            <i class='bx bx-table'></i> تصدير كـ CSV
                        </button>

                        <button class="btn-outline" style="color:var(--warning);border-color:var(--warning);" 
                                onclick="Settings.clearCache()">
                            <i class='bx bx-trash'></i> مسح ذاكرة التخزين المؤقت
                        </button>

                        <button class="btn-danger" onclick="Settings.confirmResetData()">
                            <i class='bx bx-reset'></i> إعادة تعيين جميع البيانات
                        </button>
                    </div>

                    <div style="margin-top:24px;padding:16px;background:var(--warning-light);border-radius:8px;border:1px solid var(--warning);">
                        <strong style="color:var(--warning);"><i class='bx bx-info-circle'></i> تحذير:</strong>
                        <p style="font-size:13px;margin-top:8px;color:var(--text-secondary);">
                            جميع البيانات مخزنة محلياً في المتصفح. مسح البيانات لا يمكن التراجع عنه.
                        </p>
                    </div>
                </div>
            </div>
        `;
    },

    renderAboutSection() {
        return `
            <div class="card settings-card">
                <div class="card-header">
                    <h3><i class='bx bx-info-circle'></i> حول النظام</h3>
                </div>
                <div class="card-body" style="text-align:center;">
                    <div style="
                        width:100px;height:100px;background:var(--primary-gradient);border-radius:24px;
                        display:inline-flex;align-items:center;justify-content:center;
                        margin-bottom:20px;font-size:48px;color:white;
                    ">
                        <i class='bx bx-package'></i>
                    </div>
                    
                    <h2 style="font-size:24px;margin-bottom:8px;">نظام إدارة الشحن والمخازن</h2>
                    <p style="color:var(--text-secondary);max-width:400px;margin:0 auto 24px;">
                        تطبيق PWA احترافي لإدارة الطلبات والشحنات مع دعم شركات الشحن المتعددة
                    </p>

                    <div style="display:flex;justify-content:center;gap:12px;flex-wrap:wrap;margin-bottom:24px;">
                        <span class="badge badge-primary">HTML5</span>
                        <span class="badge badge-success">CSS3</span>
                        <span class="badge badge-warning">JavaScript</span>
                        <span class="badge badge-info">PWA</span>
                        <span class="badge badge-purple">Barcode</span>
                    </div>

                    <div style="background:var(--bg-tertiary);padding:16px;border-radius:8px;text-align:right;display:inline-block;min-width:300px;">
                        <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border-color);">
                            <span>الإصدار</span>
                            <strong>v2.0.0</strong>
                        </div>
                        <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border-color);">
                            <span>آخر تحديث</span>
                            <strong>${new Date().toLocaleDateString('ar-EG')}</strong>
                        </div>
                        <div style="display:flex;justify-content:space-between;padding:6px 0;">
                            <span>المطور</span>
                            <strong>SaaS Team</strong>
                        </div>
                    </div>

                    <div style="margin-top:24px;">
                        <a href="#" class="btn-outline btn-sm" onclick="Toast.info('قريباً...')">
                            <i class='bx bx-support'></i> الدعم الفني
                        </a>
                    </div>
                </div>
            </div>
        `;
    },

    // Action Methods

    previewLogo(input) {
        if (input.files && input.files[0]) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const preview = document.getElementById('settings-logo-preview');
                preview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
                preview.classList.add('has-image');
            };
            reader.readAsDataURL(input.files[0]);
        }
    },

    saveStoreConfig() {
        let logoData = null;
        const previewImg = document.querySelector('#settings-logo-preview img');
        if (previewImg && previewImg.src.startsWith('data:')) {
            logoData = previewImg.src;
        } else {
            logoData = (AppState.storeConfig || {}).logo;
        }

        const config = {
            name: document.getElementById('settings-store-name').value.trim(),
            logo: logoData,
            phone: document.getElementById('settings-phone').value.trim(),
            email: document.getElementById('settings-email').value.trim(),
            address: document.getElementById('settings-address').value.trim(),
            facebook: document.getElementById('settings-facebook').value.trim(),
            instagram: document.getElementById('settings-instagram').value.trim(),
            updatedAt: new Date().toISOString()
        };

        if (!config.name) { Toast.error('يرجى إدخال اسم المتجر'); return; }

        Utils.storage.set('store_config', config);
        AppState.storeConfig = config;

        // Update UI branding
        updateStoreBranding(config);

        Toast.success('تم حفظ بيانات المتجر بنجاح! 🎉');
    },

    saveShippingConfig() {
        const config = {
            defaultCompany: document.getElementById('default-shipping-company').value,
            senderCity: document.getElementById('default-sender-city').value,
            warehouseAddress: document.getElementById('warehouse-address').value,
            qrEnabled: document.getElementById('qr-enabled').checked,
            autoPrint: document.getElementById('auto-print').checked,
            updatedAt: new Date().toISOString()
        };

        Utils.storage.set('shipping_config', config);
        Toast.success('تم حفظ إعدادات الشحن');
    },

    saveNotificationConfig() {
        const config = {
            orders: document.getElementById('notif-orders').checked,
            shipping: document.getElementById('notif-shipping').checked,
            lowStock: document.getElementById('notif-low-stock').checked,
            sound: document.getElementById('notif-sound').checked,
            updatedAt: new Date().toISOString()
        };

        Utils.storage.set('notification_config', config);
        Toast.success('تم حفظ إعدادات الإشعارات');
    },

    exportAllData() {
        const data = {
            exportDate: new Date().toISOString(),
            version: '2.0.0',
            storeConfig: Utils.storage.get('store_config'),
            orders: Utils.storage.get('orders', []),
            products: Utils.storage.get('products', []),
            customers: Utils.storage.get('customers', []),
            shipments: Utils.storage.get('shipments', [])
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        Toast.success('تم تصدير النسخة الاحتياطية');
    },

    exportCSV() {
        Reports?.exportAll?.() || Toast.info('انتقل إلى صفحة التقارير للتصدير');
    },

    clearCache() {
        if (!confirm('مسح ذاكرة التخزين المؤقت؟')) return;
        
        localStorage.removeItem('app_theme');
        localStorage.removeItem('app_language');
        localStorage.removeItem('sidebar_collapsed');
        localStorage.removeItem('pwa_install_dismissed');

        if ('caches' in window) {
            caches.keys().then(names => names.forEach(name => caches.delete(name)));
        }

        Toast.success('تم مسح ذاكرة التخزين المؤقت');
        setTimeout(() => window.location.reload(), 500);
    },

    confirmResetData() {
        if (!confirm('⚠️ هل أنت متأكد من حذف جميع البيانات؟\n\nهذا الإجراء لا يمكن التراجع عنه!')) return;
        if (!confirm('تأكيد نهائي: سيتم حذف كل الطلبات، المنتجات، العملاء، والشحنات!')) return;

        ['orders', 'products', 'customers', 'shipments', 'store_config'].forEach(key => {
            Utils.storage.remove(key);
        });

        Toast.success('تم إعادة تعيين جميع البيانات');
        setTimeout(() => window.location.reload(), 1000);
    }
};

window.Settings = Settings;

// Settings-specific styles
const settingsStyles = `
    .settings-tabs{display:flex;gap:8px;margin-bottom:24px;flex-wrap:wrap;}
    .settings-tab{
        display:flex;align-items:center;gap:8px;padding:10px 16px;
        border:1px solid var(--border-color);border-radius:8px;background:transparent;
        color:var(--text-secondary);cursor:pointer;font-size:14px;font-weight:500;
        transition:all 0.2s;
    }
    .settings-tab:hover{border-color:var(--primary);color:var(--primary);}
    .settings-tab.active{background:var(--primary);color:white;border-color:var(--primary);}
    .settings-card{max-width:800px;}
`;

if (!document.getElementById('settings-styles')) {
    const s = document.createElement('style'); s.id = 'settings-styles'; s.textContent = settingsStyles;
    document.head.appendChild(s);
}
