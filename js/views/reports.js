/**
 * ===================================
 * Reports View Module
 * ===================================
 */

const Reports = {
    render(container) {
        const orders = Utils.storage.get('orders', []);
        const shipments = Utils.storage.get('shipments', []);
        const customers = Utils.storage.get('customers', []);

        // Calculate stats
        const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
        const avgOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;
        const deliveredShipments = shipments.filter(s => s.status === 'delivered').length;

        container.innerHTML = `
            <div class="view-content">
                <div class="page-header">
                    <div class="header-content">
                        <h1 class="page-title"><i class='bx bx-pie-chart-alt-2'></i> التقارير</h1>
                        <p class="page-subtitle">إحصائيات وتقارير شاملة</p>
                    </div>
                    <div style="display:flex;gap:12px;">
                        <button class="btn-outline" onclick="Reports.exportAll()">
                            <i class='bx bx-download'></i> تصدير الكل
                        </button>
                        <button class="btn-primary" onclick="window.print()">
                            <i class='bx bx-printer'></i> طباعة التقرير
                        </button>
                    </div>
                </div>

                <!-- Summary Cards -->
                <div class="shipping-stats">
                    <div class="shipping-stat-card">
                        <div class="shipping-stat-icon" style="background:var(--primary-light);color:var(--primary);">
                            <i class='bx bx-cart'></i>
                        </div>
                        <div class="shipping-stat-content">
                            <div class="shipping-stat-value">${orders.length}</div>
                            <div class="shipping-stat-label">إجمالي الطلبات</div>
                        </div>
                    </div>
                    <div class="shipping-stat-card">
                        <div class="shipping-stat-icon" style="background:var(--success-light);color:var(--success);">
                            <i class='bx bx-wallet'></i>
                        </div>
                        <div class="shipping-stat-content">
                            <div class="shipping-stat-value">${Utils.formatCurrency(totalRevenue)}</div>
                            <div class="shipping-stat-label">إجمالي الإيرادات</div>
                        </div>
                    </div>
                    <div class="shipping-stat-card">
                        <div class="shipping-stat-icon" style="background:var(--info-light);color:var(--info);">
                            <i class='bx bx-calculator'></i>
                        </div>
                        <div class="shipping-stat-content">
                            <div class="shipping-stat-value">${Utils.formatCurrency(avgOrderValue)}</div>
                            <div class="shipping-stat-label">متوسط قيمة الطلب</div>
                        </div>
                    </div>
                    <div class="shipping-stat-card">
                        <div class="shipping-stat-icon" style="background:var(--purple-light);color:var(--purple);">
                            <i class='bx bx-truck'></i>
                        </div>
                        <div class="shipping-stat-content">
                            <div class="shipping-stat-value">${deliveredShipments}/${shipments.length}</div>
                            <div class="shipping-stat-label">شحنات تم تسليمها</div>
                        </div>
                    </div>
                </div>

                <!-- Reports Grid -->
                <div class="dashboard-grid">
                    <!-- Orders by Status -->
                    <div class="card dashboard-card">
                        <div class="card-header">
                            <h3><i class='bx bx-chart'></i> الطلبات حسب الحالة</h3>
                        </div>
                        <div class="card-body">
                            ${this.renderStatusChart(orders, 'status', [
                                { key: 'pending', label: 'معلق', color: 'warning' },
                                { key: 'processing', label: 'قيد المعالجة', color: 'info' },
                                { key: 'shipped', label: 'تم الشحن', color: 'purple' },
                                { key: 'delivered', label: 'تم التسليم', color: 'success' }
                            ])}
                        </div>
                    </div>

                    <!-- Shipments by Company -->
                    <div class="card dashboard-card">
                        <div class="card-header">
                            <h3><i class='bx bx-building-house'></i> الشحنات حسب الشركة</h3>
                        </div>
                        <div class="card-body">
                            ${this.renderCompanyChart(shipments)}
                        </div>
                    </div>

                    <!-- Revenue by Payment Method -->
                    <div class="card dashboard-card">
                        <div class="card-header">
                            <h3><i class='bx bx-credit-card'></i> الدفع حسب الطريقة</h3>
                        </div>
                        <div class="card-body">
                            ${this.renderPaymentChart(orders)}
                        </div>
                    </div>

                    <!-- Top Customers -->
                    <div class="card dashboard-card">
                        <div class="card-header">
                            <h3><i class='bx bx-user-pin'></i> أفضل العملاء</h3>
                        </div>
                        <div class="card-body">
                            ${this.renderTopCustomers(orders, customers)}
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    renderStatusChart(items, statusKey, statuses) {
        const data = statuses.map(s => ({
            ...s,
            count: items.filter(i => i[statusKey] === s.key).length
        }));

        const maxCount = Math.max(...data.map(d => d.count), 1);

        return `
            <div style="display:flex;flex-direction:column;gap:12px;">
                ${data.map(d => `
                    <div>
                        <div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:13px;">
                            <span>${d.label}</span>
                            <strong>${d.count}</strong>
                        </div>
                        <div style="height:24px;background:var(--bg-tertiary);border-radius:4px;overflow:hidden;">
                            <div style="
                                height:100%;width:${(d.count / maxCount) * 100}%;
                                background:var(--${d.color});border-radius:4px;
                                transition:width 0.5s ease;
                            "></div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    },

    renderCompanyChart(shipments) {
        const companies = {};
        shipments.forEach(s => {
            companies[s.companyName] = (companies[s.companyName] || 0) + 1;
        });

        const data = Object.entries(companies).map(([name, count]) => ({ name, count }));
        const maxCount = Math.max(...data.map(d => d.count), 1);

        if (data.length === 0) {
            return '<p style="text-align:center;color:var(--text-secondary);padding:40px;">لا توجد بيانات</p>';
        }

        return `
            <div style="display:flex;flex-direction:column;gap:16px;">
                ${data.map((d, i) => `
                    <div style="display:flex;align-items:center;gap:12px;">
                        <span style="font-size:20px;">${['📦','🚚','🛵','🏍️','🐪','⚡'][i % 6]}</span>
                        <div style="flex:1;">
                            <div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:13px;">
                                <span>${d.name || 'غير محدد'}</span>
                                <strong>${d.count}</strong>
                            </div>
                            <div style="height:20px;background:var(--bg-tertiary);border-radius:4px;overflow:hidden;">
                                <div style="
                                    height:100%;width:${(d.count / maxCount) * 100}%;
                                    background:linear-gradient(to left, var(--primary), var(--purple));
                                    border-radius:4px;
                                "></div>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    },

    renderPaymentChart(orders) {
        const methods = { cod: 0, card: 0, transfer: 0 };
        orders.forEach(o => { methods[o.paymentMethod || 'cod'] = (methods[o.paymentMethod || 'cod'] || 0) + (o.total || 0); });

        const total = Object.values(methods).reduce((a, b) => a + b, 0) || 1;

        return `
            <div style="text-align:center;padding:20px 0;">
                <div style="position:relative;width:160px;height:160px;margin:0 auto 20px;border-radius:50%;background:conic-gradient(
                    var(--primary) 0% ${(methods.cod/total)*100}%,
                    var(--success) ${(methods.cod/total)*100}% ${((methods.cod+methods.card)/total)*100}%,
                    var(--purple) ${((methods.cod+methods.card)/total)*100}% 100%
                );">
                    <div style="position:absolute;inset:15px;background:var(--bg-card);border-radius:50%;display:flex;align-items:center;justify-content:center;">
                        <div><strong style="font-size:18px;">${orders.length}</strong><br><small style="color:var(--text-secondary);">طلب</small></div>
                    </div>
                </div>
                <div style="display:flex;justify-content:center;gap:20px;flex-wrap:wrap;">
                    <div style="display:flex;align-items:center;gap:6px;"><span style="width:12px;height:12px;background:var(--primary);border-radius:2px;"></span> عند الاستلام (${Math.round((methods.cod/total)*100)}%)</div>
                    <div style="display:flex;align-items:center;gap:6px;"><span style="width:12px;height:12px;background:var(--success);border-radius:2px;"></span> بطاقة (${Math.round((methods.card/total)*100)}%)</div>
                    <div style="display:flex;align-items:center;gap:6px;"><span style="width:12px;height:12px;background:var(--purple);border-radius:2px;"></span> تحويل (${Math.round((methods.transfer/total)*100)}%)</div>
                </div>
            </div>
        `;
    },

    renderTopCustomers(orders, customers) {
        // Aggregate orders by customer phone
        const customerStats = {};
        orders.forEach(o => {
            if (!customerStats[o.phone]) {
                const c = customers.find(cust => cust.phone === o.phone);
                customerStats[o.phone] = { name: c?.name || o.customerName, orders: 0, total: 0 };
            }
            customerStats[o.phone].orders++;
            customerStats[o.phone].total += (o.total || 0);
        });

        const topCustomers = Object.values(customerStats)
            .sort((a, b) => b.total - a.total)
            .slice(0, 5);

        if (topCustomers.length === 0) {
            return '<p style="text-align:center;color:var(--text-secondary);padding:40px;">لا توجد بيانات</p>';
        }

        return `
            <table class="data-table">
                <thead><tr><th>#</th><th>العميل</th><th>الطلبات</th><th>إجمالي المشتريات</th></tr></thead>
                <tbody>
                    ${topCustomers.map((c, i) => `
                        <tr>
                            <td>${i + 1}</td>
                            <td><strong>${c.name || '-'}</strong></td>
                            <td>${c.orders}</td>
                            <td><strong>${Utils.formatCurrency(c.total)}</strong></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    },

    exportAll() {
        const data = {
            exportDate: new Date().toISOString(),
            orders: Utils.storage.get('orders', []),
            products: Utils.storage.get('products', []),
            customers: Utils.storage.get('customers', []),
            shipments: Utils.storage.get('shipments', [])
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `report_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        Toast.success('تم تصدير التقرير الكامل');
    }
};

window.Reports = Reports;
