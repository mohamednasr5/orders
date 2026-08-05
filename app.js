/**
 * ========================================
 * شحنلي - Shipping Management PWA
 * Main Application JavaScript
 * Version 3.0 - Mobile First | Bosta Integration | Bottom Navigation
 * ========================================
 */

// ========================================
// Global Configuration & State
// ========================================

const APP_CONFIG = {
    name: 'شحنلي',
    version: '3.0.0',
    defaultCurrency: 'ج.م',
    trackingPrefix: 'SH',
    storageKeys: {
        shipments: 'shipli_shipments',
        customers: 'shipli_customers',
        settings: 'shipli_settings',
        drafts: 'shipli_drafts',
        installPrompt: 'shipli_install_prompt',
        bostaConfig: 'shipli_bosta_config',
        notificationSettings: 'shipli_notif_settings'
    }
};

const APP_STATE = {
    currentTab: 'dashboard',
    shipments: [],
    customers: [],
    settings: {},
    drafts: [],
    currentPage: 1,
    itemsPerPage: 10,
    deferredInstallPrompt: null,
    isOnline: navigator.onLine,
    firebaseInitialized: false,
    notificationsFilter: 'all',
    productsCategoryFilter: 'all',
    bostaUpdates: [],
    todayBostaCount: 0
};

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyDNWeuRszXCZgmyIEyRwdKK1KaTp1SLn_I",
    authDomain: "orders-8f568.firebaseapp.com",
    databaseURL: "https://orders-8f568-default-rtdb.firebaseio.com",
    projectId: "orders-8f568",
    storageBucket: "orders-8f568.firebasestorage.app",
    messagingSenderId: "1029204669334",
    appId: "1:1029204669334:web:7df3d26ebd51d353abe3b7",
    measurementId: "G-FDZ9DHF6PL"
};

let db = null;
let auth = null;
let storage = null;

// ========================================
// Initialization
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    console.log(`🚀 ${APP_CONFIG.name} v${APP_CONFIG.version} initializing...`);
    
    initializeFirebase();
    loadLocalData();
    setupEventListeners();
    initializePWA();
    updateDashboardStats();
    setTodayDate();
    checkOnlineStatus();
    
    // Initialize Bosta Integration
    if (typeof BostaIntegration !== 'undefined') {
        BostaIntegration.init();
    }
    
    // Initialize Notifications
    if (typeof Notifications !== 'undefined') {
        Notifications.init();
    }
    
    // Initialize Inventory
    if (typeof Inventory !== 'undefined') {
        Inventory.init();
        Inventory.renderTable();
        Inventory.renderBackordersList();
        Inventory.renderStockAlerts();
        Inventory.populateProductSelect('adjustProduct');
    }
    
    // Initialize Webhook Handler
    if (typeof WebhookHandler !== 'undefined') {
        WebhookHandler.init();
    }
    
    // Setup bottom navigation
    setupBottomNavigation();
    
    // Render initial data
    renderShipmentsTable();
    renderCustomersGrid();
    
    console.log(`✅ ${APP_CONFIG.name} v${APP_CONFIG.version} initialized`);
});

function initializeFirebase() {
    try {
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        
        db = firebase.database();
        auth = firebase.auth();
        storage = firebase.storage();
        
        APP_STATE.firebaseInitialized = true;
        console.log('🔥 Firebase initialized');
        
        auth.onAuthStateChanged(user => {
            console.log('🔑 Auth state changed:', user ? (user.isAnonymous ? 'Anonymous' : user.email) : 'Logged out');
            
            if (user) {
                // Update UI based on user type
                if (!user.isAnonymous) {
                    updateUserUI(user);
                }
                syncDataWithFirebase();
            } else {
                resetUserUI();
                signInAnonymously();
            }
        });
        
    } catch (error) {
        console.error('❌ Firebase error:', error);
    }
}

async function signInAnonymously() {
    try {
        await auth.signInAnonymously();
        console.log('🔑 Signed in anonymously');
    } catch (error) {
        console.error('Sign-in failed:', error);
    }
}

// ========================================
// Google Authentication ⭐ NEW
// ========================================

let googleProvider = null;

function initGoogleProvider() {
    if (!googleProvider && firebase.auth) {
        googleProvider = new firebase.auth.GoogleAuthProvider();
        googleProvider.addScope('email');
        googleProvider.addScope('profile');
        googleProvider.setCustomParameters({
            prompt: 'select_account'
        });
        console.log('🔑 Google Auth provider initialized');
    }
    return googleProvider;
}

async function signInWithGoogle() {
    try {
        // Show loading
        showLoading(true);
        
        // Update loading text
        const overlay = document.getElementById('loadingOverlay');
        const loadingText = overlay?.querySelector('p');
        if (loadingText) loadingText.textContent = 'جاري تسجيل الدخول بجوجل...';
        
        // Initialize provider
        const provider = initGoogleProvider();
        
        if (!provider) {
            showToast('خطأ: Firebase Auth غير متوفر', 'error');
            hideLoading();
            return;
        }
        
        // Sign in with popup (better for mobile)
        const result = await auth.signInWithPopup(provider);
        
        // Get user info
        const user = result.user;
        console.log('✅ Google Sign-In successful:', user.displayName);
        
        // Update UI
        updateUserUI(user);
        
        // Sync data to Firebase
        await syncDataWithFirebase();
        
        showLoading(false);
        showToast(`مرحباً ${user.displayName || 'بك'}! ✅`, 'success');
        
    } catch (error) {
        showLoading(false);
        console.error('Google Sign-In error:', error);
        
        if (error.code === 'auth/popup-closed-by-user') {
            showToast('تم إغلاق نافذة تسجيل الدخول', 'info');
        } else if (error.code === 'auth/popup-blocked') {
            showToast('تم حظر النافذة المنبثقة، يرجى السماح بها', 'warning');
            // Try redirect method as fallback
            try {
                const provider = initGoogleProvider();
                await auth.signInWithRedirect(provider);
            } catch (redirectError) {
                showToast('فشل تسجيل الدخول: ' + redirectError.message, 'error');
            }
        } else {
            showToast('فشل تسجيل الدخول: ' + error.message, 'error');
        }
    }
}

async function signOutUser() {
    try {
        hideUserMenu();
        showLoading(true);
        
        // Update loading text
        const overlay = document.getElementById('loadingOverlay');
        const loadingText = overlay?.querySelector('p');
        if (loadingText) loadingText.textContent = 'جاري تسجيل الخروج...';
        
        await auth.signOut();
        
        // Reset UI
        resetUserUI();
        
        // Sign in anonymously for basic functionality
        await signInAnonymously();
        
        showLoading(false);
        showToast('تم تسجيل الخروج بنجاح', 'info');
        
    } catch (error) {
        showLoading(false);
        console.error('Sign-out error:', error);
        showToast('حدث خطأ أثناء تسجيل الخروج', 'error');
    }
}

function updateUserUI(user) {
    // Show user profile button, hide Google login button
    const googleLoginBtn = document.getElementById('googleLoginBtn');
    const userProfileBtn = document.getElementById('userProfileBtn');
    const userAvatar = document.getElementById('userAvatar');
    
    if (googleLoginBtn) googleLoginBtn.classList.add('hidden');
    if (userProfileBtn) userProfileBtn.classList.remove('hidden');
    
    // Set avatar
    if (userAvatar && user.photoURL) {
        userAvatar.src = user.photoURL;
        userAvatar.classList.remove('hidden');
    }
    
    // Update Firebase status
    updateFirebaseStatus(true, user.email || 'مستخدم جوجل');
    
    // Store user info
    localStorage.setItem('shipli_user', JSON.stringify({
        uid: user.uid,
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
        lastLogin: new Date().toISOString()
    }));
}

