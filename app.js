/**
 * ========================================
 * شحنلي - Shipping Management PWA
 * Main Application JavaScript
 * ========================================
 * Features:
 * - PWA Installation & Service Worker
 * - Firebase Realtime Database Integration
 * - Waybill/Shipment Management
 * - Barcode Generation & Scanning
 * - Customer CRM
 * - Real-time Tracking
 * - Store Customization
 * ========================================
 */

// ========================================
// Global Configuration & State
// ========================================

const APP_CONFIG = {
    name: 'شحنلي',
    version: '2.0.0',
    defaultCurrency: 'ج.م',
    trackingPrefix: 'SH',
    storageKeys: {
        shipments: 'shipli_shipments',
        customers: 'shipli_customers',
        settings: 'shipli_settings',
        drafts: 'shipli_drafts',
        installPrompt: 'shipli_install_prompt'
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
    firebaseInitialized: false
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
    console.log(`🚀 ${APP_CONFIG.name} v${APP_CONFIG.version} is initializing...`);
    
    initializeFirebase();
    loadLocalData();
    setupEventListeners();
    initializePWA();
    updateDashboardStats();
    setTodayDate();
    checkOnlineStatus();
    
    console.log('✅ Application initialized successfully');
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
        console.log('🔥 Firebase initialized successfully');
        
        // Listen for auth state changes
        auth.onAuthStateChanged(user => {
            if (user) {
                console.log('👤 User authenticated:', user.email);
                syncDataWithFirebase();
            } else {
                console.log('👤 No user authenticated');
                signInAnonymously();
            }
        });
        
    } catch (error) {
        console.error('❌ Firebase initialization error:', error);
        showToast('خطأ في الاتصال بقاعدة البيانات', 'error');
    }
}

async function signInAnonymously() {
    try {
        await auth.signInAnonymously();
        console.log('👤 Signed in anonymously');
    } catch (error) {
        console.error('Anonymous sign-in failed:', error);
    }
}

function loadLocalData() {
    try {
        // Load settings
        const savedSettings = localStorage.getItem(APP_CONFIG.storageKeys.settings);
        APP_STATE.settings = savedSettings ? JSON.parse(savedSettings) : getDefaultSettings();
        applySettings();
        
        // Load shipments
        const savedShipments = localStorage.getItem(APP_CONFIG.storageKeys.shipments);
        APP_STATE.shipments = savedShipments ? JSON.parse(savedShipments) : [];
        
        // Load customers
        const savedCustomers = localStorage.getItem(APP_CONFIG.storageKeys.customers);
        APP_STATE.customers = savedCustomers ? JSON.parse(savedCustomers) : [];
        
        // Load drafts
        const savedDrafts = localStorage.getItem(APP_CONFIG.storageKeys.drafts);
        APP_STATE.drafts = savedDrafts ? JSON.parse(savedDrafts) : [];
        
        console.log(`📦 Loaded ${APP_STATE.shipments.length} shipments, ${APP_STATE.customers.length} customers`);
        
    } catch (error) {
        console.error('Error loading local data:', error);
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
        autoPrintBarcode: false
    };
}

function applySettings() {
    const settings = APP_STATE.settings;
    
    // Apply store name
    if (settings.storeName && settings.storeName !== 'شحنلي') {
        document.getElementById('storeName').textContent = settings.storeName;
    }
    
    // Apply logo
    if (settings.storeLogo) {
        const logoImg = document.getElementById('storeLogo');
        logoImg.src = settings.storeLogo;
        logoImg.classList.remove('hidden');
        document.querySelector('.default-logo').classList.add('hidden');
    }
    
    // Apply to settings form
    document.getElementById('settingsStoreName').value = settings.storeName || '';
    document.getElementById('settingsStorePhone').value = settings.storePhone || '';
    document.getElementById('settingsStoreEmail').value = settings.storeEmail || '';
    document.getElementById('settingsStoreAddress').value = settings.storeAddress || '';
    document.getElementById('shippingCompany').value = settings.shippingCompany || 'bosta';
    document.getElementById('defaultCity').value = settings.defaultCity || 'cairo';
    document.getElementById('defaultPackageType').value = settings.defaultPackageType || 'box';
    document.getElementById('enableSMS').checked = settings.enableSMS ?? true;
    document.getElementById('autoPrintBarcode').checked = settings.autoPrintBarcode || false;
}

// ========================================
// PWA Installation & Service Worker
// ========================================

function initializePWA() {
    // Register Service Worker
    registerServiceWorker();
    
    // Listen for install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        APP_STATE.deferredInstallPrompt = e;
        showInstallBanner();
    });
    
    // Detect app installation
    window.addEventListener('appinstalled', () => {
        hideInstallBanner();
        APP_STATE.deferredInstallPrompt = null;
        showToast('تم تثبيت التطبيق بنجاح! 🎉', 'success');
        updatePWAStatus('مثبت ✓');
    });
    
    // Check if already installed
    if (isAppInstalled()) {
        updatePWAStatus('مثبت ✓');
    } else {
        updatePWAStatus('يمكن التثبيت');
    }
}

function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js')
            .then(registration => {
                console.log('✅ Service Worker registered:', registration.scope);
                
                // Check for updates
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'activated') {
                            showToast('تم تحديث التطبيق', 'info');
                        }
                    });
                });
            })
            .catch(error => {
                console.error('❌ Service Worker registration failed:', error);
            });
    }
}

function showInstallBanner() {
    // Don't show if already dismissed or installed
    if (localStorage.getItem('install_dismissed')) return;
    if (isAppInstalled()) return;
    
    const banner = document.getElementById('installBanner');
    banner.classList.remove('hidden');
}

function hideInstallBanner() {
    document.getElementById('installBanner').classList.add('hidden');
}

function isAppInstalled() {
    return window.matchMedia('(display-mode: standalone)').matches ||
           window.navigator.standalone === true;
}

async function installApp() {
    if (!APP_STATE.deferredInstallPrompt) {
        showToast('التثبيت غير متاح حالياً', 'warning');
        return;
    }
    
    try {
        APP_STATE.deferredInstallPrompt.prompt();
        const { outcome } = await APP_STATE.deferredInstallPrompt.userChoice;
        
        if (outcome === 'accepted') {
            console.log('User accepted install prompt');
        } else {
            console.log('User dismissed install prompt');
        }
        
        APP_STATE.deferredInstallPrompt = null;
        hideInstallBanner();
        
    } catch (error) {
        console.error('Installation error:', error);
        showToast('حدث خطأ أثناء التثبيت', 'error');
    }
}

function dismissInstall() {
    hideInstallBanner();
    localStorage.setItem('install_dismissed', 'true');
}

function updatePWAStatus(status) {
    const statusEl = document.getElementById('pwaStatus');
    if (statusEl) statusEl.textContent = status;
}

// Install button event listener
document.getElementById('installBtn')?.addEventListener('click', installApp);
document.getElementById('dismissInstall')?.addEventListener('click', dismissInstall);

// ========================================
// Event Listeners
// ========================================

