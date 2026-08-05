import { t } from '../core/i18n.js';
import { db, ref, onValue, set, push, remove, get } from '../core/firebase-config.js';
import { showToast } from '../components/ui.js';

let currentProducts = [];

export function renderProducts(container) {
    container.innerHTML = `
        <div class="view-content">
            <div class="table-container">
                <div class="table-header-actions">
                    <h2><i class='bx bx-box'></i> ${t('products')}</h2>
                    <div style="display:flex;gap:10px;align-items:center;">
                        <div class="table-filters">
                            <select class="filter-select" id="product-category-filter" onchange="filterProducts()">
                                <option value="">${t('allAll')} ${t('category')}</option>
                                <option value="electronics">إلكترونيات</option>
                                <option value="clothing">ملابس</option>
                                <option value="food">أغذية</option>
                                <option value="other">أخرى</option>
                            </select>
                        </div>
                        <button class="btn-primary" onclick="openProductModal()">
                            <i class='bx bx-plus'></i> ${t('addProduct')}
                        </button>
                    </div>
                </div>

                <!-- Search -->
                <div style="padding: 15px 22px; border-bottom: 1px solid var(--border-color);">
                    <input type="text" class="filter-input" style="width:100%;max-width:350px;" 
                           placeholder="${t('searchPlaceholder')}..." id="products-search" oninput="filterProducts()">
                </div>

                <!-- Products Grid View Toggle -->
                <div style="padding: 12px 22px; display:flex; justify-content: space-between; align-items:center; border-bottom:1px solid var(--border-color);">
                    <span style="font-size:13px;color:var(--text-secondary);">
                        <span id="products-count">0</span> منتج
                    </span>
                    <div style="display:flex;gap:8px;">
                        <button class="icon-btn active" id="view-grid-btn" onclick="setProductView('grid')" title="Grid View">
                            <i class='bx bx-grid-alt'></i>
                        </button>
                        <button class="icon-btn" id="view-list-btn" onclick="setProductView('list')" title="List View">
                            <i class='bx bx-list-ul'></i>
                        </button>
                    </div>
                </div>

                <!-- Grid View -->
                <div id="products-grid-view" style="padding: 20px; display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 18px;"></div>

                <!-- Table View -->
                <table id="products-table-view" style="display:none;">
                    <thead>
                        <tr>
                            <th>الصورة</th>
                            <th>${t('productName')}</th>
                            <th>${t('sku')}</th>
                            <th>${t('category')}</th>
                            <th>${t('price')}</th>
                            <th>${t('stock')}</th>
                            <th>${t('action')}</th>
                        </tr>
                    </thead>
                    <tbody id="products-body">
                        <tr><td colspan="7" style="text-align:center;padding:40px;"><div class="spinner"></div></td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;

    // Fetch products
    const productsRef = ref(db, 'products');
    onValue(productsRef, (snapshot) => {
        const data = snapshot.val();
        if(data) {
            currentProducts = Object.entries(data).map(([key, val]) => ({...val, _key: key}));
            document.getElementById('products-count').innerText = currentProducts.length;
            displayProductList(currentProducts);
        } else {
            currentProducts = [];
            document.getElementById('products-count').innerText = '0';
            showEmptyState();
        }
    });
}

/**
 * Display products in Grid and Table views
 * @param {Array} products - Array of product objects
 */
function displayProductList(products) {
    const gridView = document.getElementById('products-grid-view');
    const tableView = document.getElementById('products-table-view');
    const tbody = document.getElementById('products-body');
    
    if(products.length === 0) {
        showEmptyState();
        return;
    }

    // Grid View
    gridView.innerHTML = products.map(product => `
        <div class="inventory-card ${product.stock <= 5 ? 'low-stock' : ''} ${product.stock === 0 ? 'out-of-stock' : ''}">
            <div class="inventory-card-header">
                <div>
                    <div class="inventory-card-title">${product.name}</div>
                    <div class="inventory-card-sku">${t('sku')}: ${product.sku || '-'}</div>
                </div>
                <span class="badge badge-${getStockBadgeClass(product.stock)}">${getStockText(product.stock)}</span>
            </div>
            <div style="text-align:center;margin:15px 0;">
                <img src="${product.imageUrl || 'https://via.placeholder.com/150?text=No+Image'}" 
                     alt="${product.name}" 
                     style="width:100%;max-height:150px;object-fit:cover;border-radius:var(--radius-md);"
                     onerror="this.src='https://via.placeholder.com/150?text=No+Image'">
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
                <span style="font-size:20px;font-weight:700;color:var(--primary);">${Number(product.price).toLocaleString()} <small style="font-size:12px;">${t('currency')}</small></span>
                <span style="font-size:12px;color:var(--text-secondary);">${getCategoryName(product.category)}</span>
            </div>
            <div class="stock-indicator">
                <span style="font-size:12px;color:var(--text-secondary);">المخزون:</span>
                <div class="stock-bar">
                    <div class="stock-fill" style="width:${Math.min(product.stock * 2, 100)}%;background:${getStockColor(product.stock)}"></div>
                </div>
                <span class="stock-text" style="color:${getStockColor(product.stock)}">${product.stock}</span>
            </div>
            <div style="display:flex;gap:8px;margin-top:15px;">
                <button class="btn-primary btn-sm" style="flex:1;" onclick="openProductModal('${product._key}')">
                    <i class='bx bx-edit'></i> ${t('edit')}
                </button>
                <button class="btn-danger btn-sm" onclick="deleteProduct('${product._key}')" style="background:var(--danger);color:white;border:none;padding:8px 12px;border-radius:6px;cursor:pointer;">
                    <i class='bx bx-trash'></i>
                </button>
            </div>
        </div>
    `).join('');

    // Table View
    tbody.innerHTML = products.map(product => `
        <tr>
            <td><img src="${product.imageUrl || 'https://via.placeholder.com/40'}" style="width:45px;height:45px;border-radius:8px;object-fit:cover;" onerror="this.src='https://via.placeholder.com/40'"></td>
            <td><strong>${product.name}</strong><br><small style="color:var(--text-secondary)">${product.description?.substring(0, 50) || ''}...</small></td>
            <td><code>${product.sku || '-'}</code></td>
            <td><span class="badge badge-primary">${getCategoryName(product.category)}</span></td>
            <td style="font-weight:600;color:var(--primary);">${Number(product.price).toLocaleString()} ${t('currency')}</td>
            <td>
                <span class="badge badge-${getStockBadgeClass(product.stock)}">${product.stock} قطعة</span>
            </td>
            <td>
                <div class="action-btns">
                    <button class="icon-btn edit" onclick="openProductModal('${product._key}')"><i class='bx bx-edit'></i></button>
                    <button class="icon-btn delete" onclick="deleteProduct('${product._key}')"><i class='bx bx-trash'></i></button>
                </div>
            </td>
        </tr>
    `).join('');
}

function showEmptyState() {
    const gridView = document.getElementById('products-grid-view');
    const tableView = document.getElementById('products-table-view');
    const tbody = document.getElementById('products-body');
    
    gridView.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1;">
            <i class='bx bx-package'></i>
            <h3>${t('noProducts')}</h3>
            <p>ابدأ بإضافة منتجاتك الأولى إلى النظام</p>
            <button class="btn-primary" onclick="openProductModal()" style="margin-top:15px;">
                <i class='bx bx-plus'></i> ${t('addProduct')}
            </button>
        </div>`;
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><p>${t('noProducts')}</p></div></td></tr>`;
}

// Helper functions
function getStockColor(stock) {
    if(stock === 0) return 'var(--danger)';
    if(stock <= 5) return 'var(--warning)';
    return 'var(--success)';
}

function getStockBadgeClass(stock) {
    if(stock === 0) return 'danger';
    if(stock <= 5) return 'warning';
    return 'success';
}

function getStockText(stock) {
    if(stock === 0) return t('outOfStock');
    if(stock <= 5) return t('lowStock');
    return t('inStock');
}

function getCategoryName(cat) {
    const categories = { electronics: 'إلكترونيات', clothing: 'ملابس', food: 'أغذية', other: 'أخرى' };
    return categories[cat] || cat || 'بدون تصنيف';
}

// Global functions
window.filterProducts = function() {
    const categoryFilter = document.getElementById('product-category-filter').value;
    const searchTerm = document.getElementById('products-search').value.toLowerCase();
    
    let filtered = currentProducts;
    
    if(categoryFilter) {
        filtered = filtered.filter(p => p.category === categoryFilter);
    }
    
    if(searchTerm) {
        filtered = filtered.filter(p => 
            p.name.toLowerCase().includes(searchTerm) || 
            (p.sku && p.sku.toLowerCase().includes(searchTerm))
        );
    }
    
    displayProductList(filtered);
};

window.setProductView = function(view) {
    const gridView = document.getElementById('products-grid-view');
    const tableView = document.getElementById('products-table-view');
    const gridBtn = document.getElementById('view-grid-btn');
    const listBtn = document.getElementById('view-list-btn');
    
    if(view === 'grid') {
        gridView.style.display = 'grid';
        tableView.style.display = 'none';
        gridBtn.classList.add('active');
        listBtn.classList.remove('active');
    } else {
        gridView.style.display = 'none';
        tableView.style.display = 'table';
        listBtn.classList.add('active');
        gridBtn.classList.remove('active');
    }
};

window.openProductModal = function(productKey = null) {
    const isEdit = !!productKey;
    let product = null;
    
    if(isEdit) {
        product = currentProducts.find(p => p._key === productKey);
    }
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal" style="max-width:600px;">
            <div class="modal-header">
                <h3><i class='bx ${isEdit ? 'bx-edit' : 'bx-plus-circle'}'></i> ${isEdit ? t('edit') + ' ' + t('products') : t('addProduct')}</h3>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
                    <i class='bx bx-x'></i>
                </button>
            </div>
            <div class="modal-body">
                <form id="product-form">
                    <div class="form-group">
                        <label>${t('productName')} *</label>
                        <input type="text" class="form-control" name="name" required 
                               value="${product?.name || ''}" placeholder="اسم المنتج">
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>${t('sku')}</label>
                            <input type="text" class="form-control" name="sku" 
                                   value="${product?.sku || ''}" placeholder="PRD-001">
                        </div>
                        <div class="form-group">
                            <label>${t('category')}</label>
                            <select class="form-control" name="category">
                                <option value="">اختر الفئة</option>
                                <option value="electronics" ${product?.category === 'electronics' ? 'selected' : ''}>إلكترونيات</option>
                                <option value="clothing" ${product?.category === 'clothing' ? 'selected' : ''}>ملابس</option>
                                <option value="food" ${product?.category === 'food' ? 'selected' : ''}>أغذية</option>
                                <option value="other" ${product?.category === 'other' ? 'selected' : ''}>أخرى</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>${t('price')} *</label>
                            <input type="number" class="form-control" name="price" required 
                                   value="${product?.price || ''}" placeholder="0.00" step="0.01">
                        </div>
                        <div class="form-group">
                            <label>${t('stock')} *</label>
                            <input type="number" class="form-control" name="stock" required 
                                   value="${product?.stock || ''}" placeholder="0">
                        </div>
                    </div>
                    <div class="form-group">
                        <label>${t('description')}</label>
                        <textarea class="form-control" name="description" rows="3" 
                                  placeholder="وصف المنتج...">${product?.description || ''}</textarea>
                    </div>
                    <div class="form-group">
                        <label>${t('image')} URL (R2 / Cloudinary)</label>
                        <input type="url" class="form-control" name="imageUrl" 
                               value="${product?.imageUrl || ''}" placeholder="https://...">
                        <small style="color:var(--text-secondary);margin-top:4px;display:block;">
                            <i class='bx bx-cloud'></i> Images are stored on Cloudflare R2
                        </small>
                    </div>
                    
                    <!-- Image Preview -->
                    <div id="image-preview" style="margin-top:10px;text-align:center;display:none;">
                        <img src="" alt="Preview" style="max-width:100%;max-height:200px;border-radius:var(--radius-md);object-fit:contain;background:var(--bg-main);padding:10px;">
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button class="btn-outline btn-sm" onclick="this.closest('.modal-overlay').remove()">${t('cancel')}</button>
                <button class="btn-primary btn-sm" onclick="saveProduct('${productKey || ''}')">
                    <i class='bx bx-save'></i> ${t('save')}
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    // Image preview functionality
    const imageUrlInput = modal.querySelector('input[name="imageUrl"]');
    const imagePreview = modal.querySelector('#image-preview img');
    const imagePreviewContainer = modal.querySelector('#image-preview');
    
    imageUrlInput.addEventListener('change', function() {
        if(this.value) {
            imagePreview.src = this.value;
            imagePreviewContainer.style.display = 'block';
        } else {
            imagePreviewContainer.style.display = 'none';
        }
    });
    
    if(product?.imageUrl) {
        imagePreview.src = product.imageUrl;
        imagePreviewContainer.style.display = 'block';
    }
};

window.saveProduct = function(productKey) {
    const form = document.getElementById('product-form');
    const formData = new FormData(form);
    
    const productData = {
        name: formData.get('name'),
        sku: formData.get('sku'),
        category: formData.get('category'),
        price: Number(formData.get('price')),
        stock: Number(formData.get('stock')),
        description: formData.get('description'),
        imageUrl: formData.get('imageUrl'),
        updatedAt: new Date().toISOString()
    };
    
    // Validation
    if(!productData.name || !productData.price || isNaN(productData.stock)) {
        showToast('يرجى ملء جميع الحقول المطلوبة', 'error');
        return;
    }
    
    if(productKey) {
        // Update existing
        set(ref(db, `products/${productKey}`), productData).then(() => {
            showToast('تم تحديث المنتج بنجاح', 'success');
            document.querySelector('.modal-overlay')?.remove();
        }).catch(err => {
            showToast('حدث خطأ: ' + err.message, 'error');
        });
    } else {
        // Create new
        productData.createdAt = new Date().toISOString();
        push(ref(db, 'products'), productData).then(() => {
            showToast('تم إضافة المنتج بنجاح', 'success');
            document.querySelector('.modal-overlay')?.remove();
        }).catch(err => {
            showToast('حدث خطأ: ' + err.message, 'error');
        });
    }
};

window.deleteProduct = function(productKey) {
    if(confirm(t('deleteConfirm'))) {
        remove(ref(db, `products/${productKey}`)).then(() => {
            showToast('تم حذف المنتج', 'success');
        }).catch(err => {
            showToast('حدث خطأ: ' + err.message, 'error');
        });
    }
};