function resetUserUI() {
    const googleLoginBtn = document.getElementById('googleLoginBtn');
    const userProfileBtn = document.getElementById('userProfileBtn');
    const userAvatar = document.getElementById('userAvatar');
    
    if (googleLoginBtn) googleLoginBtn.classList.remove('hidden');
    if (userProfileBtn) userProfileBtn.classList.add('hidden');
    if (userAvatar) {
        userAvatar.src = '';
        userAvatar.classList.add('hidden');
    }
    
    // Clear user data
    localStorage.removeItem('shipli_user');
    
    // Update status
    updateFirebaseStatus(false);
}

function showUserMenu() {
    const userMenu = document.getElementById('userMenu');
    const user = auth?.currentUser;
    
    if (!userMenu) return;
    
    // Populate menu with current user info
    const menuAvatar = document.getElementById('menuUserAvatar');
    const menuUserName = document.getElementById('menuUserName');
    const menuUserEmail = document.getElementById('menuUserEmail');
    
    if (menuAvatar) menuAvatar.src = user?.photoURL || '';
    if (menuUserName) menuUserName.textContent = user?.displayName || 'المستخدم';
    if (menuUserEmail) menuUserEmail.textContent = user?.email || 'guest@shipli.app';
    
    // Show menu
    userMenu.classList.remove('hidden');
    
    // Close on outside click
    setTimeout(() => {
        document.addEventListener('click', handleUserMenuOutsideClick);
    }, 10);
}

function hideUserMenu() {
    const userMenu = document.getElementById('userMenu');
    if (userMenu) {
        userMenu.classList.add('hidden');
    }
    document.removeEventListener('click', handleUserMenuOutsideClick);
}

function handleUserMenuOutsideClick(event) {
    const userMenu = document.getElementById('userMenu');
    const userProfileBtn = document.getElementById('userProfileBtn');
    
    if (userMenu && !userMenu.contains(event.target) && 
        userProfileBtn && !userProfileBtn.contains(event.target)) {
        hideUserMenu();
    }
}

function updateFirebaseStatus(connected, userEmail = '') {
    const statusEl = document.getElementById('firebaseStatus');
    const statusText = document.getElementById('firebaseStatusText');
    
    if (!statusEl || !statusText) return;
    
    if (connected) {
        statusEl.classList.remove('disconnected');
        statusEl.classList.add('connected');
        statusText.textContent = `Firebase: متصل ${userEmail ? '(' + userEmail + ')' : ''}`;
    } else {
        statusEl.classList.remove('connected');
        statusEl.classList.add('disconnected');
        statusText.textContent = 'Firebase: غير متصل';
    }
}

async function viewFirebaseData() {
    hideUserMenu();
    
    if (!db) {
        showToast('Firebase Database غير متصل', 'error');
        return;
    }
    
    try {
        showLoading(true);
        const overlay = document.getElementById('loadingOverlay');
        const loadingText = overlay?.querySelector('p');
        if (loadingText) loadingText.textContent = 'جاري تحميل البيانات...';
        
        // Fetch data from Firebase
        const snapshot = await db.ref('/').once('value');
        const data = snapshot.val();
        
        showLoading(false);
        
        if (data) {
            console.log('📊 Firebase Data:', data);
            showToast(`تم تحميل ${Object.keys(data).length} مجموعات بيانات`, 'success');
            
            // Show data summary in a toast or alert
            const summary = Object.entries(data).map(([key, value]) => {
                if (typeof value === 'object' && value !== null) {
                    return `${key}: ${Object.keys(value).length} عناصر`;
                }
                return `${key}: ${value}`;
            }).join('\n');
            
            alert('بيانات Firebase:\n\n' + summary);
        } else {
            showToast('لا توجد بيانات في Firebase بعد', 'info');
        }
        
    } catch (error) {
        showLoading(false);
        console.error('Firebase read error:', error);
        showToast('خطأ في قراءة البيانات: ' + error.message, 'error');
    }
}

// Check for existing user session on load
function checkExistingUserSession() {
    const savedUser = localStorage.getItem('shipli_user');
    const user = auth?.currentUser;
    
    if (user && !user.isAnonymous) {
        updateUserUI(user);
    } else if (savedUser) {
        try {
            const userData = JSON.parse(savedUser);
            // Check if this user is still logged in
            if (user && user.uid === userData.uid) {
                updateUserUI(user);
            } else {
                localStorage.removeItem('shipli_user');
            }
        } catch (e) {
            localStorage.removeItem('shipli_user');
        }
    }
}

function loadLocalData() {
    try {
        const savedSettings = localStorage.getItem(APP_CONFIG.storageKeys.settings);
        APP_STATE.settings = savedSettings ? JSON.parse(savedSettings) : getDefaultSettings();
        applySettings();
        
        APP_STATE.shipments = JSON.parse(localStorage.getItem(APP_CONFIG.storageKeys.shipments) || '[]');
        APP_STATE.customers = JSON.parse(localStorage.getItem(APP_CONFIG.storageKeys.customers) || '[]');
        APP_STATE.drafts = JSON.parse(localStorage.getItem(APP_CONFIG.storageKeys.drafts) || '[]');
        
        // Load Bosta updates
        const savedBostaUpdates = localStorage.getItem('shipli_bosta_updates');
        if (savedBostaUpdates) {
            APP_STATE.bostaUpdates = JSON.parse(savedBotaUpdates);
        }
        
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

function getDefaultSettings() {
    return {
        storeName: 'شحنلي',
        storeLogo: '',
        storePhone: '',
        storeEmail: '',
        storeAddress: '',
        shippingCompany: 'bosta',
        defaultCity: 'cairo',
        defaultPackageType: 'box',
        enableSMS: true,
        autoPrintBarcode: false,
        enableBrowserNotifications: true,
        enableSoundNotifications: true,
        enableStockAlerts: true,
        enableBostaNotifications: true,
        minStockThreshold: 5
    };
}

// ========================================
// Bottom Navigation Setup ⭐
// ========================================

function setupBottomNavigation() {
    const bottomNavItems = document.querySelectorAll('.bottom-nav-item');
    
    bottomNavItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const tab = this.dataset.tab;
            if (tab) {
                switchTab(tab);
            }
        });
    });
    
    // Handle FAB button animation
    const fabButton = document.querySelector('.fab-button .fab-circle');
    if (fabButton) {
        fabButton.addEventListener('click', function() {
            this.style.transform = 'scale(0.95)';
            setTimeout(() => {
                this.style.transform = '';
            }, 150);
        });
    }
}

// ========================================
// Tab Switching (with Bottom Nav support)
// ========================================

function switchTab(tabId) {
    // Update state
    APP_STATE.currentTab = tabId;
    
    // Update desktop nav tabs
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabId);
    });
    
    // Update bottom nav items
    document.querySelectorAll('.bottom-nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.tab === tabId);
    });
    
    // Show/hide content sections
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === tabId);
    });
    
    // Scroll to top on mobile
    if (window.innerWidth < 1024) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    
    // Refresh tab-specific content
    refreshTabContent(tabId);
    
    console.log(`[Nav] Switched to: ${tabId}`);
}

function refreshTabContent(tabId) {
    switch (tabId) {
        case 'dashboard':
            updateDashboardStats();
            if (typeof BostaIntegration !== 'undefined') {
                BostaIntegration.renderUpdatesList();
                BostaIntegration.updateDashboardStats();
            }
            if (typeof Inventory !== 'undefined') {
                Inventory.renderStockAlerts();
            }
            break;
            
        case 'shipments':
            renderShipmentsTable();
            break;
            
        case 'inventory':
            if (typeof Inventory !== 'undefined') {
                Inventory.renderTable();
                Inventory.renderBackordersList();
                Inventory.populateProductSelect('adjustProduct');
            }
            break;
            
        case 'customers':
            renderCustomersGrid();
            break;
            
        case 'settings':
            loadSettingsToForm();
            break;
    }
}