function setupEventListeners() {
    // Navigation tabs
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });
    
    // Waybill form submission
    document.getElementById('waybillForm')?.addEventListener('submit', handleWaybillSubmit);
    
    // Search & filter
    document.getElementById('shipmentSearch')?.addEventListener('input', debounce(filterShipments, 300));
    document.getElementById('filterStatus')?.addEventListener('change', filterShipments);
    
    // Pagination
    document.getElementById('prevPage')?.addEventListener('click', () => changePage(-1));
    document.getElementById('nextPage')?.addEventListener('click', () => changePage(1));
    
    // Online/Offline events
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Settings buttons
    document.getElementById('settingsBtn')?.addEventListener('click', () => switchTab('settings'));
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

// ========================================
// Navigation
// ========================================

function switchTab(tabId) {
    // Update active tab
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabId);
    });
    
    // Update active content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === tabId);
    });
    
    APP_STATE.currentTab = tabId;
    
    // Refresh data when switching tabs
    if (tabId === 'dashboard') {
        updateDashboardStats();
        renderRecentShipments();
    } else if (tabId === 'shipments') {
        renderShipmentsTable();
    } else if (tabId === 'customers') {
        renderCustomersGrid();
    } else if (tabId === 'waybill') {
        generateTrackingNumber();
    }
}

// ========================================
// Dashboard
// ========================================

function updateDashboardStats() {
    const shipments = APP_STATE.shipments;
    
    const total = shipments.length;
    const delivered = shipments.filter(s => s.status === 'delivered').length;
    const inTransit = shipments.filter(s => ['picked', 'in_transit'].includes(s.status)).length;
    const returned = shipments.filter(s => s.status === 'returned').length;
    
    animateCounter('totalShipments', total);
    animateCounter('deliveredCount', delivered);
    animateCounter('inTransitCount', inTransit);
    animateCounter('returnedCount', returned);
    
    // Today's stats
    const today = new Date().toISOString().split('T')[0];
    const todayShipments = shipments.filter(s => s.createdAt?.startsWith(today));
    
    document.getElementById('todayNew').textContent = todayShipments.length;
    document.getElementById('todayPicked').textContent = todayShipments.filter(s => s.status === 'picked').length;
    document.getElementById('todayTransit').textContent = todayShipments.filter(s => s.status === 'in_transit').length;
    document.getElementById('todayDelivered').textContent = todayShipments.filter(s => s.status === 'delivered').length;
}

function animateCounter(elementId, targetValue) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const duration = 500;
    const startValue = parseInt(element.textContent) || 0;
    const startTime = performance.now();
    
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        const currentValue = Math.floor(startValue + (targetValue - startValue) * easeOutQuad(progress));
        element.textContent = currentValue;
        
        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }
    
    requestAnimationFrame(update);
}

function easeOutQuad(t) {
    return t * (2 - t);
}

