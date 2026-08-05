/**
 * ===================================
 * Products View Module
 * ===================================
 */

const Products = {
    currentView: 'grid', // 'grid' or 'list'
    searchQuery: '',
    categoryFilter: 'all',

    /**
     * Render Products View
     */
    render(container) {
        container.innerHTML = `
            <div class="view-content">
                <div class="page-header">
                    <div class="header-content">
                        <h1 class="page-title"><i class='bx bx-box'></i> المنتجات</h1>
                        <p class="page-subtitle">إدارة منتجات المتجر والأسعار</p>
                    </div>
                    <button class="btn-primary" onclick="Products.openCreateModal()">
                        <i class='bx bx-plus'></i> إضافة منتج
                    </button>
                </div>

                <div class="filters-bar">
                    <div class="search-box flex-1">
                        <i class='bx bx-search'></i>
                        <input type="text" placeholder="بحث بالاسم، SKU، الفئة..." 
                               onkeyup="if(event.key==='Enter')Products.search(this.value)">
                    </div>
                    
                    <select class="filter-select" onchange="Products.filterByCategory(this.value)">
                        <option value="all">كل الفئات</option>
                        <option value="clothing">ملابس</option>
                        <option value="electronics">إلكترونيات</option>
                        <option value="accessories">إكسسوارات</option>
                        <option value="other">أخرى</option>
                    </select>

                    <div class="view-toggle">
                        <button class="icon-btn ${this.currentView === 'grid' ? 'active' : ''}" 
                                onclick="Products.setView('grid')" title="شبكة">
                            <i class='bx bx-grid-alt'></i>
                        </button>
                        <button class="icon-btn ${this.currentView === 'list' ? 'active' : ''}" 
                                onclick="Products.setView('list')" title="قائمة">
                            <i class='bx bx-list-ul'></i>
                        </button>
                    </div>
                </div>

                <div id="products-container">
                    ${this.renderProducts()}
                </div>
            </div>
        `;
    },

    renderProducts() {
        let products = Utils.storage.get('products', []);

        if (this.categoryFilter !== 'all') {
            products = products.filter(p => p.category === this.categoryFilter);
        }

        if (this.searchQuery) {
            const q = this.searchQuery.toLowerCase();
            products = products.filter(p => 
                (p.name || '').toLowerCase().includes(q) ||
                (p.sku || '').toLowerCase().includes(q)
            );
        }

        if (products.length === 0) {
            return `
                <div class="empty-state">
                    <i class='bx bx-box empty-state-icon'></i>
                    <h3 class="empty-state-title">لا توجد منتجات</h3>
                    <p class="empty-state-description">ابدأ بإضافة منتجاتك الأولى</p>
                    <button class="btn-primary" onclick="Products.openCreateModal()">
                        <i class='bx bx-plus'></i> إضافة منتج جديد
                    </button>
                </div>
            `;
        }

        if (this.currentView === 'grid') {
            return `
                <div class="products-grid">
                    ${products.map(p => this.renderProductCard(p)).join('')}
                </div>
            `;
        } else {
            return `
                <div class="table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>المنتج</th>
                                <th>SKU</th>
                                <th>الفئة</th>
                                <th>السعر</th>
                                <th>المخزون</th>
                                <th>الحالة</th>
                                <th>إجراءات</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${products.map(p => this.renderProductRow(p)).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }
    },

    renderProductCard(product) {
        const stockStatus = product.stock <= (product.lowStockThreshold || 10) ? 'low' : 
                             product.stock > 0 ? 'available' : 'out';
        
        return `
            <div class="card product-card hover-lift">
                <div class="product-image">
                    ${product.image 
                        ? `<img src="${product.image}" alt="${product.name}">` 
                        : '<i class=\'bx bx-box\' style="font-size:48px;color:var(--text-tertiary);"></i>'}
                    <span class="status-badge status-${stockStatus === 'low' ? 'warning' : stockStatus === 'out' ? 'danger' : 'success'}">
                        ${stockStatus === 'low' ? 'مخزون منخفض' : stockStatus === 'out' ? 'نفذ' : 'متوفر'}
                    </span>
                </div>
                <div class="card-body" style="padding:16px;">
                    <h3 style="font-size:16px;margin-bottom:4px;">${product.name}</h3>
                    <p style="font-size:12px;color:var(--text-secondary);margin-bottom:8px;">
                        ${product.category || '-'} • ${product.brand || '-'}
                    </p>
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                        <span style="font-weight:bold;font-size:18px;color:var(--primary);">
                            ${Utils.formatCurrency(product.price)}
                        </span>
                        <span style="font-size:13px;color:var(--text-secondary);">
                            متبقي: <strong>${product.stock || 0}</strong>
                        </span>
                    </div>
                </div>
                <div class="card-footer" style="display:flex;gap:8px;padding:12px;">
                    <button class="btn-outline btn-sm" onclick="Products.editProduct('${product.id}')" style="flex:1;">
                        <i class='bx bx-edit'></i> تعديل
                    </button>
                    <button class="btn-danger btn-sm" onclick="Products.deleteProduct('${product.id}')">
                        <i class='bx bx-trash'></i>
                    </button>
                </div>
            </div>
        `;
    },

    renderProductRow(product) {
        const stockStatus = product.stock <= (product.lowStockThreshold || 10) ? 'low' : 
                             product.stock > 0 ? 'available' : 'out';
        
        return `
            <tr>
                <td>
                    <div style="display:flex;align-items:center;gap:10px;">
                        ${product.image 
                            ? `<img src="${product.image}" style="width:40px;height:40px;border-radius:6px;object-fit:cover;">` 
                            : ''}
                        <strong>${product.name}</strong>
                    </div>
                </td>
                <td dir="ltr">${product.sku || '-'}</td>
                <td>${this.getCategoryText(product.category)}</td>
                <td><strong>${Utils.formatCurrency(product.price)}</strong></td>
                <td>
                    <span class="${stockStatus !== 'available' ? 'color:var(--warning);font-weight:bold;' : ''}">
                        ${product.stock || 0}
                    </span>
                </td>
                <td><span class="status-badge status-${stockStatus}">${this.getStockStatusText(stockStatus)}</span></td>
                <td>
                    <div class="row-actions">
                        <button class="shipment-action-btn" onclick="Products.editProduct('${product.id}')"><i class='bx bx-edit'></i></button>
                        <button class="shipment-action-btn" style="color:var(--danger);" onclick="Products.deleteProduct('${product.id}')"><i class='bx bx-trash'></i></button>
                    </div>
                </td>
            </tr>
        `;
    },

    openCreateModal(productId = null) {
        const isEdit = !!productId;
        const product = productId ? Utils.storage.get('products', []).find(p => p.id === productId) : null;

        const modalHtml = `
            <div id="product-modal" class="modal-overlay">
                <div class="modal modal-lg">
                    <div class="modal-header modal-gradient">
                        <h3><i class='bx ${isEdit ? 'bx-edit' : 'bx-package'}'></i> 
                            ${isEdit ? 'تعديل المنتج' : 'إضافة منتج جديد'}
                        </h3>
                        <button class="btn-close" onclick="closeModal('product-modal')">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="product-form">
                            <!-- Image Upload -->
                            <div class="form-group">
                                <label><i class='bx bx-image'></i> صورة المنتج</label>
                                <div class="logo-upload" id="product-image-upload">
                                    <input type="file" id="product-image" accept="image/*" onchange="Products.previewImage(this)">
                                    <div class="upload-placeholder" id="product-image-preview">
                                        ${product?.image 
                                            ? `<img src="${product.image}" alt="Preview" style="max-width:100%;max-height:120px;object-fit:contain;">`
                                            : '<i class=\'bx bx-cloud-upload\' style="font-size:36px;"></i><span>اضغط لرفع الصورة</span>'}
                                    </div>
                                </div>
                            </div>

                            <!-- Basic Info -->
                            <div class="form-row">
                                <div class="form-group flex-2">
                                    <label>اسم المنتج *</label>
                                    <input type="text" id="product-name" required value="${product?.name || ''}"
                                           placeholder="مثال: تيشيرت قطني">
                                </div>
                                <div class="form-group flex-1">
                                    <label>SKU / الرمز</label>
                                    <input type="text" id="product-sku" value="${product?.sku || ''}"
                                           placeholder="TSH-001">
                                </div>
                            </div>

                            <div class="form-row">
                                <div class="form-group flex-1">
                                    <label>الفئة</label>
                                    <select id="product-category">
                                        <option value="">اختر الفئة</option>
                                        <option value="clothing" ${product?.category === 'clothing' ? 'selected' : ''}>ملابس</option>
                                        <option value="electronics" ${product?.category === 'electronics' ? 'selected' : ''}>إلكترونيات</option>
                                        <option value="accessories" ${product?.category === 'accessories' ? 'selected' : ''}>إكسسوارات</option>
                                        <option value="other" ${product?.category === 'other' ? 'selected' : ''}>أخرى</option>
                                    </select>
                                </div>
                                <div class="form-group flex-1">
                                    <label>الماركة</label>
                                    <input type="text" id="product-brand" value="${product?.brand || ''}"
                                           placeholder="Nike, Adidas...">
                                </div>
                            </div>

                            <!-- Pricing -->
                            <div class="form-row">
                                <div class="form-group flex-1">
                                    <label>سعر الشراء *</label>
                                    <input type="number" id="product-cost" required value="${product?.cost || 0}" min="0"
                                           onchange="Products.calculateProfit()">
                                </div>
                                <div class="form-group flex-1">
                                    <label>سعر البيع *</label>
                                    <input type="number" id="product-price" required value="${product?.price || 0}" min="0"
                                           onchange="Products.calculateProfit()">
                                </div>
                            </div>

                            <div id="profit-display" style="display:none;padding:12px;background:var(--success-light);border-radius:8px;margin-bottom:16px;">
                                <strong>هامش الربح:</strong> <span id="profit-value">0 ج.م</span>
                                (<span id="profit-percent">0%</span>)
                            </div>

                            <!-- Inventory -->
                            <div class="form-row">
                                <div class="form-group flex-1">
                                    <label>الكمية في المخزون</label>
                                    <input type="number" id="product-stock" value="${product?.stock || 0}" min="0">
                                </div>
                                <div class="form-group flex-1">
                                    <label>حد التنبيه المنخفض</label>
                                    <input type="number" id="product-low-stock" value="${product?.lowStockThreshold || 10}" min="0">
                                </div>
                            </div>

                            <!-- Description -->
                            <div class="form-group">
                                <label>وصف المنتج</label>
                                <textarea id="product-description" rows="3"
                                          placeholder="وصف تفصيلي للمنتج...">${product?.description || ''}</textarea>
                            </div>

                            <div class="form-actions">
                                <button type="button" class="btn-outline" onclick="closeModal('product-modal')">إلغاء</button>
                                <button type="submit" class="btn-primary">
                                    <i class='bx ${isEdit ? 'bx-check' : 'bx-plus'}'></i> 
                                    ${isEdit ? 'حفظ التعديلات' : 'إضافة المنتج'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        openModal('product-modal');

        document.getElementById('product-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveProduct(productId);
        });

        // Cleanup
        setTimeout(() => {
            const modal = document.getElementById('product-modal');
            if (modal) {
                const obs = new MutationObserver(() => {
                    if (modal.classList.contains('hidden')) { setTimeout(() => modal.remove(), 300); obs.disconnect(); }
                });
                obs.observe(modal, { attributes: true });
            }
        }, 100);
    },

    previewImage(input) {
        if (input.files && input.files[0]) {
            const reader = new FileReader();
            reader.onload = (e) => {
                document.getElementById('product-image-preview').innerHTML = 
                    `<img src="${e.target.result}" alt="Preview" style="max-width:100%;max-height:120px;object-fit:contain;">`;
                document.getElementById('product-image-preview').classList.add('has-image');
            };
            reader.readAsDataURL(input.files[0]);
        }
    },

    calculateProfit() {
        const cost = parseFloat(document.getElementById('product-cost')?.value) || 0;
        const price = parseFloat(document.getElementById('product-price')?.value) || 0;
        const profit = price - cost;
        const percent = cost > 0 ? ((profit / cost) * 100).toFixed(1) : 0;

        const display = document.getElementById('profit-display');
        if (display && price > 0) {
            display.style.display = 'block';
            document.getElementById('profit-value').textContent = Utils.formatCurrency(profit);
            document.getElementById('profit-percent').textContent = percent + '%';
        }
    },

    saveProduct(productId = null) {
        // Get image data
        let imageData = null;
        const previewImg = document.querySelector('#product-image-preview img');
        if (previewImg && previewImg.src.startsWith('data:')) {
            imageData = previewImg.src;
        } else if (productId) {
            const existing = Utils.storage.get('products', []).find(p => p.id === productId);
            imageData = existing?.image;
        }

        const productData = {
            id: productId || Utils.generateId(),
            name: document.getElementById('product-name').value.trim(),
            sku: document.getElementById('product-sku').value.trim(),
            category: document.getElementById('product-category').value,
            brand: document.getElementById('product-brand').value.trim(),
            cost: parseFloat(document.getElementById('product-cost').value) || 0,
            price: parseFloat(document.getElementById('product-price').value) || 0,
            stock: parseInt(document.getElementById('product-stock').value) || 0,
            lowStockThreshold: parseInt(document.getElementById('product-low-stock').value) || 10,
            description: document.getElementById('product-description').value.trim(),
            image: imageData,
            createdAt: productId ? undefined : new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        if (!productData.name) {
            Toast.error('يرجى إدخال اسم المنتج');
            return;
        }

        let products = Utils.storage.get('products', []);
        if (productId) {
            const idx = products.findIndex(p => p.id === productId);
            if (idx !== -1) products[idx] = { ...products[idx], ...productData };
        } else {
            products.unshift(productData);
        }

        Utils.storage.set('products', products);

        closeModal('product-modal');
        Toast.success(productId ? 'تم تحديث المنتج' : 'تم إضافة المنتج');
        navigateTo('products');
    },

    editProduct(id) { this.openCreateModal(id); },
    
    deleteProduct(id) {
        if (!confirm('هل تريد حذف هذا المنتج؟')) return;
        let products = Utils.storage.get('products', []).filter(p => p.id !== id);
        Utils.storage.set('products', products);
        Toast.success('تم حذف المنتج');
        navigateTo('products');
    },

    setView(view) {
        this.currentView = view;
        navigateTo('products');
    },

    filterByCategory(cat) {
        this.categoryFilter = cat;
        navigateTo('products');
    },

    search(q) {
        this.searchQuery = q;
        navigateTo('products');
    },

    getCategoryText(cat) {
        const map = { clothing: 'ملابس', electronics: 'إلكترونيات', accessories: 'إكسسوارات', other: 'أخرى' };
        return map[cat] || cat || '-';
    },

    getStockStatusText(status) {
        const map = { available: 'متوفر', low: 'منخفض', out: 'نفذ' };
        return map[status] || '-';
    }
};

window.Products = Products;

// Styles
const productsStyles = `
    .products-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:20px;}
    .product-card{overflow:hidden;}
    .product-image{
        height:180px;background:var(--bg-tertiary);display:flex;align-items:center;justify-content:center;
        position:relative;border-bottom:1px solid var(--border-color);
    }
    .product-image img{width:100%;height:100%;object-fit:cover;}
    .product-image .status-badge{position:absolute;top:10px;left:10px;}
`;

if (!document.getElementById('products-styles')) {
    const s = document.createElement('style'); s.id = 'products-styles'; s.textContent = productsStyles;
    document.head.appendChild(s);
}