// ========================================
// Event Listeners
// ========================================

function setupEventListeners() {
    // Navigation tabs (desktop)
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            switchTab(this.dataset.tab);
        });
    });

    // Waybill form submission
    const waybillForm = document.getElementById('waybillForm');
    if (waybillForm) {
        waybillForm.addEventListener('submit', handleWaybillSubmit);
    }

    // Search inputs
    const shipmentSearch = document.getElementById('shipmentSearch');
    if (shipmentSearch) {
        shipmentSearch.addEventListener('input', debounce(renderShipmentsTable, 300));
    }

    const productSearch = document.getElementById('productSearch');
    if (productSearch) {
        productSearch.addEventListener('input', function() {
            if (typeof Inventory !== 'undefined') {
                Inventory.renderTable(APP_STATE.productsCategoryFilter, this.value);
            }
        });
    }

    // Filter changes
    const filterStatus = document.getElementById('filterStatus');
    if (filterStatus) {
        filterStatus.addEventListener('change', renderShipmentsTable);
    }

    // Online/Offline status
    window.addEventListener('online', () => {
        APP_STATE.isOnline = true;
        checkOnlineStatus();
        showToast('تم استعادة الاتصال بالإنترنت', 'success', '🌐');
    });

    window.addEventListener('offline', () => {
        APP_STATE.isOnline = false;
        checkOnlineStatus();
        showToast('أنت غير متصل بالإنترنت', 'warning', '📴');
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);

    // PWA Install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        APP_STATE.deferredInstallPrompt = e;
        showInstallBanner();
    });
}

function handleKeyboardShortcuts(e) {
    // Ctrl/Cmd + K for search
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.getElementById('shipmentSearch');
        if (searchInput) searchInput.focus();
    }

    // Escape to close modals
    if (e.key === 'Escape') {
        closeAllModals();
    }

    // Number keys for quick navigation (1-6)
    if (e.altKey && e.key >= '1' && e.key <= '6') {
        const tabs = ['dashboard', 'shipments', 'waybill', 'tracking', 'customers', 'settings'];
        const index = parseInt(e.key) - 1;
        if (tabs[index]) {
            switchTab(tabs[index]);
        }
    }
}

function closeAllModals() {
    document.querySelectorAll('.modal:not(.hidden)').forEach(modal => {
        modal.classList.add('hidden');
    });
    toggleNotificationsPanel(false);
}

// ========================================
// Dashboard Functions
// ========================================

function updateDashboardStats() {
    // Shipment stats
    const total = APP_STATE.shipments.length;
    const delivered = APP_STATE.shipments.filter(s => s.status === 'delivered').length;
    const inTransit = APP_STATE.shipments.filter(s => s.status === 'in_transit' || s.status === 'picked').length;
    const returned = APP_STATE.shipments.filter(s => s.status === 'returned').length;

    document.getElementById('totalShipments').textContent = total;
    document.getElementById('deliveredCount').textContent = delivered;
    document.getElementById('inTransitCount').textContent = inTransit;
    document.getElementById('returnedCount').textContent = returned;

    // Today's summary
    const today = new Date().toDateString();
    const todayShipments = APP_STATE.shipments.filter(s => 
        new Date(s.createdAt).toDateString() === today
    );

    document.getElementById('todayNew').textContent = todayShipments.length;
    document.getElementById('todayDelivered').textContent = todayShipments.filter(s => s.status === 'delivered').length;
    document.getElementById('todayPicked').textContent = todayShipments.filter(s => s.status === 'picked').length;
    document.getElementById('todayTransit').textContent = todayShipments.filter(s => s.status === 'in_transit').length;
    document.getElementById('todayBostaUpdates').textContent = APP_STATE.todayBostaCount;

    // Recent shipments list
    renderRecentShipments();

    // Inventory alerts
    if (typeof Inventory !== 'undefined') {
        Inventory.updateStats();
    }
}

function renderRecentShipments() {
    const container = document.getElementById('recentShipmentsList');
    if (!container) return;

    const recent = [...APP_STATE.shipments]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5);

    if (recent.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                </svg>
                <p>لا توجد شحنات بعد</p>
            </div>
        `;
        return;
    }

    container.innerHTML = recent.map(shipment => `
        <div class="recent-shipment-item" onclick="showShipmentDetails('${shipment.id}')">
            <div class="shipment-info">
                <strong>${shipment.trackingNumber}</strong>
                <span>${shipment.receiverName}</span>
            </div>
            <span class="status-badge ${shipment.status}">${getStatusLabel(shipment.status)}</span>
        </div>
    `).join('');
}

function setTodayDate() {
    const el = document.getElementById('todayDate');
    if (el) {
        el.textContent = new Date().toLocaleDateString('ar-EG', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
}

// ========================================
// Shipments CRUD
// ========================================

function renderShipmentsTable() {
    const tbody = document.getElementById('shipmentsTableBody');
    if (!tbody) return;

    let filtered = [...APP_STATE.shipments];

    // Apply search
    const searchTerm = document.getElementById('shipmentSearch')?.value.toLowerCase() || '';
    if (searchTerm) {
        filtered = filtered.filter(s =>
            s.trackingNumber?.toLowerCase().includes(searchTerm) ||
            s.receiverName?.toLowerCase().includes(searchTerm) ||
            s.bostaTrackingNumber?.toLowerCase().includes(searchTerm)
        );
    }

    // Apply status filter
    const statusFilter = document.getElementById('filterStatus')?.value || '';
    if (statusFilter) {
        filtered = filtered.filter(s => s.status === statusFilter);
    }

    // Apply Bosta only filter
    const bostaOnly = document.getElementById('bostaOnlyFilter')?.checked || false;
    if (bostaOnly) {
        filtered = filtered.filter(s => s.sentToBosta);
    }

    // Pagination
    const startIndex = (APP_STATE.currentPage - 1) * APP_STATE.itemsPerPage;
    const paginatedData = filtered.slice(startIndex, startIndex + APP_STATE.itemsPerPage);
    const totalPages = Math.ceil(filtered.length / APP_STATE.itemsPerPage) || 1;

    // Update pagination UI
    document.getElementById('currentPage').textContent = APP_STATE.currentPage;
    document.getElementById('totalPages').textContent = totalPages;
    document.getElementById('prevPage').disabled = APP_STATE.currentPage <= 1;
    document.getElementById('nextPage').disabled = APP_STATE.currentPage >= totalPages;

    if (paginatedData.length === 0) {
        tbody.innerHTML = `
            <tr class="empty-row">
                <td colspan="8">
                    <div class="empty-state">
                        <span class="empty-icon">📭</span>
                        <p>لا توجد شحنات</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = paginatedData.map(shipment => `
        <tr onclick="showShipmentDetails('${shipment.id}')" data-label="">
            <td><strong>${shipment.trackingNumber}</strong></td>
            <td>${shipment.bostaTrackingNumber || '-'}</td>
            <td>${shipment.receiverName || '-'}</td>
            <td dir="ltr">${shipment.receiverPhone || '-'}</td>
            <td>${getCityLabel(shipment.receiverCity)}</td>
            <td><span class="status-badge ${shipment.status}">${getStatusLabel(shipment.status)}</span></td>
            <td>${formatDate(shipment.createdAt)}</td>
            <td>
                <div class="row-actions">
                    <button class="secondary-btn small" onclick="event.stopPropagation(); printWaybill('${shipment.id}')">🖨️</button>
                    <button class="danger-btn small" onclick="event.stopPropagation(); deleteShipment('${shipment.id}')">🗑️</button>
                </div>
            </td>
        </tr>
    `).join('');
}