function renderRecentShipments() {
    const container = document.getElementById('recentShipmentsList');
    if (!container) return;
    
    const recentShipments = APP_STATE.shipments.slice(-5).reverse();
    
    if (recentShipments.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">📭</span>
                <p>لا توجد شحنات بعد</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = recentShipments.map(shipment => `
        <div class="shipment-item" onclick="showShipmentDetails('${shipment.id}')">
            <span class="shipment-number">${shipment.trackingNumber}</span>
            <span class="shipment-customer">${shipment.receiverName}</span>
            <span class="shipment-status-small status-badge ${shipment.status}">
                ${getStatusText(shipment.status)}
            </span>
        </div>
    `).join('');
}

function setTodayDate() {
    const todayEl = document.getElementById('todayDate');
    if (todayEl) {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        todayEl.textContent = new Date().toLocaleDateString('ar-EG', options);
    }
}

// ========================================
// Shipments Management
// ========================================

function renderShipmentsTable() {
    const tbody = document.getElementById('shipmentsTableBody');
    if (!tbody) return;
    
    let filteredShipments = getFilteredShipments();
    
    // Pagination
    const startIndex = (APP_STATE.currentPage - 1) * APP_STATE.itemsPerPage;
    const endIndex = startIndex + APP_STATE.itemsPerPage;
    const paginatedShipments = filteredShipments.slice(startIndex, endIndex);
    
    if (paginatedShipments.length === 0) {
        tbody.innerHTML = `
            <tr class="empty-row">
                <td colspan="7">
                    <div class="empty-state">
                        <span class="empty-icon">📭</span>
                        <p>لا توجد شحنات</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = paginatedShipments.map(shipment => `
        <tr>
            <td><strong>${shipment.trackingNumber}</strong></td>
            <td>${shipment.receiverName}</td>
            <td dir="ltr">${shipment.receiverPhone}</td>
            <td>${getCityName(shipment.receiverCity)}</td>
            <td><span class="status-badge ${shipment.status}">${getStatusText(shipment.status)}</span></td>
            <td>${formatDate(shipment.createdAt)}</td>
            <td>
                <div class="table-actions">
                    <button class="table-action-btn view" onclick="showShipmentDetails('${shipment.id}')" title="عرض">👁️</button>
                    <button class="table-action-btn edit" onclick="editShipment('${shipment.id}')" title="تعديل">✏️</button>
                    <button class="table-action-btn delete" onclick="deleteShipment('${shipment.id}')" title="حذف">🗑️</button>
                    <button class="table-action-btn view" onclick="printShipment('${shipment.id}')" title="طباعة">🖨️</button>
                </div>
            </td>
        </tr>
    `).join('');
    
    updatePagination(filteredShipments.length);
}

function getFilteredShipments() {
    let filtered = [...APP_STATE.shipments];
    
    const searchTerm = document.getElementById('shipmentSearch')?.value.toLowerCase() || '';
    const statusFilter = document.getElementById('filterStatus')?.value || '';
    
    if (searchTerm) {
        filtered = filtered.filter(s => 
            s.trackingNumber.toLowerCase().includes(searchTerm) ||
            s.receiverName.toLowerCase().includes(searchTerm) ||
            s.receiverPhone.includes(searchTerm)
        );
    }
    
    if (statusFilter) {
        filtered = filtered.filter(s => s.status === statusFilter);
    }
    
    // Sort by date (newest first)
    filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    return filtered;
}

function filterShipments() {
    APP_STATE.currentPage = 1;
    renderShipmentsTable();
}

function updatePagination(totalItems) {
    const totalPages = Math.ceil(totalItems / APP_STATE.itemsPerPage);
    
    document.getElementById('currentPage').textContent = APP_STATE.currentPage;
    document.getElementById('totalPages').textContent = totalPages || 1;
    
    document.getElementById('prevPage').disabled = APP_STATE.currentPage <= 1;
    document.getElementById('nextPage').disabled = APP_STATE.currentPage >= totalPages;
}

function changePage(delta) {
    APP_STATE.currentPage += delta;
    renderShipmentsTable();
}

// ========================================
// Waybill Creation
// ========================================

function handleWaybillSubmit(e) {
    e.preventDefault();
    
    const shipment = createShipmentFromForm();
    
    // Validate required fields
    if (!validateShipment(shipment)) {
        return;
    }
    
    // Generate ID and tracking number
    shipment.id = generateUniqueId();
    shipment.trackingNumber = document.getElementById('trackingNumber').value || generateTrackingNumber();
    shipment.createdAt = new Date().toISOString();
    shipment.updatedAt = new Date().toISOString();
    shipment.status = 'pending';
    shipment.timeline = [{
        status: 'pending',
        message: 'تم إنشاء البوليصة',
        timestamp: new Date().toISOString(),
        location: 'المكتب'
    }];
    
    // Save to local state
    APP_STATE.shipments.push(shipment);
    saveShipmentsToStorage();
    
    // Sync with Firebase
    saveShipmentToFirebase(shipment);
    
    // Show success message
    showToast('تم إنشاء البوليصة بنجاح! 📦', 'success');
    
    // Auto print barcode if enabled
    if (APP_STATE.settings.autoPrintBarcode) {
        printBarcode();
    }
    
    // Clear form or prepare for next
    if (confirm('هل تريد إنشاء بوليصة أخرى؟')) {
        clearForm();
        generateTrackingNumber();
    } else {
        switchTab('shipments');
    }
    
    updateDashboardStats();
}

function createShipmentFromForm() {
    return {
        shipmentType: document.getElementById('shipmentType').value,
        packageType: document.getElementById('packageType').value,
        weight: parseFloat(document.getElementById('weight').value) || 0,
        pieces: parseInt(document.getElementById('pieces').value) || 1,
        description: document.getElementById('description').value,
        declaredValue: parseFloat(document.getElementById('declaredValue').value) || 0,
        codAmount: parseFloat(document.getElementById('codAmount').value) || 0,
        
        senderName: document.getElementById('senderName').value,
        senderPhone: document.getElementById('senderPhone').value,
        senderCity: document.getElementById('senderCity').value,
        senderArea: document.getElementById('senderArea').value,
        senderAddress: document.getElementById('senderAddress').value,
        
        receiverName: document.getElementById('receiverName').value,
        receiverPhone: document.getElementById('receiverPhone').value,
        receiverPhone2: document.getElementById('receiverPhone2').value,
        receiverCity: document.getElementById('receiverCity').value,
        receiverArea: document.getElementById('receiverArea').value,
        receiverAddress: document.getElementById('receiverAddress').value,
        receiverNotes: document.getElementById('receiverNotes').value,
        
        shippingCompany: APP_STATE.settings.shippingCompany || 'bosta'
    };
}

function validateShipment(shipment) {
    const requiredFields = [
        { field: 'shipmentType', label: 'نوع الشحنة' },
        { field: 'packageType', label: 'نوع الطرد' },
        { field: 'senderName', label: 'اسم المرسل' },
        { field: 'senderPhone', label: 'هاتف المرسل' },
        { field: 'senderCity', label: 'مدينة المرسل' },
        { field: 'senderArea', label: 'منطقة المرسل' },
        { field: 'senderAddress', label: 'عنوان المرسل' },
        { field: 'receiverName', label: 'اسم المستلم' },
        { field: 'receiverPhone', label: 'هاتف المستلم' },
        { field: 'receiverCity', label: 'مدينة المستلم' },
        { field: 'receiverArea', label: 'منطقة المستلم' },
        { field: 'receiverAddress', label: 'عنوان المستلم' }
    ];
    
    for (const { field, label } of requiredFields) {
        if (!shipment[field] || shipment[field].trim() === '') {
            showToast(`يرجى إدخال ${label}`, 'error');
            return false;
        }
    }
    
    // Validate phone numbers
    const phoneRegex = /^01[0-9]{9}$/;
    if (!phoneRegex.test(shipment.senderPhone)) {
        showToast('رقم هاتف المرسل غير صحيح', 'error');
        return false;
    }
    if (!phoneRegex.test(shipment.receiverPhone)) {
        showToast('رقم هاتف المستلم غير صحيح', 'error');
        return false;
    }
    
    return true;
}

function clearForm() {
    document.getElementById('waybillForm').reset();
    document.getElementById('barcodeDisplay').innerHTML = '<svg id="barcodeSvg"></svg><p class="barcode-number" id="barcodeNumber"></p>';
}

function saveAsDraft() {
    const shipment = createShipmentFromForm();
    shipment.id = generateUniqueId();
    shipment.savedAt = new Date().toISOString();
    
    APP_STATE.drafts.push(shipment);
    localStorage.setItem(APP_CONFIG.storageKeys.drafts, JSON.stringify(APP_STATE.drafts));
    
    showToast('تم الحفظ كمسودة ✅', 'success');
}

function fillSenderFromStore() {
    const settings = APP_STATE.settings;
    document.getElementById('senderName').value = settings.storeName || '';
    document.getElementById('senderPhone').value = settings.storePhone || '';
    document.getElementById('senderCity').value = settings.defaultCity || '';
    document.getElementById('senderAddress').value = settings.storeAddress || '';
}

// ========================================
// Barcode Generation
// ========================================

function generateTrackingNumber() {
    const now = new Date();
    const dateStr = now.getFullYear().toString() +
                   String(now.getMonth() + 1).padStart(2, '0') +
                   String(now.getDate()).padStart(2, '0');
    
    const randomNum = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
    const count = APP_STATE.shipments.length + 1;
    const sequence = String(count).padStart(3, '0');
    
    const trackingNumber = `${APP_CONFIG.trackingPrefix}-${dateStr}-${sequence}`;
    
    document.getElementById('trackingNumber').value = trackingNumber;
    renderBarcode(trackingNumber);
    
    return trackingNumber;
}

function renderBarcode(value) {
    if (!value) return;
    
    try {
        JsBarcode('#barcodeSvg', value, {
            format: 'CODE128',
            width: 2,
            height: 80,
            displayValue: false,
            margin: 10,
            background: '#ffffff',
            lineColor: '#1e40af'
        });
        
        document.getElementById('barcodeNumber').textContent = value;
    } catch (error) {
        console.error('Barcode generation error:', error);
        showToast('خطأ في توليد الباركود', 'error');
    }
}

function printBarcode() {
    const trackingNumber = document.getElementById('trackingNumber').value;
    if (!trackingNumber) {
        showToast('لا يوجد باركود للطباعة', 'warning');
        return;
    }
    
    const printContent = `
        <div style="text-align: center; padding: 20px; font-family: Cairo, sans-serif;">
            <h2 style="margin-bottom: 10px;">${APP_STATE.settings.storeName || APP_CONFIG.name}</h2>
            <div id="printBarcode"></div>
            <p style="font-size: 18px; font-weight: bold; letter-spacing: 2px; direction: ltr;">${trackingNumber}</p>
            <hr style="margin: 15px 0; border: 2px dashed #333;">
            <p style="font-size: 12px; color: #666;">${new Date().toLocaleDateString('ar-EG')}</p>
        </div>
    `;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html dir="rtl">
        <head>
            <title>باركود الشحنة</title>
            <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"><\/script>
        </head>
        <body>
            ${printContent}
            <script>
                JsBarcode('#printBarcode', '${trackingNumber}', {
                    format: 'CODE128',
                    width: 2.5,
                    height: 100,
                    displayValue: false,
                    margin: 15
                });
                window.print();
            <\/script>
        </body>
        </html>
    `);
    printWindow.document.close();
}

function downloadBarcode() {
    const svg = document.getElementById('barcodeSvg');
    if (!svg) return;
    
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = function() {
        canvas.width = img.width * 2;
        canvas.height = img.height * 2;
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        const link = document.createElement('a');
        link.download = `barcode-${document.getElementById('trackingNumber').value}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    };
    
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
}

// ========================================
// Tracking
// ========================================

function trackShipment() {
    const searchInput = document.getElementById('trackingSearchInput');
    const searchValue = searchInput.value.trim();
    
    if (!searchValue) {
        showToast('يرجى إدخال رقم الشحنة', 'warning');
        return;
    }
    
    const shipment = APP_STATE.shipments.find(s => 
        s.trackingNumber.toLowerCase() === searchValue.toLowerCase() ||
        s.id === searchValue
    );
    
    if (!shipment) {
        showToast('لم يتم العثور على الشحنة', 'error');
        showTrackingEmpty();
        return;
    }
    
    displayTrackingResult(shipment);
}

function displayTrackingResult(shipment) {
    document.getElementById('trackingEmpty').classList.add('hidden');
    document.getElementById('trackingResult').classList.remove('hidden');
    
    // Header info
    document.getElementById('trackedShipmentNumber').textContent = shipment.trackingNumber;
    document.getElementById('trackedStatus').textContent = getStatusText(shipment.status);
    document.getElementById('trackedStatus').className = `status-badge ${shipment.status}`;
    
    // Timeline
    const timelineContainer = document.getElementById('trackingTimeline');
    const timeline = shipment.timeline || getDefaultTimeline(shipment.status);
    
    timelineContainer.innerHTML = timeline.map((item, index) => `
        <div class="timeline-item ${index === timeline.length - 1 ? 'active' : 'completed'}">
            <div class="timeline-dot"></div>
            <div class="timeline-content">
                <h4>${item.message}</h4>
                <p>${item.location || ''}</p>
                <span class="timeline-time">${formatDateTime(item.timestamp)}</span>
            </div>
        </div>
    `).join('');
    
    // Details
    const detailsGrid = document.getElementById('shipmentDetailsGrid');
    detailsGrid.innerHTML = `
        <div class="detail-item">
            <span class="detail-label">المرسل إليه</span>
            <span class="detail-value">${shipment.receiverName}</span>
        </div>
        <div class="detail-item">
            <span class="detail-label">الهاتف</span>
            <span class="detail-value" dir="ltr">${shipment.receiverPhone}</span>
        </div>
        <div class="detail-item">
            <span class="detail-label">العنوان</span>
            <span class="detail-value">${shipment.receiverAddress}, ${getCityName(shipment.receiverCity)}</span>
        </div>
        <div class="detail-item">
            <span class="detail-label">نوع الشحنة</span>
            <span class="detail-value">${getShipmentTypeName(shipment.shipmentType)}</span>
        </div>
        <div class="detail-item">
            <span class="detail-label">الوزن</span>
            <span class="detail-value">${shipment.weight} كجم</span>
        </div>
        <div class="detail-item">
            <span class="detail-label">قيمة الدفع عند الاستلام</span>
            <span class="detail-value">${shipment.codAmount} ${APP_CONFIG.defaultCurrency}</span>
        </div>
        <div class="detail-item">
            <span class="detail-label">تاريخ الإنشاء</span>
            <span class="detail-value">${formatDate(shipment.createdAt)}</span>
        </div>
        <div class="detail-item">
            <span class="detail-label">آخر تحديث</span>
            <span class="detail-value">${formatDate(shipment.updatedAt)}</span>
        </div>
    `;
}

function showTrackingEmpty() {
    document.getElementById('trackingResult').classList.add('hidden');
    document.getElementById('trackingEmpty').classList.remove('hidden');
}

function getDefaultTimeline(status) {
    const baseTimeline = [
        { status: 'pending', message: 'تم إنشاء الشحنة', timestamp: new Date().toISOString(), location: 'المكتب' }
    ];
    
    const statusMap = {
        picked: [{ status: 'picked', message: 'تم استلام الشحنة من المرسل', timestamp: new Date().toISOString(), location: 'المكتب' }],
        in_transit: [
            { status: 'picked', message: 'تم استلام الشحنة من المرسل', timestamp: new Date().toISOString(), location: 'المكتب' },
            { status: 'in_transit', message: 'الشحنة في الطريق', timestamp: new Date().toISOString(), location: 'مركز التوزيع' }
        ],
        delivered: [
            { status: 'picked', message: 'تم استلام الشحنة من المرسل', timestamp: new Date().toISOString(), location: 'المكتب' },
            { status: 'in_transit', message: 'الشحنة في الطريق', timestamp: new Date().toISOString(), location: 'مركز التوزيع' },
            { status: 'delivered', message: 'تم التسليم بنجاح', timestamp: new Date().toISOString(), location: 'عنوان المستلم' }
        ]
    };
    
    return baseTimeline.concat(statusMap[status] || []);
}

function shareTracking() {
    const trackingNumber = document.getElementById('trackedShipmentNumber').textContent;
    
    if (navigator.share) {
        navigator.share({
            title: 'تتبع شحنة',
            text: `تابع شحنتك: ${trackingNumber}`,
            url: window.location.href
        }).catch(console.error);
    } else {
        navigator.clipboard.writeText(trackingNumber).then(() => {
            showToast('تم نسخ رقم التتبع 📋', 'success');
        }).catch(() => {
            showToast(trackingNumber, 'info', 5000);
        });
    }
}

// ========================================
// Customer Management (CRM)
// ========================================

function renderCustomersGrid() {
    const container = document.getElementById('customersGrid');
    if (!container) return;
    
    if (APP_STATE.customers.length === 0) {
        container.innerHTML = `
            <div class="empty-state large" style="grid-column: 1 / -1;">
                <span class="empty-icon">👥</span>
                <h3>لا يوجد عملاء بعد</h3>
                <p>ابدأ بإضافة عملائك لإدارة شحناتهم بسهولة</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = APP_STATE.customers.map(customer => `
        <div class="customer-card">
            <div class="customer-header">
                <div class="customer-avatar">
                    ${customer.avatar 
                        ? `<img src="${customer.avatar}" alt="${customer.name}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`
                        : customer.name.charAt(0).toUpperCase()
                    }
                </div>
                <div>
                    <div class="customer-name">${customer.name}</div>
                    <div class="customer-company">${customer.company || ''}</div>
                </div>
            </div>
            <div class="customer-details">
                <div class="customer-detail">
                    <span class="customer-detail-icon">📱</span>
                    <span dir="ltr">${customer.phone}</span>
                </div>
                ${customer.email ? `
                <div class="customer-detail">
                    <span class="customer-detail-icon">✉️</span>
                    <span>${customer.email}</span>
                </div>
                ` : ''}
                ${customer.address ? `
                <div class="customer-detail">
                    <span class="customer-detail-icon">📍</span>
                    <span>${customer.address}</span>
                </div>
                ` : ''}
            </div>
            <div class="customer-stats">
                <div class="customer-stat">
                    <div class="customer-stat-value">${customer.totalOrders || 0}</div>
                    <div class="customer-stat-label">طلبات</div>
                </div>
                <div class="customer-stat">
                    <div class="customer-stat-value">${customer.totalSpent || 0}</div>
                    <div class="customer-stat-label">إجمالي</div>
                </div>
            </div>
            <div class="customer-card-actions">
                <button class="primary-btn small" onclick="selectCustomer('${customer.id}')">اختيار</button>
                <button class="secondary-btn small" onclick="editCustomer('${customer.id}')">تعديل</button>
                <button class="danger-btn small" onclick="deleteCustomer('${customer.id}')">حذف</button>
            </div>
        </div>
    `).join('');
}

function showAddCustomerModal() {
    document.getElementById('addCustomerModal').classList.remove('hidden');
    document.getElementById('customerForm').reset();
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
}

function saveCustomer(e) {
    e.preventDefault();
    
    const customer = {
        id: generateUniqueId(),
        name: document.getElementById('custName').value.trim(),
        phone: document.getElementById('custPhone').value.trim(),
        email: document.getElementById('custEmail').value.trim(),
        company: document.getElementById('custCompany').value.trim(),
        address: document.getElementById('custAddress').value.trim(),
        notes: document.getElementById('custNotes').value.trim(),
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(document.getElementById('custName').value)}&background=2563eb&color=fff`,
        totalOrders: 0,
        totalSpent: 0,
        createdAt: new Date().toISOString()
    };
    
    // Validate
    if (!customer.name || !customer.phone) {
        showToast('يرجى إدخال الاسم والهاتف', 'error');
        return;
    }
    
    APP_STATE.customers.push(customer);
    saveCustomersToStorage();
    saveCustomerToFirebase(customer);
    
    closeModal('addCustomerModal');
    renderCustomersGrid();
    showToast('تم إضافة العميل بنجاح 👤', 'success');
}

function selectCustomer(customerId) {
    const customer = APP_STATE.customers.find(c => c.id === customerId);
    if (!customer) return;
    
    // Fill receiver fields
    document.getElementById('receiverName').value = customer.name;
    document.getElementById('receiverPhone').value = customer.phone;
    document.getElementById('receiverAddress').value = customer.address || '';
    
    if (customer.email) {
        // Email goes to notes for now
        document.getElementById('receiverNotes').value = `البريد: ${customer.email}`;
    }
    
    closeModal('customerModal');
    switchTab('waybill');
    showToast('تم اختيار العميل ✅', 'success');
}

function showCustomerSearch() {
    document.getElementById('customerModal').classList.remove('hidden');
    searchCustomers('');
}

function searchCustomers(query) {
    const resultsContainer = document.getElementById('customerSearchResults');
    
    let filtered = APP_STATE.customers;
    
    if (query) {
        query = query.toLowerCase();
        filtered = filtered.filter(c => 
            c.name.toLowerCase().includes(query) ||
            c.phone.includes(query) ||
            (c.company && c.company.toLowerCase().includes(query))
        );
    }
    
    if (filtered.length === 0) {
        resultsContainer.innerHTML = `
            <div class="empty-state">
                <p>لا توجد نتائج</p>
            </div>
        `;
        return;
    }
    
    resultsContainer.innerHTML = filtered.map(customer => `
        <div class="customer-result-item" onclick="selectCustomer('${customer.id}')">
            <div class="customer-avatar" style="width:40px;height:40px;font-size:1rem;">
                ${customer.name.charAt(0)}
            </div>
            <div>
                <div style="font-weight:600;">${customer.name}</div>
                <div style="font-size:0.85rem;color:#666;" dir="ltr">${customer.phone}</div>
            </div>
        </div>
    `).join('');
}

function editCustomer(customerId) {
    const customer = APP_STATE.customers.find(c => c.id === customerId);
    if (!customer) return;
    
    document.getElementById('custName').value = customer.name;
    document.getElementById('custPhone').value = customer.phone;
    document.getElementById('custEmail').value = customer.email || '';
    document.getElementById('custCompany').value = customer.company || '';
    document.getElementById('custAddress').value = customer.address || '';
    document.getElementById('custNotes').value = customer.notes || '';
    
    // Change form behavior to edit mode
    const form = document.getElementById('customerForm');
    form.onsubmit = (e) => {
        e.preventDefault();
        updateCustomer(customerId);
    };
    
    showAddCustomerModal();
}

function updateCustomer(customerId) {
    const index = APP_STATE.customers.findIndex(c => c.id === customerId);
    if (index === -1) return;
    
    APP_STATE.customers[index] = {
        ...APP_STATE.customers[index],
        name: document.getElementById('custName').value.trim(),
        phone: document.getElementById('custPhone').value.trim(),
        email: document.getElementById('custEmail').value.trim(),
        company: document.getElementById('custCompany').value.trim(),
        address: document.getElementById('custAddress').value.trim(),
        notes: document.getElementById('custNotes').value.trim(),
        updatedAt: new Date().toISOString()
    };
    
    saveCustomersToStorage();
    closeModal('addCustomerModal');
    renderCustomersGrid();
    showToast('تم تحديث بيانات العميل ✅', 'success');
}

function deleteCustomer(customerId) {
    if (!confirm('هل أنت متأكد من حذف هذا العميل؟')) return;
    
    APP_STATE.customers = APP_STATE.customers.filter(c => c.id !== customerId);
    saveCustomersToStorage();
    deleteCustomerFromFirebase(customerId);
    
    renderCustomersGrid();
    showToast('تم حذف العميل 🗑️', 'info');
}

// ========================================
// Shipment Details & Actions
// ========================================

function showShipmentDetails(shipmentId) {
    const shipment = APP_STATE.shipments.find(s => s.id === shipmentId);
    if (!shipment) return;
    
    const modal = document.getElementById('shipmentModal');
    const modalBody = document.getElementById('shipmentModalBody');
    
    modalBody.innerHTML = `
        <div class="shipment-detail-view">
            <div class="detail-header">
                <h3>${shipment.trackingNumber}</h3>
                <span class="status-badge ${shipment.status}">${getStatusText(shipment.status)}</span>
            </div>
            
            <div class="detail-section">
                <h4>📤 بيانات المرسل</h4>
                <p><strong>${shipment.senderName}</strong></p>
                <p dir="ltr">📱 ${shipment.senderPhone}</p>
                <p>📍 ${shipment.senderAddress}, ${getCityName(shipment.senderCity)}</p>
            </div>
            
            <div class="detail-section">
                <h4>📥 بيانات المستلم</h4>
                <p><strong>${shipment.receiverName}</strong></p>
                <p dir="ltr">📱 ${shipment.receiverPhone}</p>
                <p>📍 ${shipment.receiverAddress}, ${getCityName(shipment.receiverCity)}</p>
                ${shipment.receiverNotes ? `<p>📝 ${shipment.receiverNotes}</p>` : ''}
            </div>
            
            <div class="detail-section">
                <h4>📦 تفاصيل الشحنة</h4>
                <div class="details-grid">
                    <div class="detail-item">
                        <span class="detail-label">النوع</span>
                        <span class="detail-value">${getShipmentTypeName(shipment.shipmentType)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">الطرد</span>
                        <span class="detail-value">${getPackageTypeName(shipment.packageType)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">الوزن</span>
                        <span class="detail-value">${shipment.weight} كجم</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">عدد القطع</span>
                        <span class="detail-value">${shipment.pieces}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">القيمة المعلنة</span>
                        <span class="detail-value">${shipment.declaredValue} ج.م</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">الدفع عند الاستلام</span>
                        <span class="detail-value">${shipment.codAmount} ج.م</span>
                    </div>
                </div>
            </div>
            
            <div class="detail-actions">
                <button class="primary-btn" onclick="updateShipmentStatus('${shipment.id}', 'picked')">✅ تم الاستلام</button>
                <button class="secondary-btn" onclick="updateShipmentStatus('${shipment.id}', 'in_transit')">🚚 في الطريق</button>
                <button class="secondary-btn" onclick="updateShipmentStatus('${shipment.id}', 'delivered')">📬 تم التسليم</button>
                <button class="danger-btn" onclick="updateShipmentStatus('${shipment.id}', 'returned')">↩️ مرتجع</button>
            </div>
            
            <div class="barcode-preview" style="text-align:center;margin-top:20px;padding:20px;background:#f9fafb;border-radius:8px;">
                <svg id="modalBarcode"></svg>
                <p style="font-weight:bold;margin-top:10px;direction:ltr;">${shipment.trackingNumber}</p>
            </div>
        </div>
    `;
    
    modal.classList.remove('hidden');
    
    // Generate barcode in modal
    setTimeout(() => {
        try {
            JsBarcode('#modalBarcode', shipment.trackingNumber, {
                format: 'CODE128',
                width: 2,
                height: 60,
                displayValue: false
            });
        } catch (e) {}
    }, 100);
}

function editShipment(shipmentId) {
    const shipment = APP_STATE.shipments.find(s => s.id === shipmentId);
    if (!shipment) return;
    
    // Fill form with shipment data
    document.getElementById('shipmentType').value = shipment.shipmentType || '';
    document.getElementById('packageType').value = shipment.packageType || '';
    document.getElementById('weight').value = shipment.weight || '';
    document.getElementById('pieces').value = shipment.pieces || 1;
    document.getElementById('description').value = shipment.description || '';
    document.getElementById('declaredValue').value = shipment.declaredValue || '';
    document.getElementById('codAmount').value = shipment.codAmount || '';
    
    document.getElementById('senderName').value = shipment.senderName || '';
    document.getElementById('senderPhone').value = shipment.senderPhone || '';
    document.getElementById('senderCity').value = shipment.senderCity || '';
    document.getElementById('senderArea').value = shipment.senderArea || '';
    document.getElementById('senderAddress').value = shipment.senderAddress || '';
    
    document.getElementById('receiverName').value = shipment.receiverName || '';
    document.getElementById('receiverPhone').value = shipment.receiverPhone || '';
    document.getElementById('receiverPhone2').value = shipment.receiverPhone2 || '';
    document.getElementById('receiverCity').value = shipment.receiverCity || '';
    document.getElementById('receiverArea').value = shipment.receiverArea || '';
    document.getElementById('receiverAddress').value = shipment.receiverAddress || '';
    document.getElementById('receiverNotes').value = shipment.receiverNotes || '';
    
    document.getElementById('trackingNumber').value = shipment.trackingNumber;
    renderBarcode(shipment.trackingNumber);
    
    // Remove old shipment from array (will be re-added on submit)
    APP_STATE.shipments = APP_STATE.shipments.filter(s => s.id !== shipmentId);
    
    switchTab('waybill');
    showToast('قم بتعديل البيانات ثم احفظ', 'info');
}

function deleteShipment(shipmentId) {
    if (!confirm('هل أنت متأكد من حذف هذه الشحنة؟')) return;
    
    APP_STATE.shipments = APP_STATE.shipments.filter(s => s.id !== shipmentId);
    saveShipmentsToStorage();
    deleteShipmentFromFirebase(shipmentId);
    
    renderShipmentsTable();
    updateDashboardStats();
    showToast('تم حذف الشحنة 🗑️', 'info');
}

function updateShipmentStatus(shipmentId, newStatus) {
    const index = APP_STATE.shipments.findIndex(s => s.id === shipmentId);
    if (index === -1) return;
    
    const shipment = APP_STATE.shipments[index];
    shipment.status = newStatus;
    shipment.updatedAt = new Date().toISOString();
    
    // Add to timeline
    if (!shipment.timeline) shipment.timeline = [];
    shipment.timeline.push({
        status: newStatus,
        message: getStatusUpdateMessage(newStatus),
        timestamp: new Date().toISOString(),
        location: 'النظام'
    });
    
    saveShipmentsToStorage();
    updateShipmentInFirebase(shipment);
    
    // Refresh modal
    showShipmentDetails(shipmentId);
    renderShipmentsTable();
    updateDashboardStats();
    
    showToast(`تم تحديث الحالة: ${getStatusText(newStatus)} ✅`, 'success');
}

function printShipment(shipmentId) {
    const shipment = APP_STATE.shipments.find(s => s.id === shipmentId);
    if (!shipment) return;
    
    const printContent = `
        <div class="waybill-print">
            <div class="print-header">
                <div class="print-logo">
                    ${APP_STATE.settings.storeLogo 
                        ? `<img src="${APP_STATE.settings.storeLogo}" style="width:100%;">` 
                        : '🚚'}
                </div>
                <div class="print-title">${APP_STATE.settings.storeName || APP_CONFIG.name}</div>
                <div style="font-size:10px;color:#666;">بوليصة شحن</div>
            </div>
            
            <div class="print-barcode">
                <svg id="printBarcodeSvg"></svg>
                <div class="print-tracking">${shipment.trackingNumber}</div>
            </div>
            
            <div class="print-details">
                <div class="print-row">
                    <strong>المرسل:</strong> ${shipment.senderName}
                </div>
                <div class="print-row">
                    <strong>المستلم:</strong> ${shipment.receiverName}
                </div>
                <div class="print-row">
                    <strong>الهاتف:</strong> <span dir="ltr">${shipment.receiverPhone}</span>
                </div>
                <div class="print-row">
                    <strong>العنوان:</strong> ${shipment.receiverAddress}, ${getCityName(shipment.receiverCity)}
                </div>
                <div class="print-row">
                    <strong>الحالة:</strong> ${getStatusText(shipment.status)}
                </div>
            </div>
            
            <div class="print-footer">
                <p>تاريخ الطباعة: ${new Date().toLocaleString('ar-EG')}</p>
                <p>${APP_CONFIG.name} v${APP_CONFIG.version}</p>
            </div>
        </div>
    `;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html dir="rtl">
        <head>
            <title>بوليصة ${shipment.trackingNumber}</title>
            <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">
            <style>
                body { font-family: 'Cairo', sans-serif; padding: 20px; }
                .waybill-print { width: 80mm; margin: 0 auto; }
                .print-header { text-align: center; border-bottom: 2px dashed #333; padding-bottom: 10px; margin-bottom: 10px; }
                .print-barcode { text-align: center; margin: 15px 0; }
                .print-tracking { font-size: 14px; font-weight: bold; letter-spacing: 2px; direction: ltr; }
                .print-details { font-size: 12px; }
                .print-row { display: flex; justify-content: space-between; margin-bottom: 5px; }
                .print-footer { text-align: center; margin-top: 15px; padding-top: 10px; border-top: 2px dashed #333; font-size: 10px; color: #666; }
            </style>
            <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"><\/script>
        </head>
        <body>
            ${printContent}
            <script>
                JsBarcode('#printBarcodeSvg', '${shipment.trackingNumber}', {
                    format: 'CODE128',
                    width: 2,
                    height: 70,
                    displayValue: false,
                    margin: 10
                });
                window.print();
            <\/script>
        </body>
        </html>
    `);
    printWindow.document.close();
}

function printWaybill() {
    const trackingNumber = document.getElementById('trackedShipmentNumber').textContent;
    const shipment = APP_STATE.shipments.find(s => s.trackingNumber === trackingNumber);
    if (shipment) {
        printShipment(shipment.id);
    }
}

// ========================================
// Settings & Store Customization
// ========================================

function saveStoreSettings() {
    APP_STATE.settings = {
        ...APP_STATE.settings,
        storeName: document.getElementById('settingsStoreName').value.trim(),
        storePhone: document.getElementById('settingsStorePhone').value.trim(),
        storeEmail: document.getElementById('settingsStoreEmail').value.trim(),
        storeAddress: document.getElementById('settingsStoreAddress').value.trim(),
        shippingCompany: document.getElementById('shippingCompany').value,
        defaultCity: document.getElementById('defaultCity').value,
        defaultPackageType: document.getElementById('defaultPackageType').value,
        enableSMS: document.getElementById('enableSMS').checked,
        autoPrintBarcode: document.getElementById('autoPrintBarcode').checked
    };
    
    localStorage.setItem(APP_CONFIG.storageKeys.settings, JSON.stringify(APP_STATE.settings));
    applySettings();
    saveSettingsToFirebase();
    
    showToast('تم حفظ الإعدادات بنجاح 💾', 'success');
}

function handleLogoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
        showToast('يرجى اختيار صورة صحيحة', 'error');
        return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        showToast('حجم الصورة كبير جداً (الحد الأقصى 5 ميجابايت)', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const imageDataUrl = e.target.result;
        
        // Show preview
        const preview = document.getElementById('settingsLogoPreview');
        preview.src = imageDataUrl;
        preview.classList.remove('hidden');
        document.querySelector('.logo-preview .upload-placeholder').classList.add('hidden');
        
        // Save to settings
        APP_STATE.settings.storeLogo = imageDataUrl;
        localStorage.setItem(APP_CONFIG.storageKeys.settings, JSON.stringify(APP_STATE.settings));
        
        // Update header logo
        const headerLogo = document.getElementById('storeLogo');
        headerLogo.src = imageDataUrl;
        headerLogo.classList.remove('hidden');
        document.querySelector('.default-logo').classList.add('hidden');
        
        showToast('تم رفع الشعار بنجاح 🖼️', 'success');
    };
    
    reader.readAsDataURL(file);
}

function removeLogo() {
    APP_STATE.settings.storeLogo = '';
    localStorage.setItem(APP_CONFIG.storageKeys.settings, JSON.stringify(APP_STATE.settings));
    
    // Reset previews
    document.getElementById('settingsLogoPreview').classList.add('hidden');
    document.querySelector('.logo-preview .upload-placeholder').classList.remove('hidden');
    document.getElementById('storeLogo').classList.add('hidden');
    document.querySelector('.default-logo').classList.remove('hidden');
    
    showToast('تم حذف الشعار 🗑️', 'info');
}

// ========================================
// Barcode Scanner
// ========================================

let scannerStream = null;

function openBarcodeScanner() {
    document.getElementById('scannerModal').classList.remove('hidden');
    startScanner();
}

function closeScanner() {
    stopScanner();
    document.getElementById('scannerModal').classList.add('hidden');
}

async function startScanner() {
    const video = document.getElementById('scannerVideo');
    const resultDiv = document.getElementById('scannerResult');
    
    try {
        // Check if camera is available
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            resultDiv.innerHTML = '<p style="color:red;">الكاميرا غير مدعومة في هذا المتصفح</p>';
            return;
        }
        
        scannerStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' }
        });
        
        video.srcObject = scannerStream;
        resultDiv.innerHTML = '<p>جاري المسح...</p>';
        
        // Note: For actual barcode scanning, you would need a library like QuaggaJS or ZXing
        // This is a placeholder that simulates scanning
        
    } catch (error) {
        console.error('Camera error:', error);
        resultDiv.innerHTML = '<p style="color:red;">خطأ في الوصول للكاميرا</p>';
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

function scanBarcodeForTracking() {
    openBarcodeScanner();
    // After scan, fill tracking input
}

function scanBarcodeFromImage(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Note: For actual barcode scanning from images, use a library like ZXing
    showToast('مسح الصور قيد التطوير 🚧', 'info');
}

// ========================================
// Data Export/Import
// ========================================

function exportAllData() {
    const data = {
        version: APP_CONFIG.version,
        exportDate: new Date().toISOString(),
        shipments: APP_STATE.shipments,
        customers: APP_STATE.customers,
        settings: APP_STATE.settings,
        drafts: APP_STATE.drafts
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `shipli-backup-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
    showToast('تم تصدير البيانات بنجاح 📤', 'success');
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            
            if (confirm('سيتم استبدال جميع البيانات الحالية. هل أنت متأكد؟')) {
                if (data.shipments) APP_STATE.shipments = data.shipments;
                if (data.customers) APP_STATE.customers = data.customers;
                if (data.settings) {
                    APP_STATE.settings = data.settings;
                    applySettings();
                }
                if (data.drafts) APP_STATE.drafts = data.drafts;
                
                saveAllToStorage();
                
                // Sync with Firebase
                syncDataWithFirebase();
                
                updateDashboardStats();
                renderRecentShipments();
                renderShipmentsTable();
                renderCustomersGrid();
                
                showToast('تم استيراد البيانات بنجاح 📥', 'success');
            }
        } catch (error) {
            console.error('Import error:', error);
            showToast('خطأ في قراءة الملف', 'error');
        }
    };
    
    reader.readAsText(file);
    event.target.value = ''; // Reset input
}

function confirmClearData() {
    if (confirm('⚠️ هل أنت متأكد من مسح جميع البيانات؟\n\nهذا الإجراء لا يمكن التراجع عنه!')) {
        if (confirm('تأكيد أخير: سيتم حذف كل الشحنات والعملاء والإعدادات')) {
            APP_STATE.shipments = [];
            APP_STATE.customers = [];
            APP_STATE.drafts = [];
            APP_STATE.settings = getDefaultSettings();
            
            saveAllToStorage();
            applySettings();
            
            updateDashboardStats();
            renderRecentShipments();
            renderShipmentsTable();
            renderCustomersGrid();
            
            showToast('تم مسح جميع البيانات 🗑️', 'info');
        }
    }
}

function exportData() {
    exportAllData();
}

function printReport() {
    window.print();
}

function checkForUpdates() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(registrations => {
            registrations.forEach(registration => {
                registration.update();
            });
        });
    }
    showToast('جاري التحقق من التحديثات... 🔄', 'info');
}

