import { t, currentLang } from '../core/i18n.js';
import { auth } from '../core/firebase-config.js';
import { showToast } from '../components/ui.js';

export function renderSettings(container) {
    const user = auth.currentUser;
    
    container.innerHTML = `
        <div class="view-content">
            <!-- Profile Card -->
            <div class="profile-card">
                <img src="${user?.photoURL || 'https://ui-avatars.com/api/?name=User&background=2563eb&color=fff&size=96'}" 
                     class="profile-avatar-large" alt="Profile" id="settings-avatar">
                <div class="profile-info">
                    <h3 id="settings-name">${user?.displayName || 'User'}</h3>
                    <p class="email">${user?.email || ''}</p>
                    <p style="font-size:13px;color:var(--text-secondary);margin-top:4px;">
                        <i class='bx bx-time'></i> آخر تسجيل دخول: ${new Date(user?.metadata?.lastSignInTime).toLocaleDateString('ar-EG')}
                    </p>
                </div>
                <button class="btn-outline btn-sm" onclick="refreshUserData()">
                    <i class='bx bx-refresh'></i> تحديث
                </button>
            </div>

            <!-- Settings Grid -->
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(400px,1fr));gap:20px;">
                
                <!-- General Settings -->
                <div class="settings-section">
                    <div class="settings-section-header">
                        <i class='bx bx-cog'></i>
                        <h3>${t('general')}</h3>
                    </div>
                    
                    <div class="setting-item">
                        <span class="setting-label"><i class='bx bx-globe'></i> ${t('language')}</span>
                        <select class="filter-select" id="settings-lang" onchange="changeLanguage(this.value)">
                            <option value="ar" ${currentLang === 'ar' ? 'selected' : ''}>العربية</option>
                            <option value="en" ${currentLang === 'en' ? 'selected' : ''}>English</option>
                        </select>
                    </div>
                    
                    <div class="setting-item">
                        <span class="setting-label"><i class='bx bx-moon'></i> ${t('theme')}</span>
                        <div style="display:flex;gap:8px;">
                            <button class="btn-sm btn-primary ${document.documentElement.getAttribute('data-theme') !== 'dark' ? '' : 'btn-outline'}" 
                                    style="background:var(--bg-main);color:var(--text-primary);border:1px solid var(--border-color);"
                                    onclick="setTheme('light')" id="theme-light-btn">
                                <i class='bx bx-sun'></i> ${t('lightMode')}
                            </button>
                            <button class="btn-sm btn-primary ${document.documentElement.getAttribute('data-theme') === 'dark' ? '' : 'btn-outline'}" 
                                    style="background:var(--bg-main);color:var(--text-primary);border:1px solid var(--border-color);"
                                    onclick="setTheme('dark')" id="theme-dark-btn">
                                <i class='bx bx-moon'></i> ${t('darkMode')}
                            </button>
                        </div>
                    </div>

                    <div class="setting-item">
                        <span class="setting-label"><i class='bx bx-bell'></i> ${t('notificationsEnabled')}</span>
                        <label class="toggle-switch">
                            <input type="checkbox" id="notif-toggle" checked onchange="toggleNotifications(this.checked)">
                            <span class="toggle-slider"></span>
                        </label>
                    </div>
                </div>

                <!-- System Info -->
                <div class="settings-section">
                    <div class="settings-section-header">
                        <i class='bx bx-server'></i>
                        <h3>${t('systemInfo')}</h3>
                    </div>
                    
                    <div class="setting-item">
                        <span class="setting-label">Firebase Project</span>
                        <span class="setting-value">orders-8f568</span>
                    </div>
                    
                    <div class="setting-item">
                        <span class="setting-label">R2 Bucket</span>
                        <span class="setting-value">orders</span>
                    </div>
                    
                    <div class="setting-item">
                        <span class="setting-label">API Endpoint</span>
                        <span class="setting-value" style="font-size:12px;max-width:200px;overflow:hidden;text-overflow:ellipsis;">https://orders.usastud42.workers.dev</span>
                    </div>
                    
                    <div class="setting-item">
                        <span class="setting-label">${t('version')}</span>
                        <span class="setting-value badge badge-primary">v2.0.0</span>
                    </div>
                    
                    <div class="setting-item">
                        <span class="setting-label">${t('lastUpdated')}</span>
                        <span class="setting-value">${new Date().toLocaleDateString('ar-EG')}</span>
                    </div>
                </div>

                <!-- Security Settings -->
                <div class="settings-section">
                    <div class="settings-section-header">
                        <i class='bx bx-shield-alt'></i>
                        <h3>${t('security')}</h3>
                    </div>
                    
                    <div class="form-group">
                        <label><i class='bx bx-envelope'></i> البريد الإلكتروني</label>
                        <input type="email" class="form-control" value="${user?.email || ''}" disabled>
                        <small style="color:var(--text-secondary);">مربوط بحساب Google</small>
                    </div>
                    
                    <div class="form-group">
                        <label><i class='bx bx-id-card'></i> معرف المستخدم</label>
                        <input type="text" class="form-control" value="${user?.uid || ''}" disabled style="font-size:12px;font-family:monospace;">
                    </div>
                    
                    <div class="form-group">
                        <label><i class='bx bx-log-in-circle'></i> طريقة الدخول</label>
                        <input type="text" class="form-control" value="Google Authentication" disabled>
                    </div>

                    <hr style="border:none;border-top:1px solid var(--border-color);margin:20px 0;">

                    <button class="btn-danger btn-sm" onclick="handleLogout()" style="width:100%;justify-content:center;padding:12px;">
                        <i class='bx bx-log-out'></i> تسجيل الخروج
                    </button>
                </div>

                <!-- Data Management -->
                <div class="settings-section">
                    <div class="settings-section-header">
                        <i class='bx bx-data'></i>
                        <h3>إدارة البيانات</h3>
                    </div>
                    
                    <div style="display:flex;flex-direction:column;gap:10px;">
                        <button class="btn-outline btn-sm" onclick="exportData()" style="justify-content:center;">
                            <i class='bx bx-download'></i> تصدير البيانات (JSON)
                        </button>
                        
                        <button class="btn-outline btn-sm" onclick="clearCache()" style="justify-content:center;color:var(--warning);border-color:var(--warning);">
                            <i class='bx bx-trash'></i> مسح ذاكرة التخزين المؤقت
                        </button>
                    </div>
                    
                    <div style="margin-top:20px;padding:15px;background:var(--warning-light);border-radius:var(--radius-md);">
                        <strong style="color:var(--warning);"><i class='bx bx-info-circle'></i> ملاحظة:</strong>
                        <p style="font-size:13px;margin-top:5px;color:var(--text-secondary);">
                            جميع البيانات مخزنة على Firebase Realtime Database وتتم المزامنة في الوقت الفعلي.
                        </p>
                    </div>
                </div>
            </div>

            <!-- About Section -->
            <div class="chart-card" style="margin-top:20px;text-align:center;">
                <h3 style="margin-bottom:10px;"><i class='bx bx-cube-alt' style="color:var(--primary);"></i> SaaS OMS</h3>
                <p style="color:var(--text-secondary);font-size:14px;max-width:500px;margin:0 auto;">
                    نظام إدارة الطلبات المتكامل - مبني بتقنيات حديثة: Firebase, Cloudflare Workers, R2 Storage
                </p>
                <div style="display:flex;justify-content:center;gap:15px;margin-top:15px;flex-wrap:wrap;">
                    <span class="badge badge-primary">Firebase Auth</span>
                    <span class="badge badge-success">Realtime DB</span>
                    <span class="badge badge-warning">Cloudflare R2</span>
                    <span class="badge badge-info">Workers AI</span>
                </div>
            </div>
        </div>
    `;
}