async function handleWaybillSubmit(e) {
    e.preventDefault();

    const formData = getFormData();
    
    // Generate tracking number if not set
    if (!formData.trackingNumber) {
        generateTrackingNumber();
        formData.trackingNumber = document.getElementById('trackingNumber').value;
    }

    // Create shipment object
    const shipment = {
        id: `ship_${Date.now()}`,
        ...formData,
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        timeline: [{
            date: new Date().toISOString(),
            status: 'pending',
            description: 'تم إنشاء الشحنة'
        }]
    };

    showLoading(true);

    try {
        // Send to Bosta if enabled
        const sendToBosta = document.getElementById('sendToBosta')?.checked;
        if (sendToBosta && typeof BostaIntegration !== 'undefined') {
            try {
                const bostaResult = await BostaIntegration.createDelivery(formData);
                if (bostaResult.success) {
                    shipment.sentToBosta = true;
                    shipment.bostaTrackingNumber = bostaResult.bostaTrackingNumber;
                    shipment.status = 'picked';
                    
                    showToast('تم إرسال الشحنة لبوستا بنجاح! 🚚', 'success');
                }
            } catch (bostaError) {
                console.error('Bosta error:', bostaError);
                showToast('فشل الإرسال لبوستا، تم الحفظ محلياً', 'warning');
                shipment.sentToBosta = false;
            }
        }

        // Save locally
        APP_STATE.shipments.unshift(shipment);
        saveShipmentsToStorage();
        
        // Sync with Firebase
        syncShipmentToFirebase(shipment);

        // Check inventory and create backorder if needed
        if (typeof Inventory !== 'undefined' && formData.productId) {
            const product = Inventory.products.find(p => p.id === formData.productId);
            if (product && product.stock <= 0) {
                Inventory.createBackorder(product.id, shipment.id, shipment.receiverName);
            } else if (product && product.stock > 0) {
                Inventory.adjustStock(product.id, 'remove', 1, 'شحنة جديدة');
            }
        }

        // Generate barcode
        generateBarcodeForShipment(shipment.trackingNumber);

        showToast('تم إنشاء البوليصة بنجاح! ✅', 'success');

        // Clear form or keep for multiple entries
        if (!e.shiftKey) {
            clearForm();
        }

        // Navigate to shipments tab
        setTimeout(() => switchTab('shipments'), 1000);

    } catch (error) {
        console.error('Error creating shipment:', error);
        showToast('خطأ في إنشاء الشحنة', 'error');
    } finally {
        showLoading(false);
    }
}

function getFormData() {
    return {
        trackingNumber: document.getElementById('trackingNumber')?.value || '',
        type: document.getElementById('shipmentType')?.value || 'delivery',
        packageType: document.getElementById('packageType')?.value || 'box',
        weight: parseFloat(document.getElementById('weight')?.value) || 0,
        pieces: parseInt(document.getElementById('pieces')?.value) || 1,
        description: document.getElementById('description')?.value || '',
        declaredValue: parseFloat(document.getElementById('declaredValue')?.value) || 0,
        codAmount: parseFloat(document.getElementById('codAmount')?.value) || 0,
        senderName: document.getElementById('senderName')?.value || '',
        senderPhone: document.getElementById('senderPhone')?.value || '',
        senderCity: document.getElementById('senderCity')?.value || '',
        senderArea: document.getElementById('senderArea')?.value || '',
        senderAddress: document.getElementById('senderAddress')?.value || '',
        receiverName: document.getElementById('receiverName')?.value || '',
        receiverPhone: document.getElementById('receiverPhone')?.value || '',
        receiverPhone2: document.getElementById('receiverPhone2')?.value || '',
        receiverCity: document.getElementById('receiverCity')?.value || '',
        receiverArea: document.getElementById('receiverArea')?.value || '',
        receiverAddress: document.getElementById('receiverAddress')?.value || '',
        receiverNotes: document.getElementById('receiverNotes')?.value || ''
    };
}

function deleteShipment(id) {
    if (!confirm('هل أنت متأكد من حذف هذه الشحنة؟')) return;

    APP_STATE.shipments = APP_STATE.shipments.filter(s => s.id !== id);
    saveShipmentsToStorage();
    renderShipmentsTable();
    updateDashboardStats();
    showToast('تم حذف الشحنة', 'success');
}