// ========================================
// Firebase Operations
// ========================================

function syncDataWithFirebase() {
    if (!APP_STATE.firebaseInitialized || !auth.currentUser) return;
    
    const userId = auth.currentUser.uid;
    
    // Upload local data to Firebase
    const userRef = db.ref(`users/${userId}`);
    
    userRef.set({
        shipments: APP_STATE.shipments,
        customers: APP_STATE.customers,
        settings: APP_STATE.settings,
        lastSync: new Date().toISOString()
    }).then(() => {
        console.log('✅ Data synced with Firebase');
    }).catch(error => {
        console.error('Sync error:', error);
    });
}

function saveShipmentToFirebase(shipment) {
    if (!APP_STATE.firebaseInitialized || !auth.currentUser) return;
    
    db.ref(`shipments/${shipment.id}`).set(shipment)
        .then(() => console.log('💾 Shipment saved to Firebase'))
        .catch(err => console.error('Save error:', err));
}

function updateShipmentInFirebase(shipment) {
    if (!APP_STATE.firebaseInitialized || !auth.currentUser) return;
    
    db.ref(`shipments/${shipment.id}`).update(shipment)
        .then(() => console.log('📝 Shipment updated in Firebase'))
        .catch(err => console.error('Update error:', err));
}

function deleteShipmentFromFirebase(shipmentId) {
    if (!APP_STATE.firebaseInitialized || !auth.currentUser) return;
    
    db.ref(`shipments/${shipmentId}`).remove()
        .then(() => console.log('🗑️ Shipment deleted from Firebase'))
        .catch(err => console.error('Delete error:', err));
}

