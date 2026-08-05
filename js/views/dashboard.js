/**
 * ===================================
 * Dashboard View Module
 * ===================================
 */

const Dashboard = {
    /**
     * Render Dashboard View
     */
    render(container) {
        container.innerHTML = `
            <div class="view-content">
                <!-- Page Header -->
                <div class="page-header">
                    <h1 class="page-title">
                        <i class='bx bx-grid-alt'></i>
                        لوحة القيادة
                    </h1>
                    <p class="page-subtitle">نظرة عامة على نشاط متجرك</p>
                </div>

                <!-- Quick Actions -->
                <div class="quick-actions">
                    <button class="btn-primary" onclick="Orders.openCreateModal()">
                        <i class='bx bx-plus'></i> طلب جديد
                    </button>
                    <button class="btn-secondary" onclick="Shipping.openWaybillModal()">
                        <i class='bx bx-truck'></i> بوليصة شحن
                    </button>
                    <button class="btn-outline" onclick="navigateTo('reports')">
                        <i class='bx bx-download'></i> تصدير تقرير
                    </button>
                </div>

                <!-- Stats Grid -->
                <div class="stats-grid" id="dashboard-stats">
                    ${this.renderStatCards()}
                </div>

                <!-- Main Content Grid -->
                <div class="dashboard-grid">
                    <!-- Recent Orders -->
                    <div class="card dashboard-card">
                        <div class="card-header">
                            <h3><i class='bx bx-cart'></i> آخر الطلبات</h3>
                            <a href="#" onclick="navigateTo('orders')" class="btn-link">عرض الكل</a>
                        </div>
                        <div class="card-body">
                            <div id="recent-orders-list">
                                ${this.renderRecentOrders()}
                            </div>
                        </div>
                    </div>

                    <!-- Recent Shipments -->
                    <div class="card dashboard-card">
                        <div class="card-header">
                            <h3><i class='bx bx-truck'></i> آخر الشحنات</h3>
                            <a href="#" onclick="navigateTo('shipping')" class="btn-link">عرض الكل</a>
                        </div>
                        <div class="card-body">
                            <div id="recent-shipments-list">
                                ${this.renderRecentShipments()}
                            </div>
                        </div>
                    </div>

                    <!-- Revenue Chart Placeholder -->
                    <div class="card dashboard-card chart-card">
                        <div class="card-header">
                            <h3><i class='bx bx-line-chart'></i> الإيرادات</h3>
                            <select class="filter-select" id="revenue-period" onchange="Dashboard.updateRevenueChart()">
                                <option value="7">آخر 7 أيام</option>
                                <option value="30" selected>آخر 30 يوم</option>
                                <option value="90">آخر 90 يوم</option>
                            </select>
                        </div>
                        <div class="card-body">
                            <div class="chart-placeholder" id="revenue-chart">
                                ${this.renderRevenueChart()}
                            </div>
                        </div>
                    </div>

                    <!-- Quick Stats / Activity Feed -->
                    <div class="card dashboard-card">
                        <div class="card-header">
                            <h3><i class='bx bx-activity'></i> النشاط الأخير</h3>
                        </div>
                        <div class="card-body">
                            <div id="activity-feed">
                                ${this.renderActivityFeed()}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Initialize any interactive elements
        this.initInteractions();
    },

    /**
     * Render Stat Cards
     */
    renderStatCards() {
        const stats = [
            { 
                icon: 'bx-cart', 
                label: 'إجمالي الطلبات', 
                value: Utils.storage.get('orders', []).length,
                color: 'primary',
                trend: '+12%',
                trendUp: true
            },
            { 
                icon: 'bx-truck', 
                label: 'الشحنات النشطة', 
                value: Utils.storage.get('shipments', []).filter(s => ['pending', 'processing', 'shipped'].includes(s.status)).length,
                color: 'warning',
                trend: '+5%',
                trendUp: true
            },
            { 
                icon: 'bx-check-circle', 
                label: 'تم التسليم', 
                value: Utils.storage.get('shipments', []).filter(s => s.status === 'delivered').length,
                color: 'success',
                trend: '+18%',
                trendUp: true
            },
            { 
                icon: 'bx-wallet', 
                label: 'إجمالي الإيرادات', 
                value: Utils.formatCurrency(this.calculateTotalRevenue()),
                color: 'info',
                trend: '+8%',
                trendUp: true
            },
            { 
                icon: 'bx-user-pin', 
                label: 'إجمالي العملاء', 
                value: Utils.storage.get('customers', []).length,
                color: 'purple'
            },
            { 
                icon: 'bx-box', 
                label: 'المنتجات', 
                value: Utils.storage.get('products', []).length,
                color: 'danger'
            },
            { 
                icon: 'bx-package', 
                label: 'منخفض المخزون', 
                value: Utils.storage.get('products', []).filter(p => (p.stock || 0) <= (p.lowStockThreshold || 10)).length,
                color: 'warning'
            },
            { 
                icon: 'bx-return-box', 
                label: 'مرتجعات', 
                value: Utils.storage.get('shipments', []).filter(s => s.status === 'returned').length,
                color: 'danger'
            }
        ];

        return stats.map(stat => `
            <div class="stat-card hover-lift">
                <div class="stat-icon ${stat.color}">
                    <i class='bx ${stat.icon}'></i>
                </div>
                <div class="stat-content">
                    <div class="stat-value">${stat.value}</div>
                    <div class="stat-label">${stat.label}</div>
                    ${stat.trend ? `
                        <div class="stat-trend ${stat.trendUp ? 'up' : 'down'}">
                            <i class='bx ${stat.trendUp ? 'bx-trending-up' : 'bx-trending-down'}'></i>
                            ${stat.trend}
                        </div>
                    ` : ''}
                </div>
            </div>
        `).join('');
    },

    /**
     * Calculate Total Revenue
     */
    calculateTotalRevenue() {
        const orders = Utils.storage.get('orders', []);
        return orders.reduce((sum, order) => sum + (parseFloat(order.total) || 0), 0);
    },

    /**
     * Render Recent Orders List
     */
    renderRecentOrders() {
        const orders = Utils.storage.get('orders', []);
        const recentOrders = orders.slice(-5).reverse();

        if (recentOrders.length === 0) {
            return `
                <div class="empty-state" style="padding: 40px 20px;">
                    <i class='bx bx-cart empty-state-icon'></i>
                    <p class="empty-state-description">لا توجد طلبات بعد</p>
                    <button class="btn-primary btn-sm" onclick="Orders.openCreateModal()">
                        إنشاء أول طلب
                    </button>
                </div>
            `;
        }

        return recentOrders.map(order => `
            <div class="list-item" style="display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px solid var(--border-color);">
                <div style="flex:1;min-width:0;">
                    <div style="font-weight:600;font-size:14px;margin-bottom:4px;">${order.customerName || 'بدون اسم'}</div>
                    <div style="font-size:12px;color:var(--text-secondary);">#${order.id?.slice(-8) || 'N/A'}</div>
                </div>
                <div style="text-align:left;">
                    <div style="font-weight:600;color:var(--primary);">${Utils.formatCurrency(order.total)}</div>
                    <span class="status-badge status-${order.status || 'pending'}">${this.getStatusText(order.status)}</span>
                </div>
            </div>
        `).join('');
    },

    /**
     * Render Recent Shipments List
     */
    renderRecentShipments() {
        const shipments = Utils.storage.get('shipments', []);
        const recentShipments = shipments.slice(-5).reverse();

        if (recentShipments.length === 0) {
            return `
                <div class="empty-state" style="padding: 40px 20px;">
                    <i class='bx bx-truck empty-state-icon'></i>
                    <p class="empty-state-description">لا توجد شحنات بعد</p>
                    <button class="btn-primary btn-sm" onclick="Shipping.openWaybillModal()">
                        إنشاء بوليصة شحن
                    </button>
                </div>
            `;
        }

        return recentShipments.map(shipment => `
            <div class="list-item" style="display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px solid var(--border-color);">
                <div style="flex:1;min-width:0;">
                    <div style="font-weight:600;font-size:14px;margin-bottom:4px;">${shipment.receiverName || 'بدون اسم'}</div>
                    <div style="font-size:12px;color:var(--text-secondary);">
                        <i class='bx bx-building-house'></i> ${shipment.companyName || 'غير محدد'}
                    </div>
                </div>
                <div style="text-align:left;">
                    <span class="status-badge status-${shipment.status || 'pending'}">${this.getShipmentStatusText(shipment.status)}</span>
                </div>
            </div>
        `).join('');
    },

    /**
     * Render Revenue Chart (Simple CSS-based)
     */
    renderRevenueChart() {
        // Generate sample data for last 30 days
        const days = [];
        const values = [];
        
        for (let i = 29; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            days.push(date.getDate() + '/' + (date.getMonth() + 1));
            values.push(Math.floor(Math.random() * 5000) + 1000);
        }

        const maxValue = Math.max(...values);
        const minValue = Math.min(...values);
        const range = maxValue - minValue;

        return `
            <div class="simple-chart">
                <div class="chart-bars" style="display:flex;align-items:flex-end;height:200px;gap:4px;padding-top:20px;">
                    ${values.map((val, idx) => {
                        const height = range > 0 ? ((val - minValue) / range * 80 + 20) : 50;
                        return `
                            <div class="chart-bar" style="
                                flex:1;
                                height:${height}%;
                                background:linear-gradient(to top, var(--primary), var(--purple));
                                border-radius:4px 4px 0 0;
                                min-height:4px;
                                position:relative;
                                cursor:pointer;
                                transition:all 0.2s;
                            " title="${days[idx]}: ${Utils.formatCurrency(val)}">
                            </div>
                        `;
                    }).join('')}
                </div>
                <div class="chart-labels" style="display:flex;justify-content:space-between;margin-top:8px;font-size:11px;color:var(--text-tertiary);">
                    <span>${days[0]}</span>
                    <span>${days[15]}</span>
                    <span>${days[29]}</span>
                </div>
            </div>
        `;
    },

    /**
     * Render Activity Feed
     */
    renderActivityFeed() {
        const activities = [
            { icon: 'bx-cart-add', text: 'طلب جديد من أحمد محمد', time: 'منذ 5 دقائق', color: 'primary' },
            { icon: 'bx-truck', text: 'تم شحنة #12345', time: 'منذ ساعة', color: 'success' },
            { icon: 'bx-check-double', text: 'تسليم طلب #12344', time: 'منذ ساعتين', color: 'info' },
            { icon: 'bx-user-plus', text: 'عميل جديد: سارة علي', time: 'منذ 3 ساعات', color: 'purple' },
            { icon: 'bx-package', text: 'تحديث مخزون: تيشيرت قطني', time: 'منذ 5 ساعات', color: 'warning' }
        ];

        return activities.map(activity => `
            <div class="activity-item" style="display:flex;gap:12px;padding:12px 0;border-bottom:1px solid var(--border-color);">
                <div class="activity-icon" style="
                    width:36px;height:36px;border-radius:50%;
                    background:var(--${activity.color}-light);
                    display:flex;align-items:center;justify-content:center;
                    flex-shrink:0;
                ">
                    <i class='bx ${activity.icon}' style="color:var(--${activity.color});font-size:18px;"></i>
                </div>
                <div style="flex:1;min-width:0;">
                    <p style="font-size:14px;margin-bottom:2px;">${activity.text}</p>
                    <span style="font-size:12px;color:var(--text-tertiary);">${activity.time}</span>
                </div>
            </div>
        `).join('');
    },

    /**
     * Get Status Text in Arabic
     */
    getStatusText(status) {
        const statusMap = {
            pending: 'معلق',
            processing: 'قيد المعالجة',
            shipped: 'تم الشحن',
            delivered: 'تم التسليم',
            cancelled: 'ملغي',
            returned: 'مرتجع'
        };
        return statusMap[status] || status || 'معلق';
    },

    /**
     * Get Shipment Status Text in Arabic
     */
    getShipmentStatusText(status) {
        const statusMap = {
            pending: 'في الانتظار',
            processing: 'جاري التجهيز',
            shipped: 'تم الاستلام',
            in_transit: 'في الطريق',
            out_for_delivery: 'خرج للتوصيل',
            delivered: 'تم التسليم',
            cancelled: 'ملغي',
            returned: 'مرتجع'
        };
        return statusMap[status] || status || 'في الانتظار';
    },

    /**
     * Initialize Interactive Elements
     */
    initInteractions() {
        // Add hover effects to chart bars
        document.querySelectorAll('.chart-bar').forEach(bar => {
            bar.addEventListener('mouseenter', () => {
                bar.style.transform = 'scaleY(1.05)';
                bar.style.filter = 'brightness(1.1)';
            });
            bar.addEventListener('mouseleave', () => {
                bar.style.transform = '';
                bar.style.filter = '';
            });
        });
    },

    /**
     * Update Revenue Chart based on period selection
     */
    updateRevenueChart() {
        const period = document.getElementById('revenue-period')?.value || 30;
        const chartContainer = document.getElementById('revenue-chart');
        if (chartContainer) {
            chartContainer.innerHTML = this.renderRevenueChart();
            this.initInteractions();
        }
    }
};

// Add styles for dashboard components
const dashboardStyles = `
    .page-header {
        margin-bottom: 24px;
    }
    
    .page-title {
        font-size: 28px;
        font-weight: 700;
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 8px;
    }
    
    .page-title i {
        color: var(--primary);
    }
    
    .page-subtitle {
        font-size: 14px;
        color: var(--text-secondary);
    }
    
    .quick-actions {
        display: flex;
        gap: 12px;
        margin-bottom: 24px;
        flex-wrap: wrap;
    }
    
    .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
        gap: 16px;
        margin-bottom: 24px;
    }
    
    .dashboard-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 20px;
    }
    
    @media (max-width: 1024px) {
        .dashboard-grid {
            grid-template-columns: 1fr;
        }
    }
    
    @media (max-width: 640px) {
        .stats-grid {
            grid-template-columns: repeat(2, 1fr);
        }
    }
    
    .dashboard-card {
        min-height: 300px;
    }
    
    .btn-link {
        color: var(--primary);
        text-decoration: none;
        font-size: 13px;
        font-weight: 500;
    }
    
    .btn-link:hover {
        text-decoration: underline;
    }
`;

// Inject styles
if (!document.getElementById('dashboard-styles')) {
    const styleSheet = document.createElement('style');
    styleSheet.id = 'dashboard-styles';
    styleSheet.textContent = dashboardStyles;
    document.head.appendChild(styleSheet);
}