function showShipmentDetails(id) {
    const shipment = APP_STATE.shipments.find(s => s.id === id);
    if (!shipment) return;

    const modal = document.getElementById('shipmentModal');
    const body = document.getElementById('shipmentModalBody');

    body.innerHTML = `
        <div class="shipment-detail-view">
            <div class="detail-header">
                <h3>${shipment.trackingNumber}</h3>
                <span class="status-badge ${shipment.status}">${getStatusLabel(shipment.status)}</span>
                ${shipment.bostaTrackingNumber ? `<span class="bosta-badge">🚚 ${shipment.bostaTrackingNumber}</span>` : ''}
            </div>
            
            <div class="detail-section">
                <h4>بيانات المستلم</h4>
                <p><strong>الاسم:</strong> ${shipment.receiverName}</p>
                <p><strong>الهاتف:</strong> ${shipment.receiverPhone}</p>
                <p><strong>العنوان:</strong> ${shipment.receiverArea}, ${getCityLabel(shipment.receiverCity)}</p>
            </div>

            <div class="detail-section">
                <h4>مسار الشحنة</h4>
                <div class="timeline">
                    ${(shipment.timeline || []).map(t => `
                        <div class="timeline-item ${t.status === shipment.status ? 'current' : 'completed'}">
                            <div class="timeline-item-content">
                                <strong>${getStatusLabel(t.status)}</strong>
                                <small>${formatDateTime(t.date)}</small>
                                ${t.description ? `<p>${t.description}</p>` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <div class="detail-actions">
                <button class="primary-btn" onclick="printWaybill('${id}')">🖨️ طباعة</button>
                <button class="secondary-btn" onclick="shareTracking('${id}')">📤 مشاركة</button>
                <button class="danger-btn" onclick="deleteShipment('${id}'); closeModal('shipmentModal')">🗑️ حذف</button>
            </div>
        </div>
    `;

    modal.classList.remove('hidden');
}

function saveShipmentsToStorage() {
    localStorage.setItem(APP_CONFIG.storageKeys.shipments, JSON.stringify(APP_STATE.shipments));
}

// ========================================
// Tracking Functions
// ========================================

function trackShipment() {
    const input = document.getElementById('trackingSearchInput');
    const number = input?.value.trim();
    
    if (!number) {
        showToast('يرجى إدخال رقم الشحنة', 'warning');
        return;
    }

    showLoading(true);

    // Search in local shipments first
    let shipment = APP_STATE.shipments.find(s => 
        s.trackingNumber === number || 
        s.bostaTrackingNumber === number
    );

    if (shipment) {
        displayTrackingResult(shipment);
    } else if (typeof BostaIntegration !== 'undefined' && BostaIntegration.config.isConnected) {
        // Try Bosta API
        BostaIntegration.trackShipment(number).then(result => {
            if (result) {
                displayTrackingResult({ trackingNumber: number, ...result });
            } else {
                showToast('لم يتم العثور على الشحنة', 'error');
            }
        });
    } else {
        showToast('لم يتم العثور على الشحنة', 'error');
    }

    showLoading(false);
}

function displayTrackingResult(shipment) {
    const resultDiv = document.getElementById('trackingResult');
    const emptyDiv = document.getElementById('trackingEmpty');

    resultDiv.classList.remove('hidden');
    emptyDiv.classList.add('hidden');

    document.getElementById('trackedShipmentNumber').textContent = shipment.trackingNumber;
    document.getElementById('trackedStatus').textContent = getStatusLabel(shipment.status);
    document.getElementById('trackedStatus').className = `status-badge ${shipment.status}`;

    // Render timeline
    const timelineEl = document.getElementById('trackingTimeline');
    timelineEl.innerHTML = (shipment.timeline || []).map(t => `
        <div class="timeline-item ${t.status === shipment.status ? 'current' : 'completed'}">
            <div class="timeline-item-content">
                <strong>${t.description || getStatusLabel(t.status)}</strong>
                <small>${formatDateTime(t.date)}</small>
            </div>
        </div>
    `).join('');

    // Render details
    const detailsEl = document.getElementById('shipmentDetailsGrid');
    detailsEl.innerHTML = `
        <div class="detail-row"><span>المستلم:</span><strong>${shipment.receiverName || '-'}</strong></div>
        <div class="detail-row"><span>الهاتف:</span><strong>${shipment.receiverPhone || '-'}</strong></div>
        <div class="detail-row"><span>المدينة:</span><strong>${getCityLabel(shipment.receiverCity)}</strong></div>
        ${shipment.bostaTrackingNumber ? `<div class="detail-row"><span>رقم بوستا:</span><strong>${shipment.bostaTrackingNumber}</strong></div>` : ''}
    `;
}

function trackWithBosta() {
    if (typeof BostaIntegration !== 'undefined' && BostaIntegration.config.isConnected) {
        showToast('أدخل رقم تتبع بوستا للبحث', 'info');
        document.getElementById('trackingSearchInput')?.focus();
    } else {
        showToast('يركب ربط بوستا أولاً', 'warning');
        switchTab('settings');
    }
}

function refreshBostaTracking() {
    const currentNumber = document.getElementById('trackedShipmentNumber')?.textContent;
    if (currentNumber && typeof BostaIntegration !== 'undefined') {
        BostaIntegration.trackShipment(currentNumber).then(result => {
            if (result) displayTrackingResult(result);
        });
    }
}

// ========================================
// Customers CRM
// ========================================

function renderCustomersGrid() {
    const grid = document.getElementById('customersGrid');
    if (!grid) return;

    if (APP_STATE.customers.length === 0) {
        grid.innerHTML = `
            <div class="empty-state large">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                <h3>لا يوجد عملاء بعد</h3>
                <p>ابدأ بإضافة عملائك</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = APP_STATE.customers.map(customer => `
        <div class="customer-card">
            <div class="customer-avatar">👤</div>
            <div class="customer-name">${customer.name}</div>
            <div class="customer-phone">${customer.phone}</div>
            ${customer.email ? `<div class="customer-email">${customer.email}</div>` : ''}
            <div class="customer-actions">
                <button class="secondary-btn small" onclick="selectCustomer('${customer.id}')">اختيار</button>
                <button class="danger-btn small" onclick="deleteCustomer('${customer.id}')">حذف</button>
            </div>
        </div>
    `).join('');
}

function showAddCustomerModal() {
    document.getElementById('addCustomerModal').classList.remove('hidden');
}

function saveCustomer(e) {
    e.preventDefault();

    const customer = {
        id: `cust_${Date.now()}`,
        name: document.getElementById('custName').value,
        phone: document.getElementById('custPhone').value,
        email: document.getElementById('custEmail').value,
        company: document.getElementById('custCompany').value,
        address: document.getElementById('custAddress').value,
        notes: document.getElementById('custNotes').value,
        createdAt: new Date().toISOString()
    };

    APP_STATE.customers.push(customer);
    localStorage.setItem(APP_CONFIG.storageKeys.customers, JSON.stringify(APP_STATE.customers));

    closeModal('addCustomerModal');
    renderCustomersGrid();
    showToast('تم حفظ العميل بنجاح', 'success');

    // Reset form
    document.getElementById('customerForm').reset();
}

function selectCustomer(id) {
    const customer = APP_STATE.customers.find(c => c.id === id);
    if (!customer) return;

    // Fill receiver fields
    document.getElementById('receiverName').value = customer.name;
    document.getElementById('receiverPhone').value = customer.phone;
    if (customer.address) {
        document.getElementById('receiverAddress').value = customer.address;
    }

    closeModal('customerModal');
    switchTab('waybill');
    showToast('تم اختيار العميل', 'success');
}

function deleteCustomer(id) {
    if (!confirm('حذف هذا العميل؟')) return;
    
    APP_STATE.customers = APP_STATE.customers.filter(c => c.id !== id);
    localStorage.setItem(APP_CONFIG.storageKeys.customers, JSON.stringify(APP_STATE.customers));
    renderCustomersGrid();
    showToast('تم حذف العميل', 'success');
}

function showCustomerSearch() {
    document.getElementById('customerModal').classList.remove('hidden');
    searchCustomers('');
}

function searchCustomers(query) {
    const resultsContainer = document.getElementById('customerSearchResults');
    if (!resultsContainer) return;

    let filtered = APP_STATE.customers;
    
    if (query) {
        const q = query.toLowerCase();
        filtered = APP_STATE.customers.filter(c =>
            c.name.toLowerCase().includes(q) ||
            c.phone.includes(q)
        );
    }

    resultsContainer.innerHTML = filtered.length ? filtered.map(c => `
        <div class="customer-result-item" onclick="selectCustomer('${c.id}')">
            <strong>${c.name}</strong>
            <span>${c.phone}</span>
        </div>
    `).join('') : '<p class="no-results">لا توجد نتائج</p>';
}

// ========================================
// Barcode Generation
// ========================================

function generateTrackingNumber() {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    const trackingNumber = `${APP_CONFIG.trackingPrefix}-${dateStr}-${random}`;
    
    document.getElementById('trackingNumber').value = trackingNumber;
    generateBarcodeForShipment(trackingNumber);
}

function generateBarcodeForShipment(trackingNumber) {
    const svgElement = document.getElementById('barcodeSvg');
    const numberElement = document.getElementById('barcodeNumber');
    
    if (svgElement && trackingNumber) {
        try {
            JsBarcode(svgElement, trackingNumber, {
                format: 'CODE128',
                width: 2,
                height: 80,
                displayValue: false,
                margin: 10
            });
        } catch (e) {
            console.error('Barcode generation error:', e);
        }
    }
    
    if (numberElement) {
        numberElement.textContent = trackingNumber;
    }
}

function printBarcode() {
    const barcodeDisplay = document.getElementById('barcodeDisplay');
    if (barcodeDisplay) {
        printElement(barcodeDisplay);
    }
}

function downloadBarcode() {
    const svgElement = document.getElementById('barcodeSvg');
    if (svgElement) {
        const svgData = new XMLSerializer().serializeToString(svgElement);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        img.onload = function() {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
            
            const link = document.createElement('a');
            link.download = `barcode-${document.getElementById('trackingNumber')?.value}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        };
        
        img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
    }
}

// ========================================
// Settings & Configuration
// ========================================

function loadSettingsToForm() {
    const settings = APP_STATE.settings;
    
    document.getElementById('settingsStoreName').value = settings.storeName || '';
    document.getElementById('settingsStorePhone').value = settings.storePhone || '';
    document.getElementById('settingsStoreEmail').value = settings.storeEmail || '';
    document.getElementById('settingsStoreAddress').value = settings.storeAddress || '';
    document.getElementById('shippingCompany').value = settings.shippingCompany || 'bosta';
    document.getElementById('defaultCity').value = settings.defaultCity || 'cairo';
    document.getElementById('defaultPackageType').value = settings.defaultPackageType || 'box';
    document.getElementById('enableBrowserNotifications').checked = settings.enableBrowserNotifications !== false;
    document.getElementById('enableSoundNotifications').checked = settings.enableSoundNotifications !== false;
    document.getElementById('enableStockAlerts').checked = settings.enableStockAlerts !== false;
    document.getElementById('enableBostaNotifications').checked = settings.enableBostaNotifications !== false;
    document.getElementById('minStockThreshold').value = settings.minStockThreshold || 5;
    
    // Load logo preview
    if (settings.storeLogo) {
        const preview = document.getElementById('settingsLogoPreview');
        if (preview) {
            preview.src = settings.storeLogo;
            preview.classList.remove('hidden');
        }
    }

    // Load Bosta config
    if (typeof BostaIntegration !== 'undefined') {
        document.getElementById('bostaApiKey').value = BostaIntegration.config.apiKey || '';
        BostaIntegration.updateConnectionStatus();
    }
}

function saveStoreSettings() {
    APP_STATE.settings = {
        ...APP_STATE.settings,
        storeName: document.getElementById('settingsStoreName').value,
        storePhone: document.getElementById('settingsStorePhone').value,
        storeEmail: document.getElementById('settingsStoreEmail').value,
        storeAddress: document.getElementById('settingsStoreAddress').value,
        shippingCompany: document.getElementById('shippingCompany').value,
        defaultCity: document.getElementById('defaultCity').value,
        defaultPackageType: document.getElementById('defaultPackageType').value
    };

    localStorage.setItem(APP_CONFIG.storageKeys.settings, JSON.stringify(APP_STATE.settings));
    applySettings();
    showToast('تم حفظ إعدادات المتجر', 'success');
}

function saveNotificationSettings() {
    const settings = {
        enableBrowserNotifications: document.getElementById('enableBrowserNotifications').checked,
        enableSoundNotifications: document.getElementById('enableSoundNotifications').checked,
        enableStockAlerts: document.getElementById('enableStockAlerts').checked,
        enableBostaNotifications: document.getElementById('enableBostaNotifications').checked,
        minStockThreshold: parseInt(document.getElementById('minStockThreshold').value) || 5
    };

    localStorage.setItem(APP_CONFIG.storageKeys.notificationSettings, JSON.stringify(settings));

    if (typeof Notifications !== 'undefined') {
        Notifications.settings = { ...Notifications.settings, ...settings };
    }

    showToast('تم حفظ إعدادات الإشعارات', 'success');
}

function saveBostaSettings() {
    const apiKey = document.getElementById('bostaApiKey')?.value;
    
    if (!apiKey) {
        showToast('يرجى إدخال مفتاح API', 'warning');
        return;
    }

    if (typeof BostaIntegration !== 'undefined') {
        BostaIntegration.saveSettings(apiKey);
    }
}

function testBostaConnection() {
    if (typeof BostaIntegration !== 'undefined') {
        BostaIntegration.testConnection();
    } else {
        showToast('وحدة بوستا غير متوفرة', 'error');
    }
}

function simulateBostaNotification() {
    const eventType = document.getElementById('simulateBostaEvent')?.value || 'DELIVERED';
    const trackingNumber = document.getElementById('simulateTrackingNumber')?.value || '';

    if (typeof BostaIntegration !== 'undefined') {
        BostaIntegration.simulateNotification(eventType, trackingNumber);
    } else if (typeof WebhookHandler !== 'undefined') {
        WebhookHandler.simulateWebhook(eventType, trackingNumber);
    }
}

function testBostaWebhook() {
    simulateBostaNotification();
}

function copyWebhookUrl() {
    if (typeof BostaIntegration !== 'undefined') {
        BostaIntegration.copyWebhookUrl();
    }
}

function showBotaWebhookInstructions() {
    document.getElementById('bostaInstructionsModal').classList.remove('hidden');
}

function applySettings() {
    const settings = APP_STATE.settings;
    
    // Update header
    const storeNameEl = document.getElementById('storeName');
    if (storeNameEl && settings.storeName) {
        storeNameEl.textContent = settings.storeName;
    }

    // Update logo
    if (settings.storeLogo) {
        const logoImg = document.getElementById('storeLogo');
        const defaultLogo = document.querySelector('.default-logo');
        if (logoImg) {
            logoImg.src = settings.storeLogo;
            logoImg.classList.remove('hidden');
        }
        if (defaultLogo) defaultLogo.classList.add('hidden');
    }
}

function handleLogoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const logoUrl = e.target.result;
        
        // Preview
        const preview = document.getElementById('settingsLogoPreview');
        if (preview) {
            preview.src = logoUrl;
            preview.classList.remove('hidden');
        }

        // Save to settings
        APP_STATE.settings.storeLogo = logoUrl;
        localStorage.setItem(APP_CONFIG.storageKeys.settings, JSON.stringify(APP_STATE.settings));
        applySettings();
        
        showToast('تم رفع الشعار بنجاح', 'success');
    };
    reader.readAsDataURL(file);
}

function removeLogo() {
    APP_STATE.settings.storeLogo = '';
    localStorage.setItem(APP_CONFIG.storageKeys.settings, JSON.stringify(APP_STATE.settings));
    
    const preview = document.getElementById('settingsLogoPreview');
    const defaultLogo = document.querySelector('.default-logo');
    const logoImg = document.getElementById('storeLogo');
    
    if (preview) {
        preview.src = '';
        preview.classList.add('hidden');
    }
    if (defaultLogo) defaultLogo.classList.remove('hidden');
    if (logoImg) logoImg.classList.add('hidden');
    
    showToast('تم حذف الشعار', 'success');
}

// ========================================
// Product & Inventory Forms
// ========================================

function showAddProductModal() {
    document.getElementById('addProductModal').classList.remove('hidden');
    document.getElementById('productForm').reset();
}

function saveProduct(e) {
    e.preventDefault();

    const productData = {
        name: document.getElementById('prodName').value,
        sku: document.getElementById('prodSku').value,
        category: document.getElementById('prodCategory').value,
        price: document.getElementById('prodPrice').value,
        cost: document.getElementById('prodCost').value,
        stock: document.getElementById('prodStock').value,
        minStock: document.getElementById('prodMinStock').value,
        description: document.getElementById('prodDescription').value
    };

    if (typeof Inventory !== 'undefined') {
        Inventory.addProduct(productData);
    }

    closeModal('addProductModal');
    document.getElementById('productForm').reset();
}

function showStockAdjustmentModal() {
    if (typeof Inventory !== 'undefined') {
        Inventory.populateProductSelect('adjustProduct');
    }
    document.getElementById('stockAdjustmentModal').classList.remove('hidden');
    document.getElementById('stockForm').reset();
    document.getElementById('currentStockDisplay').innerHTML = '';
}

function adjustStock(e) {
    e.preventDefault();

    const productId = document.getElementById('adjustProduct').value;
    const type = document.getElementById('adjustType').value;
    const quantity = parseInt(document.getElementById('adjustQuantity').value) || 0;

    if (!productId) {
        showToast('يرجى اختيار المنتج', 'warning');
        return;
    }

    if (typeof Inventory !== 'undefined') {
        Inventory.adjustStock(productId, type, quantity);
    }

    closeModal('stockAdjustmentModal');
}

// Update stock display when product selected
document.addEventListener('change', function(e) {
    if (e.target.id === 'adjustProduct' && typeof Inventory !== 'undefined') {
        const product = Inventory.products.find(p => p.id === e.target.value);
        const display = document.getElementById('currentStockDisplay');
        if (display && product) {
            display.innerHTML = `<strong>المخزون الحالي:</strong> ${product.stock} قطعة`;
        }
    }
});

// Category filter
function filterProductsByCategory(category, btn) {
    APP_STATE.productsCategoryFilter = category;
    
    // Update active button
    document.querySelectorAll('.category-filters .chip-btn').forEach(b => {
        b.classList.toggle('active', b === btn);
    });

    if (typeof Inventory !== 'undefined') {
        Inventory.renderTable(category);
    }
}

// Notification filter
function filterNotifications(filter, btn) {
    APP_STATE.notificationsFilter = filter;
    
    document.querySelectorAll('.notifications-filters .chip-btn').forEach(b => {
        b.classList.toggle('active', b === btn);
    });

    if (typeof Notifications !== 'undefined') {
        Notifications.renderList(filter);
    }
}

// ========================================
// Modal Helpers
// ========================================

function showModal(modalId) {
    document.getElementById(modalId)?.classList.remove('hidden');
}

function closeModal(modalId) {
    document.getElementById(modalId)?.classList.add('hidden');
}

function toggleNotificationsPanel(show) {
    const panel = document.getElementById('notificationsPanel');
    if (!panel) return;

    if (show === undefined) {
        panel.classList.toggle('hidden');
        panel.classList.toggle('show');
    } else {
        panel.classList.toggle('hidden', !show);
        panel.classList.toggle('show', show);
    }

    if (!panel.classList.contains('hidden') && typeof Notifications !== 'undefined') {
        Notifications.renderList();
    }
}

// ========================================
// Barcode Scanner
// ========================================

function openBarcodeScanner() {
    document.getElementById('scannerModal').classList.remove('hidden');
    startScanner();
}

function closeScanner() {
    closeModal('scannerModal');
    stopScanner();
}

let scannerStream = null;

async function startScanner() {
    const video = document.getElementById('scannerVideo');
    if (!video) return;

    try {
        scannerStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' }
        });
        video.srcObject = scannerStream;
    } catch (err) {
        console.error('Camera error:', err);
        showToast('لا يمكن الوصول للكاميرا', 'error');
    }
}

function stopScanner() {
    if (scannerStream) {
        scannerStream.getTracks().forEach(track => track.stop());
        scannerStream = null;
    }
}

function toggleCamera() {
    // Toggle between front and back camera
    stopScanner();
    startScanner();
}

function scanBarcodeFromImage(event) {
    const file = event.target.files[0];
    if (!file) return;

    showToast('جاري قراءة الباركود...', 'info');
    // In a real app, would use a barcode scanning library
}

function scanBarcodeForTracking() {
    openBarcodeScanner();
}

// ========================================
// Utility Functions
// ========================================

function getStatusLabel(status) {
    const labels = {
        'pending': 'قيد الانتظار',
        'picked': 'تم الاستلام',
        'in_transit': 'في الطريق',
        'out_for_delivery': 'مع المندوب',
        'delivered': 'تم التسليم ✓',
        'delivered_fail': 'فشل التسليم',
        'returned': 'مرتجع',
        'cancelled': 'ملغي',
        'exception': 'استثناء ⚠️'
    };
    return labels[status] || status;
}

function getCityLabel(cityValue) {
    const cities = {
        'cairo': 'القاهرة',
        'alexandria': 'الإسكندرية',
        'giza': 'الجيزة',
        'mansoura': 'المنصورة',
        'tanta': 'طنطا',
        'ismailia': 'الإسماعيلية',
        'suez': 'السويس',
        'luxor': 'الأقصر',
        'aswan': 'أسوان',
        'other': 'أخرى'
    };
    return cities[cityValue] || cityValue || '-';
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('ar-EG');
}

function formatDateTime(dateStr) {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('ar-EG');
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.classList.toggle('hidden', !show);
    }
}

function showToast(message, type = 'info', icon = '') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span class="toast-icon">${icon || (type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️')}</span>
        <span class="toast-message">${message}</span>
    `;

    container.appendChild(toast);

    // Auto remove after 3 seconds
    setTimeout(() => {
        toast.style.animation = 'toastOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function fillSenderFromStore() {
    const settings = APP_STATE.settings;
    
    document.getElementById('senderName').value = settings.storeName || '';
    document.getElementById('senderPhone').value = settings.storePhone || '';
    document.getElementById('senderCity').value = settings.defaultCity || 'cairo';
    document.getElementById('senderAddress').value = settings.storeAddress || '';

    showToast('تم ملء بيانات المرسل', 'success');
}

function clearForm() {
    document.getElementById('waybillForm')?.reset();
    document.getElementById('trackingNumber').value = '';
    document.getElementById('barcodeSvg').innerHTML = '';
    document.getElementById('barcodeNumber').textContent = '';
}

function saveAsDraft() {
    const formData = getFormData();
    if (!formData.receiverName) {
        showToast('يرجى ملء بيانات المستلم على الأقل', 'warning');
        return;
    }

    const draft = {
        id: `draft_${Date.now()}`,
        ...formData,
        savedAt: new Date().toISOString()
    };

    APP_STATE.drafts.unshift(draft);
    localStorage.setItem(APP_CONFIG.storageKeys.drafts, JSON.stringify(APP_STATE.drafts));

    showToast('تم حفظ المسودة', 'success');
    clearForm();
}

function printWaybill(shipmentId) {
    const shipment = APP_STATE.shipments.find(s => s.id === shipmentId);
    if (!shipment) return;

    const printContent = document.getElementById('waybillPrintContent');
    if (printContent) {
        printContent.innerHTML = generateWaybillHTML(shipment);
        printElement(printContent.parentElement);
    }
}

function shareTracking(shipmentId) {
    const shipment = APP_STATE.shipments.find(s => s.id === shipmentId);
    if (!shipment) return;

    const text = `تتبع شحنتك: ${shipment.trackingNumber}\nالحالة: ${getStatusLabel(shipment.status)}\nمن تطبيق شحنلي`;

    if (navigator.share) {
        navigator.share({
            title: 'تتبع شحنة - شحنلي',
            text: text
        }).catch(console.error);
    } else {
        navigator.clipboard.writeText(text).then(() => {
            showToast('تم نسخ معلومات الشحنة', 'success');
        });
    }
}

function generateWaybillHTML(shipment) {
    return `
        <div class="waybill-print-content">
            <header class="print-header">
                <h1>${APP_STATE.settings.storeName || 'شحنلي'}</h1>
                <p>بوليصة شحن</p>
            </header>
            <div class="print-tracking">
                <canvas id="printBarcodeCanvas"></canvas>
                <p class="tracking-number">${shipment.trackingNumber}</p>
            </div>
            <div class="print-details">
                <div class="print-section">
                    <h3>المرسل إليه</h3>
                    <p><strong>${shipment.receiverName}</strong></p>
                    <p>${shipment.receiverPhone}</p>
                    <p>${shipment.receiverArea}, ${getCityLabel(shipment.receiverCity)}</p>
                    <p>${shipment.receiverAddress}</p>
                </div>
                <div class="print-section">
                    <h3>بيانات الشحنة</h3>
                    <p>التاريخ: ${formatDate(shipment.createdAt)}</p>
                    <p>الحالة: ${getStatusLabel(shipment.status)}</p>
                    ${shipment.codAmount ? `<p>الدفع عند الاستلام: ${shipment.codAmount} ج.م</p>` : ''}
                </div>
            </div>
        </div>
    `;
}

function printElement(element) {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html dir="rtl">
        <head>
            <title>طباعة - شحنلي</title>
            <style>
                body { font-family: Cairo, sans-serif; padding: 20px; direction: rtl; }
                .print-header { text-align: center; margin-bottom: 20px; }
                .print-tracking { text-align: center; margin: 20px 0; }
                .tracking-number { font-size: 18px; font-weight: bold; letter-spacing: 2px; }
                .print-details { display: flex; gap: 40px; justify-content: center; }
                .print-section { flex: 1; }
                .print-section h3 { border-bottom: 1px solid #ddd; padding-bottom: 5px; }
                @media print { body { padding: 0; } }
            </style>
        </head>
        <body>${element.innerHTML}</body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
}

// ========================================
// Data Export/Import
// ========================================

function exportAllData() {
    const data = {
        version: APP_CONFIG.version,
        exportedAt: new Date().toISOString(),
        shipments: APP_STATE.shipments,
        customers: APP_STATE.customers,
        settings: APP_STATE.settings,
        drafts: APP_STATE.drafts,
        inventory: typeof Inventory !== 'undefined' ? Inventory.exportData() : null
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shipli-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);

    showToast('تم تصدير البيانات بنجاح', 'success');
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            
            if (data.shipments) APP_STATE.shipments = data.shipments;
            if (data.customers) APP_STATE.customers = data.customers;
            if (data.settings) {
                APP_STATE.settings = data.settings;
                applySettings();
            }
            if (data.drafts) APP_STATE.drafts = data.drafts;
            if (data.inventory && typeof Inventory !== 'undefined') {
                Inventory.importData(data.inventory);
            }

            // Save all
            localStorage.setItem(APP_CONFIG.storageKeys.shipments, JSON.stringify(APP_STATE.shipments));
            localStorage.setItem(APP_CONFIG.storageKeys.customers, JSON.stringify(APP_STATE.customers));
            localStorage.setItem(APP_CONFIG.storageKeys.settings, JSON.stringify(APP_STATE.settings));
            localStorage.setItem(APP_CONFIG.storageKeys.drafts, JSON.stringify(APP_STATE.drafts));

            // Refresh UI
            renderShipmentsTable();
            renderCustomersGrid();
            updateDashboardStats();

            showToast('تم استيراد البيانات بنجاح', 'success');
        } catch (err) {
            console.error('Import error:', err);
            showToast('خطأ في قراءة الملف', 'error');
        }
    };
    reader.readAsText(file);
}

function confirmClearData() {
    if (confirm('هل أنت متأكد من مسح جميع البيانات؟ لا يمكن التراجع عن هذا الإجراء!')) {
        localStorage.clear();
        location.reload();
    }
}

// ========================================
// PWA Installation
// ========================================

function initializePWA() {
    // Register service worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW registered:', registration.scope);
            })
            .catch(error => {
                console.log('SW registration failed:', error);
            });
    }
}

function showInstallBanner() {
    const banner = document.getElementById('installBanner');
    if (banner) banner.classList.remove('hidden');
}

document.getElementById('installBtn')?.addEventListener('click', async () => {
    if (APP_STATE.deferredInstallPrompt) {
        APP_STATE.deferredInstallPrompt.prompt();
        const { outcome } = await APP_STATE.deferredInstallPrompt.userChoice;
        
        if (outcome === 'accepted') {
            showToast('تم تثبت التطبيق بنجاح!', 'success');
        }
        
        APP_STATE.deferredInstallPrompt = null;
        document.getElementById('installBanner')?.classList.add('hidden');
    }
});

document.getElementById('dismissInstall')?.addEventListener('click', () => {
    document.getElementById('installBanner')?.classList.add('hidden');
});

// ========================================
// Firebase Sync
// ========================================

function syncDataWithFirebase() {
    if (!db || !auth.currentUser) return;

    const userId = auth.currentUser.uid;

    // Sync shipments
    db.ref(`users/${userId}/shipments`).set(APP_STATE.shipments);
    
    // Sync customers
    db.ref(`users/${userId}/customers`).set(APP_STATE.customers);
    
    // Listen for remote changes
    db.ref(`users/${userId}/shipments`).on('value', (snapshot) => {
        const data = snapshot.val();
        if (data && Array.isArray(data)) {
            APP_STATE.shipments = data;
            renderShipmentsTable();
            updateDashboardStats();
        }
    });
}

function syncShipmentToFirebase(shipment) {
    if (!db || !auth.currentUser) return;
    
    const userId = auth.currentUser.uid;
    db.ref(`users/${userId}/shipments/${shipment.id}`).set(shipment);
}

// ========================================
// Online Status
// ========================================

function checkOnlineStatus() {
    const offlineStatus = document.getElementById('offlineStatus');
    if (offlineStatus) {
        offlineStatus.textContent = APP_STATE.isOnline ? 'متصل' : 'غير متصل';
        offlineStatus.className = APP_STATE.isOnline ? '' : 'text-danger';
    }
}

// ========================================
// Helper: Request notification permission
// ========================================

function requestNotificationPermission() {
    if (typeof Notifications !== 'undefined') {
        Notifications.requestPermission();
    }
}

// ========================================
// Helper: Check for updates
// ========================================

function checkForUpdates() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistration().then(reg => {
            if (reg) {
                reg.update();
                showToast('جاري التحقق من التحديثات...', 'info');
            }
        });
    }
}