// Global functions for settings
window.changeLanguage = function(lang) {
    if(typeof setLanguage !== 'undefined') {
        setLanguage(lang);
        // Re-render settings to update text
        const container = document.getElementById('view-container');
        if(container) renderSettings(container);
        showToast(`تم تغيير اللغة إلى ${lang === 'ar' ? 'العربية' : 'English'}`, 'success');
    }
};

window.setTheme = function(theme) {
    const htmlEl = document.documentElement;
    htmlEl.setAttribute('data-theme', theme);
    localStorage.setItem('saas_theme', theme);
    
    // Update toggle button icon
    const themeToggleBtn = document.getElementById('theme-toggle');
    if(themeToggleBtn) {
        themeToggleBtn.innerHTML = theme === 'light' ? "<i class='bx bx-moon'></i>" : "<i class='bx bx-sun'></i>";
    }
    
    // Update buttons visual state
    const lightBtn = document.getElementById('theme-light-btn');
    const darkBtn = document.getElementById('theme-dark-btn');
    
    if(lightBtn && darkBtn) {
        if(theme === 'light') {
            lightBtn.style.background = 'var(--primary)';
            lightBtn.style.color = 'white';
            darkBtn.style.background = 'var(--bg-main)';
            darkBtn.style.color = 'var(--text-primary)';
        } else {
            darkBtn.style.background = 'var(--primary)';
            darkBtn.style.color = 'white';
            lightBtn.style.background = 'var(--bg-main)';
            lightBtn.style.color = 'var(--text-primary)';
        }
    }
    
    // Dispatch event for charts to update
    window.dispatchEvent(new Event('themeChanged'));
    
    showToast(`تم التغيير إلى الوضع ${theme === 'light' ? 'الفاتح' : 'الداكن'}`, 'success');
};

