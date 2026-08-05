/**
 * ===================================
 * Shipping View Module
 * ===================================
 * Complete shipping management with:
 * - Waybill (Bolisa) creation
 * - Barcode generation
 * - Multiple shipping companies
 * - Shipment tracking
 */

const Shipping = {
    currentFilter: 'all',
    selectedCompany: null,
    
    // Shipping Companies Configuration
    companies: [
        { 
            id: 'aramex', 
            name: 'أرامكس', 
            nameEn: 'Aramex',
            logo: '📦',
            color: '#d32f2f',
            basePrice: 45,
            cities: ['cairo', 'alexandria', 'giza', 'mansoura', 'tanta', 'ismailia']
        },
        { 
            id: 'smsamisr', 
            name: 'سمسام إيجر', 
            nameEn: 'SMSA Egypt',
            logo: '🚚',
            color: '#1976d2',
            basePrice: 35,
            cities: ['cairo', 'alexandria', 'giza', 'mansoura', 'tanta']
        },
        { 
            id: 'bosta', 
            name: 'بوسطة', 
            nameEn: 'Bosta',
            logo: '🛵',
            color: '#ff9800',
            basePrice: 25,
            cities: ['cairo', 'giza', 'alexandria']
        },
        { 
            id: 'h3odi', 
            name: 'حوضي', 
            nameEn: 'H3odi',
            logo: '🏍️',
            color: '#4caf50',
            basePrice: 20,
            cities: ['cairo', 'giza']
        },
        { 
            id: 'emsellem', 
            name: 'إمسلم', 
            nameEn: 'Emsellem',
            logo: '🚐',
            color: '#9c27b0',
            basePrice: 30,
            cities: ['cairo', 'giza', 'mansoura', 'tanta']
        },
        { 
            id: 'sprint', 
            name: 'سبرينت', 
            nameEn: 'Sprint',
            logo: '⚡',
            color: '#00bcd4',
            basePrice: 40,
            cities: ['cairo', 'alexandria', 'giza', 'ismailia', 'port-said']
        }
    ],

    /**
     * Render Shipping View
     */
    render(container) {
        container.innerHTML = `
            <div class="view-content">
                <!-- Page Header -->
                <div class="page-header">
                    <div class="header-content">
                        <h1 class="page-title">
                            <i class='bx bx-truck'></i>
                            الشحنات
                        </h1>
                        <p class="page-subtitle">إدارة جميع الشحنات وبوليصات الشحن</p>
                    </div>
                    <div style="display:flex;gap:12px;">
                        <button class="btn-outline" onclick="Shipping.openScannerModal()">
                            <i class='bx bx-scan'></i> مسح باركود
                        </button>
                        <button class="btn-primary" onclick="Shipping.openWaybillModal()">
                            <i class='bx bx-plus'></i> بوليصة جديدة
                        </button>
                    </div>
                </div>

                <!-- Stats Cards -->
                <div class="shipping-stats" id="shipping-stats-grid">
                    ${this.renderStatsCards()}
                </div>

                <!-- Filters -->
                <div class="filters-bar">
                    <div class="search-box flex-1">
                        <i class='bx bx-search'></i>
                        <input type="text" placeholder="بحث برقم البوليصة، اسم المستلم..." 
                               onkeyup="if(event.key==='Enter')Shipping.search(this.value)">
                    </div>
                    
                    <div class="filter-group">
                        <select class="filter-select" onchange="Shipping.filterByStatus(this.value)">
                            <option value="all">كل الحالات</option>
                            <option value="pending">في الانتظار</option>
                            <option value="processing">جاري التجهيز</option>
                            <option value="shipped">تم الاستلام</option>
                            <option value="in_transit">في الطريق</option>
                            <option value="delivered">تم التسليم</option>
                            <option value="cancelled">ملغي</option>
                            <option value="returned">مرتجع</option>
                        </select>
                        
                        <select class="filter-select" onchange="Shipping.filterByCompany(this.value)">
                            <option value="all">كل الشركات</option>
                            ${this.companies.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
                        </select>
                    </div>

                    <button class="btn-outline btn-sm" onclick="Shipping.exportShipments()">
                        <i class='bx bx-download'></i> تصدير
                    </button>
                </div>

                <!-- Shipments Grid -->
                <div class="shipments-grid" id="shipments-container">
                    ${this.renderShipments()}
                </div>
            </div>
        `;

        this.initInteractions();
    },

    /**
     * Render Stats Cards
     */
    renderStatsCards() {
        const shipments = Utils.storage.get('shipments', []);
        
        const stats = [
            { 
                icon: 'bx-package', 
                label: 'إجمالي الشحنات', 
                value: shipments.length, 
                color: 'primary' 
            },
            { 
                icon: 'bx-time', 
                label: 'قيد الانتظار', 
                value: shipments.filter(s => s.status === 'pending').length, 
                color: 'warning' 
            },
            { 
                icon: 'bx-truck', 
                label: 'في الطريق', 
                value: shipments.filter(s => ['shipped', 'in_transit'].includes(s.status)).length, 
                color: 'info' 
            },
            { 
                icon: 'bx-check-double', 
                label: 'تم التسليم', 
                value: shipments.filter(s => s.status === 'delivered').length, 
                color: 'success' 
            }
        ];

        return stats.map(stat => `
            <div class="shipping-stat-card hover-lift">
                <div class="shipping-stat-icon" style="background: var(--${stat.color}-light); color: var(--${stat.color});">
                    <i class='bx ${stat.icon}'></i>
                </div>
                <div class="shipping-stat-content">
                    <div class="shipping-stat-value">${stat.value}</div>
                    <div class="shipping-stat-label">${stat.label}</div>
                </div>
            </div>
        `).join('');
    },

    /**
     * Render Shipments List
     */
    renderShipments() {
        let shipments = Utils.storage.get('shipments', []);

        // Apply filters
        if (this.currentFilter !== 'all') {
            shipments = shipments.filter(s => s.status === this.currentFilter);
        }

        if (shipments.length === 0) {
            return `
                <div class="empty-state">
                    <i class='bx bx-truck empty-state-icon'></i>
                    <h3 class="empty-state-title">لا توجد شحنات</h3>
                    <p class="empty-state-description">ابدأ بإنشاء أول بوليصة شحن</p>
                    <button class="btn-primary" onclick="Shipping.openWaybillModal()">
                        <i class='bx bx-plus'></i> إنشاء بوليصة جديدة
                    </button>
                </div>
            `;
        }

        // Sort by date (newest first)
        shipments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        return shipments.map(shipment => this.renderShipmentCard(shipment)).join('');
    },

    /**
     * Render Single Shipment Card
     */
    renderShipmentCard(shipment) {
        const company = this.companies.find(c => c.id === shipment.companyId) || {};
        
        return `
            <div class="shipment-card" data-shipment-id="${shipment.id}">
                <div class="shipment-card-header">
                    <div style="display:flex;align-items:center;gap:8px;">
                        <span style="font-size:24px;">${company.logo || '📦'}</span>
                        <strong>${company.name || 'غير محدد'}</strong>
                    </div>
                    <span class="status-badge status-${shipment.status}">${this.getStatusText(shipment.status)}</span>
                </div>
                
                <div class="shipment-card-body">
                    <div class="shipment-route">
                        <div class="route-point">
                            <div class="route-city">${shipment.senderCity || 'المصدر'}</div>
                            <div class="route-area">${shipment.senderName || '-'}</div>
                        </div>
                        <i class='bx bx-right-arrow-alt route-arrow'></i>
                        <div class="route-point">
                            <div class="route-city">${shipment.receiverCity || 'الوجهة'}</div>
                            <div class="route-area">${shipment.receiverName || '-'}</div>
                        </div>
                    </div>
                    
                    <div class="shipment-details">
                        <div class="shipment-detail-item">
                            <span class="shipment-detail-label">رقم البوليصة</span>
                            <span class="shipment-detail-value" style="font-family:monospace;direction:ltr;text-align:left;">
                                ${shipment.waybillNumber || '-'}
                            </span>
                        </div>
                        <div class="shipment-detail-item">
                            <span class="shipment-detail-label">قيمة التحصيل</span>
                            <span class="shipment-detail-value">${Utils.formatCurrency(shipment.codValue || 0)}</span>
                        </div>
                        <div class="shipment-detail-item">
                            <span class="shipment-detail-label">التاريخ</span>
                            <span class="shipment-detail-value">${Utils.formatDate(shipment.createdAt, 'short')}</span>
                        </div>
                        <div class="shipment-detail-item">
                            <span class="shipment-detail-label">نوع الشحنة</span>
                            <span class="shipment-detail-value">${this.getShipmentTypeText(shipment.type)}</span>
                        </div>
                    </div>
                </div>
                
                <div class="shipment-card-footer">
                    <span style="font-size:12px;color:var(--text-secondary);">
                        ${Utils.formatDate(shipment.createdAt, 'full')}
                    </span>
                    <div class="shipment-actions">
                        <button class="shipment-action-btn" onclick="Shipping.viewShipment('${shipment.id}')" title="عرض التفاصيل">
                            <i class='bx bx-eye'></i>
                        </button>
                        <button class="shipment-action-btn" onclick="Shipping.printWaybill('${shipment.id}')" title="طباعة البوليصة">
                            <i class='bx bx-printer'></i>
                        </button>
                        <button class="shipment-action-btn" onclick="Shipping.trackShipment('${shipment.id}')" title="تتبع الشحنة">
                            <i class='bx bx-map'></i>
                        </button>
                        <button class="shipment-action-btn" onclick="Shipping.updateStatus('${shipment.id}')" title="تحديث الحالة">
                            <i class='bx bx-refresh'></i>
                        </button>
                        <button class="shipment-action-btn" style="color:var(--danger);" onclick="Shipping.deleteShipment('${shipment.id}')" title="حذف">
                            <i class='bx bx-trash'></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Open Waybill Modal (Create New Shipment)
     */
    openWaybillModal(preFilledData = null) {
        const modal = document.getElementById('waybill-modal');
        
        // Reset form
        document.getElementById('waybill-form').reset();
        
        // Generate initial barcode number
        this.generateBarcode();

        // Load shipping companies grid
        this.loadCompaniesGrid();

        // Pre-fill data if provided
        if (preFilledData) {
            if (preFilledData.receiverName) document.getElementById('receiver-name').value = preFilledData.receiverName;
            if (preFilledData.receiverPhone) document.getElementById('receiver-phone').value = preFilledData.receiverPhone;
            if (preFilledData.receiverCity) document.getElementById('receiver-city').value = preFilledData.receiverCity;
            if (preFilledData.receiverAddress) document.getElementById('receiver-address').value = preFilledData.receiverAddress;
            if (preFilledData.productsValue) document.getElementById('products-value').value = preFilledData.productsValue;
            
            // Set sender from store config
            const storeConfig = AppState.storeConfig || Utils.storage.get('store_config');
            if (storeConfig) {
                document.getElementById('sender-name').value = storeConfig.name || '';
                document.getElementById('sender-phone').value = storeConfig.phone || '';
            }
        } else {
            // Auto-fill sender info from store config
            const storeConfig = AppState.storeConfig || Utils.storage.get('store_config');
            if (storeConfig) {
                document.getElementById('sender-name').value = storeConfig.name || '';
                document.getElementById('sender-phone').value = storeConfig.phone || '';
                document.getElementById('sender-address').value = storeConfig.address || '';
            }
        }

        openModal('waybill-modal');

        // Setup form submission
        const form = document.getElementById('waybill-form');
        form.onsubmit = (e) => {
            e.preventDefault();
            this.saveWaybill(preFilledData?.linkedOrderId);
        };

        // Setup company selection
        this.setupCompanySelection();

        // Update shipping cost when city changes
        document.getElementById('receiver-city')?.addEventListener('change', () => this.updateShippingCost());
    },

    /**
     * Load Shipping Companies Grid
     */
    loadCompaniesGrid() {
        const container = document.getElementById('shipping-companies-grid');
        if (!container) return;

        container.innerHTML = this.companies.map(company => `
            <div class="shipping-company-card" data-company-id="${company.id}" onclick="Shipping.selectCompany('${company.id}')">
                <div class="company-check"><i class='bx bx-check'></i></div>
                <div class="shipping-company-logo" style="background:${company.color}20;color:${company.color}">
                    ${company.logo}
                </div>
                <div class="shipping-company-name">${company.name}</div>
                <div class="shipping-company-price">من ${Utils.formatCurrency(company.basePrice)}</div>
            </div>
        `).join('');
    },

    /**
     * Select Shipping Company
     */
    selectCompany(companyId) {
        this.selectedCompany = this.companies.find(c => c.id === companyId);
        
        // Update UI
        document.querySelectorAll('.shipping-company-card').forEach(card => {
            card.classList.toggle('selected', card.dataset.companyId === companyId);
        });

        // Update shipping cost
        this.updateShippingCost();

        Toast.success(`تم اختيار ${this.selectedCompany.name}`);
    },

    /**
     * Setup Company Selection Handlers
     */
    setupCompanySelection() {
        // Already handled via onclick in HTML
    },

    /**
     * Update Shipping Cost Based on Selection
     */
    updateShippingCost() {
        if (!this.selectedCompany) return;

        const city = document.getElementById('receiver-city')?.value;
        const type = document.getElementById('shipment-type')?.value;

        let cost = this.selectedCompany.basePrice;

        // Adjust based on shipment type
        if (type === 'express') cost *= 1.5;
        else if (type === 'same-day') cost *= 2;

        // Adjust based on destination (simplified)
        if (!this.selectedCompany.cities.includes(city)) {
            cost += 15; // Additional fee for non-standard cities
        }

        const costInput = document.getElementById('shipping-cost');
        if (costInput) costInput.value = cost.toFixed(2);
    },

    /**
     * Generate Barcode Number
     */
    generateBarcode() {
        const prefix = 'SH';
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).substring(2, 6).toUpperCase();
        const barcodeNumber = `${prefix}${timestamp}${random}`;

        const barcodeElement = document.getElementById('waybill-barcode');
        const barcodeDisplay = document.getElementById('barcode-number');

        if (barcodeElement && typeof JsBarcode !== 'undefined') {
            try {
                JsBarcode(barcodeElement, barcodeNumber, {
                    format: 'CODE128',
                    width: 2,
                    height: 60,
                    displayValue: false,
                    margin: 10,
                    background: '#ffffff',
                    lineColor: '#000000'
                });
            } catch (e) {
                console.error('Barcode generation error:', e);
            }
        }

        if (barcodeDisplay) {
            barcodeDisplay.textContent = barcodeNumber;
        }

        return barcodeNumber;
    },

    /**
     * Save Waybill / Create Shipment
     */
    saveWaybill(linkedOrderId = null) {
        if (!this.selectedCompany) {
            Toast.error('يرجى اختيار شركة الشحن');
            return;
        }

        const barcodeNumber = document.getElementById('barcode-number')?.textContent || this.generateBarcode();

        const shipmentData = {
            id: Utils.generateId(),
            waybillNumber: barcodeNumber,
            companyId: this.selectedCompany.id,
            companyName: this.selectedCompany.name,
            
            // Sender Info
            senderName: document.getElementById('sender-name')?.value.trim(),
            senderPhone: document.getElementById('sender-phone')?.value.trim(),
            senderAddress: document.getElementById('sender-address')?.value.trim(),
            senderCity: 'القاهرة', // Default or get from store
            
            // Receiver Info
            receiverName: document.getElementById('receiver-name')?.value.trim(),
            receiverPhone: document.getElementById('receiver-phone')?.value.trim(),
            receiverCity: document.getElementById('receiver-city')?.value,
            receiverArea: document.getElementById('receiver-area')?.value.trim(),
            receiverAddress: document.getElementById('receiver-address')?.value.trim(),
            
            // Shipment Details
            type: document.getElementById('shipment-type')?.value || 'regular',
            weight: parseFloat(document.getElementById('shipment-weight')?.value) || 0,
            notes: document.getElementById('shipment-extra-notes')?.value.trim(),
            
            // Financial Details
            productsValue: parseFloat(document.getElementById('products-value')?.value) || 0,
            shippingCost: parseFloat(document.getElementById('shipping-cost')?.value) || 0,
            codValue: parseFloat(document.getElementById('cod-value')?.value) || 0,
            paymentMethod: document.querySelector('input[name="payment-method"]:checked')?.value || 'cod',
            
            // Status & Dates
            status: 'pending',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            
            // Linked Order
            linkedOrderId: linkedOrderId || null,

            // Tracking Events
            trackingEvents: [
                {
                    status: 'pending',
                    description: 'تم إنشاء البوليصة',
                    timestamp: new Date().toISOString()
                }
            ]
        };

        // Validation
        if (!shipmentData.receiverName || !shipmentData.receiverPhone) {
            Toast.error('يرجى ملء بيانات المستلم');
            return;
        }

        // Save to storage
        let shipments = Utils.storage.get('shipments', []);
        shipments.unshift(shipmentData);
        Utils.storage.set('shipments', shipments);

        // Close modal and refresh
        closeModal('waybill-modal');
        Toast.success('تم إنشاء البوليصة بنجاح! 🎉');
        
        navigateTo('shipping');

        // Show print option
        setTimeout(() => {
            if (confirm('هل تريد طباعة البوليصة الآن؟')) {
                this.printWaybill(shipmentData.id);
            }
        }, 500);
    },

    /**
     * View Shipment Details
     */
    viewShipment(shipmentId) {
        const shipment = Utils.storage.get('shipments', []).find(s => s.id === shipmentId);
        if (!shipment) {
            Toast.error('الشحنة غير موجودة');
            return;
        }

        const company = this.companies.find(c => c.id === shipment.companyId);

        const modalHtml = `
            <div id="shipment-detail-modal" class="modal-overlay">
                <div class="modal modal-xl">
                    <div class="modal-header modal-gradient">
                        <h3><i class='bx bx-file'></i> تفاصيل الشحنة #${shipment.waybillNumber}</h3>
                        <button class="btn-close" onclick="closeModal('shipment-detail-modal')">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="detail-grid">
                            <!-- Company Info -->
                            <div class="detail-section">
                                <h4><i class='bx bx-building-house'></i> شركة الشحن</h4>
                                <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
                                    <span style="font-size:40px;">${company?.logo || '📦'}</span>
                                    <div>
                                        <strong style="font-size:18px;">${company?.name || '-'}</strong>
                                        <p style="color:var(--text-secondary);margin-top:4px;">رقم البوليصة: ${shipment.waybillNumber}</p>
                                    </div>
                                </div>
                                <span class="status-badge status-${shipment.status}" style="font-size:14px;padding:8px 16px;">
                                    ${this.getStatusText(shipment.status)}
                                </span>
                            </div>

                            <!-- Barcode -->
                            <div class="detail-section">
                                <h4><i class='bx bx-barcode-alt'></i> الباركود</h4>
                                <div class="barcode-preview" style="padding:20px;background:white;border-radius:8px;">
                                    <svg id="detail-barcode"></svg>
                                    <p class="barcode-number" style="margin-top:12px;font-size:20px;">${shipment.waybillNumber}</p>
                                </div>
                            </div>

                            <!-- Sender Info -->
                            <div class="detail-section">
                                <h4><i class='bx bx-export'></i> المرسل</h4>
                                <p><strong>الاسم:</strong> ${shipment.senderName || '-'}</p>
                                <p><strong>الهاتف:</strong> ${shipment.senderPhone || '-'}</p>
                                <p><strong>العنوان:</strong> ${shipment.senderAddress || '-'}</p>
                            </div>

                            <!-- Receiver Info -->
                            <div class="detail-section">
                                <h4><i class='bx bx-import'></i> المستلم</h4>
                                <p><strong>الاسم:</strong> ${shipment.receiverName}</p>
                                <p><strong>الهاتف:</strong> ${shipment.receiverPhone}</p>
                                <p><strong>المدينة:</strong> ${shipment.receiverCity || '-'}</p>
                                <p><strong>المنطقة:</strong> ${shipment.receiverArea || '-'}</p>
                                <p><strong>العنوان:</strong> ${shipment.receiverAddress}</p>
                            </div>

                            <!-- Financial -->
                            <div class="detail-section">
                                <h4><i class='bx bx-wallet'></i> البيانات المالية</h4>
                                <p><strong>قيمة المنتجات:</strong> ${Utils.formatCurrency(shipment.productsValue)}</p>
                                <p><strong>مصاريف الشحن:</strong> ${Utils.formatCurrency(shipment.shippingCost)}</p>
                                <p><strong>قيمة التحصيل:</strong> ${Utils.formatCurrency(shipment.codValue)}</p>
                                <p><strong>طريقة الدفع:</strong> ${shipment.paymentMethod === 'cod' ? 'الدفع عند الاستلام' : 'مدفوع مسبقاً'}</p>
                            </div>

                            <!-- Shipment Details -->
                            <div class="detail-section">
                                <h4><i class='bx bx-package'></i> تفاصيل الشحنة</h4>
                                <p><strong>النوع:</strong> ${this.getShipmentTypeText(shipment.type)}</p>
                                <p><strong>الوزن:</strong> ${shipment.weight ? shipment.weight + ' كجم' : '-'}</p>
                                <p><strong>ملاحظات:</strong> ${shipment.notes || '-'}</p>
                            </div>
                        </div>

                        <!-- Tracking Timeline -->
                        <div class="form-section" style="margin-top:24px;">
                            <h4 class="section-title"><i class='bx bx-time'></i> سجل التتبع</h4>
                            <div class="tracking-timeline">
                                ${(shipment.trackingEvents || []).map((event, idx) => `
                                    <div class="tracking-event ${idx === 0 ? 'active' : 'completed'}">
                                        <div class="tracking-event-dot"></div>
                                        <div class="tracking-event-content">
                                            <div class="tracking-event-title">${event.description}</div>
                                            <div class="tracking-event-time">${Utils.formatDate(event.timestamp, 'full')}</div>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>

                        <!-- Actions -->
                        <div class="form-actions">
                            <button class="btn-outline" onclick="closeModal('shipment-detail-modal')">إغلاق</button>
                            <button class="btn-secondary" onclick="closeModal('shipment-detail-modal');Shipping.printWaybill('${shipment.id}')">
                                <i class='bx bx-printer'></i> طباعة
                            </button>
                            <button class="btn-primary" onclick="closeModal('shipment-detail-modal');Shipping.trackShipment('${shipment.id}')">
                                <i class='bx bx-map'></i> تتبع مباشر
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        openModal('shipment-detail-modal');

        // Generate barcode in detail modal
        const detailBarcode = document.getElementById('detail-barcode');
        if (detailBarcode && typeof JsBarcode !== 'undefined') {
            JsBarcode(detailBarcode, shipment.waybillNumber, {
                format: 'CODE128',
                width: 2,
                height: 80,
                displayValue: false
            });
        }

        // Cleanup
        setTimeout(() => {
            const modal = document.getElementById('shipment-detail-modal');
            if (modal) {
                const obs = new MutationObserver(() => {
                    if (modal.classList.contains('hidden')) {
                        setTimeout(() => modal.remove(), 300);
                        obs.disconnect();
                    }
                });
                obs.observe(modal, { attributes: true });
            }
        }, 100);
    },

    /**
     * Print Waybill
     */
    printWaybill(shipmentId) {
        const shipment = Utils.storage.get('shipments', []).find(s => s.id === shipmentId);
        if (!shipment) {
            Toast.error('الشحنة غير موجودة');
            return;
        }

        const company = this.companies.find(c => c.id === shipment.companyId);
        const storeConfig = AppState.storeConfig || Utils.storage.get('store_config');

        const printContent = `
            <!DOCTYPE html>
            <html dir="rtl" lang="ar">
            <head>
                <meta charset="UTF-8">
                <title>بوليصة شحن #${shipment.waybillNumber}</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { font-family: 'Cairo', sans-serif; padding: 10mm; direction: rtl; }
                    .waybill { width: 80mm; min-height: 120mm; border: 1px solid #333; padding: 6mm; font-size: 11px; }
                    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #2563eb; padding-bottom: 4mm; margin-bottom: 4mm; }
                    .header h1 { font-size: 14px; color: #2563eb; }
                    .logo { height: 15mm; object-fit: contain; }
                    .barcode { text-align: center; margin: 4mm 0; }
                    .section { margin-bottom: 3mm; }
                    .section h3 { font-size: 10px; background: #f0f0f0; padding: 1mm 2mm; margin-bottom: 1mm; }
                    .row { display: flex; justify-content: space-between; margin-bottom: 1mm; }
                    .label { color: #666; }
                    .footer { position: fixed; bottom: 10mm; left: 10mm; right: 10mm; border-top: 1px dashed #999; padding-top: 2mm; text-align: center; font-size: 9px; color: #666; }
                    @media print { body { padding: 0; } .footer { position: relative; bottom: auto; } }
                </style>
            </head>
            <body>
                <div class="waybill">
                    <div class="header">
                        <h1>بوليصة شحن</h1>
                        ${storeConfig?.logo ? `<img src="${storeConfig.logo}" class="logo" alt="Logo">` : ''}
                    </div>
                    
                    <div class="barcode">
                        <svg id="print-barcode"></svg>
                        <div style="font-weight:bold;letter-spacing:2px;margin-top:4px;">${shipment.waybillNumber}</div>
                    </div>
                    
                    <div class="section">
                        <h3>شركة الشحن</h3>
                        <div class="row"><span class="label">الشركة:</span><span>${company?.name || '-'}</span></div>
                    </div>
                    
                    <div class="section">
                        <h3>المرسل</h3>
                        <div class="row"><span class="label">الاسم:</span><span>${shipment.senderName || storeConfig?.name || '-'}</span></div>
                        <div class="row"><span class="label">الهاتف:</span><span>${shipment.senderPhone || storeConfig?.phone || '-'}</span></div>
                    </div>
                    
                    <div class="section">
                        <h3>المستلم</h3>
                        <div class="row"><span class="label">الاسم:</span><span>${shipment.receiverName}</span></div>
                        <div class="row"><span class="label">الهاتف:</span><span>${shipment.receiverPhone}</span></div>
                        <div class="row"><span class="label">المدينة:</span><span>${shipment.receiverCity || '-'}</span></div>
                        <div class="row"><span class="label">العنوان:</span><span>${shipment.receiverAddress}</span></div>
                    </div>
                    
                    <div class="section">
                        <h3>المالية</h3>
                        <div class="row"><span class="label">القيمة:</span><span>${Utils.formatCurrency(shipment.productsValue)}</span></div>
                        <div class="row"><span class="label">الشحن:</span><span>${Utils.formatCurrency(shipment.shippingCost)}</span></div>
                        <div class="row"><span class="label">التحصيل:</span><span><strong>${Utils.formatCurrency(shipment.codValue)}</strong></span></div>
                    </div>
                    
                    <div class="footer">
                        تم إنشاء هذه البوليصة بواسطة نظام إدارة الشحن | ${new Date().toLocaleDateString('ar-EG')}
                    </div>
                </div>
                
                <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"><\/script>
                <script>JsBarcode("#print-barcode", "${shipment.waybillNumber}", {format:"CODE128",width:2,height:50,displayValue:false});window.print();<\/script>
            </body>
            </html>
        `;

        const printWindow = window.open('', '_blank', 'width=400,height=600');
        printWindow.document.write(printContent);
        printWindow.document.close();
    },

    /**
     * Track Shipment
     */
    trackShipment(shipmentId) {
        const shipment = Utils.storage.get('shipments', []).find(s => s.id === shipmentId);
        if (!shipment) return;

        const trackingInfo = document.getElementById('tracking-info');
        if (!trackingInfo) {
            // Open tracking modal
            openModal('tracking-modal');
            setTimeout(() => this.renderTrackingInfo(shipment), 100);
        } else {
            this.renderTrackingInfo(shipment);
        }
    },

    /**
     * Render Tracking Information
     */
    renderTrackingInfo(shipment) {
        const container = document.getElementById('tracking-info');
        if (!container) return;

        const statusIcons = {
            pending: 'bx-clock',
            processing: 'bx-loader-circle',
            shipped: 'bx-package',
            in_transit: 'bx-truck',
            out_for_delivery: 'bx-run',
            delivered: 'bx-check-circle',
            cancelled: 'bx-x-circle',
            returned: 'bx-undo'
        };

        container.innerHTML = `
            <div class="tracking-status-card">
                <div class="tracking-status-icon">
                    <i class='bx ${statusIcons[shipment.status] || 'bx-help-circle'}'></i>
                </div>
                <div class="tracking-status-text">${this.getStatusText(shipment.status)}</div>
                <div class="tracking-status-subtitle">#${shipment.waybillNumber}</div>
            </div>

            <div class="tracking-timeline">
                ${(shipment.trackingEvents || []).reverse().map((event, idx) => `
                    <div class="tracking-event ${idx === 0 ? 'active' : ''}">
                        <div class="tracking-event-dot"></div>
                        <div class="tracking-event-content">
                            <div class="tracking-event-title">${event.description}</div>
                            <div class="tracking-event-time">${Utils.formatDate(event.timestamp, 'full')}</div>
                        </div>
                    </div>
                `).join('')}
            </div>

            <div style="display:flex;gap:12px;justify-content:center;margin-top:24px;">
                <button class="btn-outline btn-sm" onclick="Shipping.updateStatus('${shipment.id}')">
                    <i class='bx bx-refresh'></i> تحديث الحالة
                </button>
                <button class="btn-primary btn-sm" onclick="closeModal('tracking-modal')">
                    إغلاق
                </button>
            </div>
        `;
    },

    /**
     * Open Scanner Modal
     */
    openScannerModal() {
        openModal('scanner-modal');
    },

    /**
     * Start Camera Scanner
     */
    startScanner() {
        // Check if Quagga is available
        if (typeof Quagga === 'undefined') {
            Toast.warning('ماسح الباركود قيد التحميل... يرجى المحاولة مرة أخرى');
            return;
        }

        Quagga.init({
            inputStream: {
                name: "Live",
                type: "LiveStream",
                target: document.querySelector('#scanner-video'),
                constraints: {
                    facingMode: "environment",
                    width: 400,
                    height: 300
                }
            },
            decoder: {
                readers: ["ean_reader", "code_128_reader", "code_39_reader"]
            }
        }, function(err) {
            if (err) {
                console.error(err);
                Toast.error('فشل تشغيل الكاميرا');
                return;
            }
            Quagga.start();
            Toast.info('وجّه الكاميرا نحو الباركود');
        });

        Quagga.onDetected((result) => {
            const code = result.codeResult.code;
            document.getElementById('scanner-result').innerHTML = `
                <div class="barcode-value">${code}</div>
                <button class="btn-primary btn-sm" onclick="Shipping.searchByBarcode('${code}')"
                        style="margin-top:12px;">
                    <i class='bx bx-search'></i> بحث عن الشحنة
                </button>
            `;
            Quagga.stop();
        });
    },

    /**
     * Stop Scanner
     */
    stopScanner() {
        if (typeof Quagga !== 'undefined') {
            Quagga.stop();
        }
    },

    /**
     * Scan Barcode from Image
     */
    scanBarcodeFromImage(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (typeof Quagga === 'undefined') {
            Toast.warning('ماسح الباركود قيد التحميل...');
            return;
        }

        Quagga.decodeSingle({
            src: URL.createObjectURL(file),
            numOfWorkers: 0,
            inputStream: {
                size: 800
            },
            decoder: {
                readers: ["ean_reader", "code_128_reader"]
            }
        }, function(result) {
            if (result && result.codeResult) {
                const code = result.codeResult.code;
                document.getElementById('scanner-result').innerHTML = `
                    <div class="barcode-value">${code}</div>
                    <button class="btn-primary btn-sm" onclick="Shipping.searchByBarcode('${code}')"
                            style="margin-top:12px;">
                        <i class='bx bx-search'></i> بحث عن الشحنة
                    </button>
                `;
            } else {
                Toast.error('لم يتمكن من قراءة الباركود من الصورة');
            }
        });
    },

    /**
     * Search by Barcode
     */
    searchByBarcode(barcode) {
        closeModal('scanner-modal');
        
        const shipment = Utils.storage.get('shipments', []).find(s => s.waybillNumber === barcode);
        if (shipment) {
            this.viewShipment(shipment.id);
        } else {
            Toast.warning('لا توجد شحنة بهذا الرقم');
        }
    },

    /**
     * Update Shipment Status
     */
    updateStatus(shipmentId) {
        const shipment = Utils.storage.get('shipments', []).find(s => s.id === shipmentId);
        if (!shipment) return;

        const statuses = [
            { value: 'pending', label: 'في الانتظار' },
            { value: 'processing', label: 'جاري التجهيز' },
            { value: 'shipped', label: 'تم الاستلام' },
            { value: 'in_transit', label: 'في الطريق' },
            { value: 'out_for_delivery', label: 'خرج للتوصيل' },
            { value: 'delivered', label: 'تم التسليم' },
            { value: 'cancelled', label: 'ملغي' },
            { value: 'returned', label: 'مرتجع' }
        ];

        const currentStatusIndex = statuses.findIndex(s => s.value === shipment.status);

        const modalHtml = `
            <div id="update-status-modal" class="modal-overlay">
                <div class="modal">
                    <div class="modal-header">
                        <h3><i class='bx bx-refresh'></i> تحديث حالة الشحنة</h3>
                        <button class="btn-close" onclick="closeModal('update-status-modal')">&times;</button>
                    </div>
                    <div class="modal-body">
                        <p style="margin-bottom:16px;color:var(--text-secondary);">
                            الحالة الحالية: <strong>${this.getStatusText(shipment.status)}</strong>
                        </p>
                        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;">
                            ${statuses.map(status => `
                                <button class="btn-outline btn-sm ${status.value === shipment.status ? 'active' : ''}"
                                        onclick="Shipping.setStatus('${shipmentId}', '${status.value}', '${status.label}')"
                                        style="justify-content:center;padding:12px;">
                                    ${status.label}
                                </button>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        openModal('update-status-modal');

        // Cleanup
        setTimeout(() => {
            const modal = document.getElementById('update-status-modal');
            if (modal) {
                const obs = new MutationObserver(() => {
                    if (modal.classList.contains('hidden')) {
                        setTimeout(() => modal.remove(), 300);
                        obs.disconnect();
                    }
                });
                obs.observe(modal, { attributes: true });
            }
        }, 100);
    },

    /**
     * Set Shipment Status
     */
    setStatus(shipmentId, newStatus, statusLabel) {
        let shipments = Utils.storage.get('shipments', []);
        const index = shipments.findIndex(s => s.id === shipmentId);
        
        if (index === -1) return;

        const statusDescriptions = {
            pending: 'تم إنشاء البوليصة وفي انتظار الاستلام',
            processing: 'جاري تجهيز الشحنة',
            shipped: 'تم استلام الشحنة من المرسل',
            in_transit: 'الشحنة في طريقها للمستلم',
            out_for_delivery: 'خرج المندوب للتوصيل',
            delivered: 'تم تسليم الشحنة بنجاح',
            cancelled: 'تم إلغاء الشحنة',
            returned: 'تم ارتجاع الشحنة'
        };

        shipments[index].status = newStatus;
        shipments[index].updatedAt = new Date().toISOString();
        
        if (!shipments[index].trackingEvents) {
            shipments[index].trackingEvents = [];
        }
        
        shipments[index].trackingEvents.unshift({
            status: newStatus,
            description: statusDescriptions[newStatus] || statusLabel,
            timestamp: new Date().toISOString()
        });

        Utils.storage.set('shipments', shipments);

        closeModal('update-status-modal');
        closeModal('tracking-modal');
        closeModal('shipment-detail-modal');

        Toast.success(`تم تحديث الحالة إلى: ${statusLabel}`);
        navigateTo('shipping');
    },

    /**
     * Delete Shipment
     */
    deleteShipment(shipmentId) {
        if (!confirm('هل أنت متأكد من حذف هذه الشحنة؟')) return;

        let shipments = Utils.storage.get('shipments', []);
        shipments = shipments.filter(s => s.id !== shipmentId);
        Utils.storage.set('shipments', shipments);

        Toast.success('تم حذف الشحنة');
        navigateTo('shipping');
    },

    /**
     * Filter Functions
     */
    filterByStatus(status) {
        this.currentFilter = status;
        this.render(document.getElementById('content-area'));
    },

    filterByCompany(companyId) {
        // Implement company filter
        this.render(document.getElementById('content-area'));
    },

    search(query) {
        // Implement search
        navigateTo('shipping');
    },

    exportShipments() {
        const shipments = Utils.storage.get('shipments', []);
        const csv = [
            ['رقم البوليصة', 'الشركة', 'المستلم', 'هاتف المستلم', 'المدينة', 'الحالة', 'التحصيل', 'التاريخ'].join(','),
            ...shipments.map(s => [
                s.waybillNumber,
                s.companyName,
                s.receiverName,
                s.receiverPhone,
                s.receiverCity,
                this.getStatusText(s.status),
                s.codValue,
                s.createdAt
            ].join(','))
        ].join('\n');

        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `shipments_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);

        Toast.success('تم تصدير البيانات');
    },

    /**
     * Helper Functions
     */
    getStatusText(status) {
        const map = {
            pending: 'في الانتظار',
            processing: 'جاري التجهيز',
            shipped: 'تم الاستلام',
            in_transit: 'في الطريق',
            out_for_delivery: 'خرج للتوصيل',
            delivered: 'تم التسليم',
            cancelled: 'ملغي',
            returned: 'مرتجع'
        };
        return map[status] || status || '-';
    },

    getShipmentTypeText(type) {
        const map = {
            regular: 'شحنة عادية',
            express: 'شحنة سريعة',
            same_day: 'توصيل نفس اليوم',
            return: 'مرتجع'
        };
        return map[type] || type || '-';
    },

    initInteractions() {
        // Initialize any interactive elements
    }
};

// Make it globally available
window.Shipping = Shipping;