// Make functions globally available
window.switchTab = switchTab;
window.showModal = showModal;
window.closeModal = closeModal;
window.toggleNotificationsPanel = toggleNotificationsPanel;
window.showToast = showToast;
window.showLoading = showLoading;
window.filterProductsByCategory = filterProductsByCategory;
window.filterNotifications = filterNotifications;
window.trackShipment = trackShipment;
window.trackWithBosta = trackWithBosta;
window.refreshBostaTracking = refreshBostaTracking;
window.openBarcodeScanner = openBarcodeScanner;
window.closeScanner = closeScanner;
window.toggleCamera = toggleCamera;
window.scanBarcodeForTracking = scanBarcodeForTracking;
window.scanBarcodeFromImage = scanBarcodeFromImage;
window.showCustomerSearch = showCustomerSearch;
window.searchCustomers = searchCustomers;
window.showAddCustomerModal = showAddCustomerModal;
window.saveCustomer = saveCustomer;
window.selectCustomer = selectCustomer;
window.deleteCustomer = deleteCustomer;
window.showAddProductModal = showAddProductModal;
window.saveProduct = saveProduct;
window.showStockAdjustmentModal = showStockAdjustmentModal;
window.adjustStock = adjustStock;
window.generateTrackingNumber = generateTrackingNumber;
window.printBarcode = printBarcode;
window.downloadBarcode = downloadBarcode;
window.fillSenderFromStore = fillSenderFromStore;
window.clearForm = clearForm;
window.saveAsDraft = saveAsDraft;
window.printWaybill = printWaybill;
window.shareTracking = shareTracking;
window.saveStoreSettings = saveStoreSettings;
window.saveNotificationSettings = saveNotificationSettings;
window.saveBostaSettings = saveBostaSettings;
window.testBostaConnection = testBostaConnection;
window.simulateBostaNotification = simulateBostaNotification;
window.testBostaWebhook = testBostaWebhook;
window.copyWebhookUrl = copyWebhookUrl;
window.showBotaWebhookInstructions = showBotaWebhookInstructions;
window.handleLogoUpload = handleLogoUpload;
window.removeLogo = removeLogo;
window.exportAllData = exportAllData;
window.importData = importData;
window.confirmClearData = confirmClearData;
window.requestNotificationPermission = requestNotificationPermission;
window.checkForUpdates = checkForUpdates;
window.showShipmentDetails = showShipmentDetails;
window.deleteShipment = deleteShipment;