window.toggleNotifications = function(enabled) {
    localStorage.setItem('saas_notifications', enabled);
    showToast(enabled ? 'تم تفعيل الإشعارات' : 'تم إيقاف الإشعارات', 'info');
};

window.refreshUserData = function() {
    const user = auth.currentUser;
    if(user) {
        user.reload().then(() => {
            document.getElementById('settings-name').textContent = user.displayName || 'User';
            document.getElementById('settings-avatar').src = user.photoURL || '';
            showToast('تم تحديث بيانات المستخدم', 'success');
        }).catch(err => {
            showToast('حدث خطأ: ' + err.message, 'error');
        });
    }
};

window.handleLogout = function() {
    if(confirm('هل أنت متأكد من تسجيل الخروج؟')) {
        import('../core/firebase-config.js').then(({ signOut }) => {
            signOut(auth);
        });
    }
};

window.exportData = function() {
    // Get all data from Firebase and export as JSON
    import('../core/firebase-config.js').then(({ db, ref, get }) => {
        Promise.all([
            get(ref(db, 'orders')),
            get(ref(db, 'products')),
            get(ref(db, 'crm'))
        ]).then(([ordersSnap, productsSnap, crmSnap]) => {
            const data = {
                exportDate: new Date().toISOString(),
                orders: ordersSnap.val() || {},
                products: productsSnap.val() || {},
                customers: crmSnap.val() || {}
            };
            
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `saas-oms-export-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
            
            showToast('تم تصدير البيانات بنجاح', 'success');
        });
    });
};

window.clearCache = function() {
    if(confirm('هل تريد مسح ذاكرة التخزين المؤقت؟')) {
        localStorage.removeItem('saas_theme');
        localStorage.removeItem('saas_lang');
        localStorage.removeItem('saas_notifications');
        
        // Clear service worker cache if exists
        if('caches' in window) {
            caches.keys().then(names => names.forEach(name => caches.delete(name)));
        }
        
        showToast('تم مسح ذاكرة التخزين المؤقت', 'success');
        
        // Reload after short delay
        setTimeout(() => window.location.reload(), 1000);
    }
};