function saveCustomerToFirebase(customer) {
    if (!APP_STATE.firebaseInitialized || !auth.currentUser) return;
    
    db.ref(`crm/${customer.id}`).set(customer)
        .then(() => console.log('💾 Customer saved to Firebase'))
        .catch(err => console.error('Save error:', err));
}

function deleteCustomerFromFirebase(customerId) {
    if (!APP_STATE.firebaseInitialized || !auth.currentUser) return;
    
    db.ref(`crm/${customerId}`).remove()
        .then(() => console.log('🗑️ Customer deleted from Firebase'))
        .catch(err => console.error('Delete error:', err));
}

function saveSettingsToFirebase() {
    if (!APP_STATE.firebaseInitialized || !auth.currentUser) return;
    
    const userId = auth.currentUser.uid;
    db.ref(`users/${userId}/settings`).set(APP_STATE.settings)
        .then(() => console.log('💾 Settings saved to Firebase'))
        .catch(err => console.error('Save error:', err));
}

// ========================================
// Local Storage Operations
// ========================================

function saveShipmentsToStorage() {
    localStorage.setItem(APP_CONFIG.storageKeys.shipments, JSON.stringify(APP_STATE.shipments));
}

function saveCustomersToStorage() {
    localStorage.setItem(APP_CONFIG.storageKeys.customers, JSON.stringify(APP_STATE.customers));
}

function saveAllToStorage() {
    localStorage.setItem(APP_CONFIG.storageKeys.shipments, JSON.stringify(APP_STATE.shipments));
    localStorage.setItem(APP_CONFIG.storageKeys.customers, JSON.stringify(APP_STATE.customers));
    localStorage.setItem(APP_CONFIG.storageKeys.settings, JSON.stringify(APP_STATE.settings));
    localStorage.setItem(APP_CONFIG.storageKeys.drafts, JSON.stringify(APP_STATE.drafts));
}

// ========================================
// Utility Functions
// ========================================

function generateUniqueId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function formatDate(dateString) {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function formatDateTime(dateString) {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleString('ar-EG', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function getStatusText(status) {
    const statusMap = {
        pending: 'قيد الانتظار',
        picked: 'تم الاستلام',
        in_transit: 'في الطريق',
        delivered: 'تم التسليم',
        returned: 'مرتجع',
        cancelled: 'ملغي'
    };
    return statusMap[status] || status;
}

function getStatusUpdateMessage(status) {
    const messages = {
        pending: 'تم إنشاء الشحنة',
        picked: 'تم استلام الشحنة من المرسل',
        in_transit: 'الشحنة في الطريق للتوصيل',
        delivered: 'تم تسليم الشحنة بنجاح',
        returned: 'تم إرجاع الشحنة',
        cancelled: 'تم إلغاء الشحنة'
    };
    return messages[status] || 'تحديث الحالة';
}

function getCityName(cityCode) {
    const cities = {
        cairo: 'القاهرة',
        alexandria: 'الإسكندرية',
        giza: 'الجيزة',
        mansoura: 'المنصورة',
        tanta: 'طنطا',
        ismailia: 'الإسماعيلية',
        suez: 'السويس',
        luxor: 'الأقصر',
        aswan: 'أسوان',
        other: 'أخرى'
    };
    return cities[cityCode] || cityCode || '—';
}

function getShipmentTypeName(type) {
    const types = {
        delivery: 'توصيل',
        exchange: 'استبدال',
        return: 'مرتجع',
        cash_on_delivery: 'الدفع عند الاستلام'
    };
    return types[type] || type || '—';
}

function getPackageTypeName(type) {
    const types = {
        envelope: 'مظروف',
        box: 'صندوق صغير',
        large_box: 'صندوق كبير',
        palette: 'بالتة'
    };
    return types[type] || type || '—';
}

function checkOnlineStatus() {
    const statusEl = document.getElementById('offlineStatus');
    if (statusEl) {
        statusEl.textContent = APP_STATE.isOnline ? 'متصل' : 'غير متصل';
        statusEl.style.color = APP_STATE.isOnline ? 'var(--success-500)' : 'var(--danger-500)';
    }
}

function handleOnline() {
    APP_STATE.isOnline = true;
    checkOnlineStatus();
    showToast('تم استعادة الاتصال بالإنترنت 🌐', 'success');
    syncDataWithFirebase();
}

function handleOffline() {
    APP_STATE.isOnline = false;
    checkOnlineStatus();
    showToast('أنت الآن في وضع عدم الاتصال 📴', 'warning');
}

// ========================================
// Toast Notifications
// ========================================

function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toastContainer');
    
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span class="toast-icon">${icons[type]}</span>
        <span class="toast-message">${message}</span>
        <button class="toast-close" onclick="this.parentElement.remove()">✕</button>
    `;
    
    container.appendChild(toast);
    
    // Auto remove
    setTimeout(() => {
        toast.classList.add('removing');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// ========================================
// Loading Overlay
// ========================================

function showLoading(message = 'جاري التحميل...') {
    const overlay = document.getElementById('loadingOverlay');
    overlay.querySelector('p').textContent = message;
    overlay.classList.remove('hidden');
}

function hideLoading() {
    document.getElementById('loadingOverlay').classList.add('hidden');
}

// ========================================
// Console Welcome Message
// ========================================

console.log(
    `%c🚀 ${APP_CONFIG.name} v${APP_CONFIG.version}`,
    'background: linear-gradient(135deg, #1e40af, #3b82f6); color: white; padding: 10px 20px; border-radius: 8px; font-size: 16px; font-weight: bold;'
);
console.log(
    `%cنظام إدارة الشحن الاحترافي | Professional Shipping Management`,
    'color: #6b7280; font-size: 12px;'
);
