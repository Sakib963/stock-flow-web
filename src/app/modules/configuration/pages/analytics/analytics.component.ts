import { Component, computed, inject, OnInit, signal, ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PageHeaderComponent } from '@app/shared/components/page-header/page-header.component';
import { NgZorroCustomModule } from '@app/shared/ng-zorro-custom.module';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ConfigurationService } from '@app/modules/configuration/services/configuration.service';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { Chart, ChartConfiguration, registerables } from 'chart.js';

// Register Chart.js components
Chart.register(...registerables);

interface AnalyticsMetrics {
    totalProducts: number;
    totalInventoryValue: number;
    totalStock: number;
    avgTurnoverRate: number;
}

interface ProductPerformance {
    oid: string;
    productName: string;
    sku: string;
    stock: number;
    minStock: number;
    value: number;
    totalPurchases: number;
    totalReturns: number;
    totalDisposed: number;
    turnoverRate: number;
}

interface StockMovement {
    date: string;
    type: 'Purchase' | 'Return' | 'Dispose' | 'Transfer';
    quantity: number;
    value: number;
    referenceType: string;
    referenceId: string;
    referenceNo: string;
    notes: string;
}

@Component({
    selector: 'app-analytics',
    standalone: true,
    imports: [CommonModule, FormsModule, PageHeaderComponent, NgZorroCustomModule],
    templateUrl: './analytics.component.html',
    styleUrl: './analytics.component.scss',
})
export class AnalyticsComponent implements OnInit, AfterViewInit {
    private readonly _route = inject(ActivatedRoute);
    private readonly _router = inject(Router);
    private readonly _configurationService = inject(ConfigurationService);
    private readonly _notificationService = inject(NzNotificationService);

    // Canvas references for charts
    @ViewChild('stockTrendCanvas') stockTrendCanvas!: ElementRef<HTMLCanvasElement>;
    @ViewChild('inventoryValueCanvas') inventoryValueCanvas!: ElementRef<HTMLCanvasElement>;
    @ViewChild('topProductsCanvas') topProductsCanvas!: ElementRef<HTMLCanvasElement>;

    // Chart instances
    private stockTrendChart?: Chart;
    private inventoryValueChart?: Chart;
    private topProductsChart?: Chart;

    // Query parameters from route
    filterType = signal<string>('all');
    entityId = signal<string | null>(null);
    entityName = signal<string>('');
    dateRange = signal<[Date, Date] | null>(null);

    // Data
    loading = signal<boolean>(false);
    metrics = signal<AnalyticsMetrics>({
        totalProducts: 0,
        totalInventoryValue: 0,
        totalStock: 0,
        avgTurnoverRate: 0,
    });
    productPerformance = signal<ProductPerformance[]>([]);
    stockMovements = signal<StockMovement[]>([]);

    // UI State
    pageIndex = signal<number>(1);
    pageSize = signal<number>(10);

    // Computed
    pageTitle = computed(() => {
        if (this.entityName()) {
            return `Analytics - ${this.entityName()}`;
        }
        return 'Analytics & Reports';
    });

    pageDescription = computed(() => {
        return 'View insights and trends for your inventory';
    });

    // Formatted metrics for display
    formattedAvgTurnoverRate = computed(() => {
        return parseFloat(this.metrics().avgTurnoverRate.toFixed(2));
    });

    // Filter options
    filterTypeOptions = [
        { label: 'Overall', value: 'all' },
        { label: 'Category', value: 'category' },
        { label: 'Sub Category', value: 'sub-category' },
        { label: 'Brand', value: 'brand' },
        { label: 'Supplier', value: 'supplier' },
        { label: 'Warehouse', value: 'warehouse' },
    ];

    ngOnInit(): void {
        // Read query parameters
        this._route.queryParams.subscribe((params) => {
            this.filterType.set(params['type'] || 'all');
            this.entityId.set(params['id'] || null);
            this.entityName.set(params['name'] || '');

            this.loadData();
        });
    }

    ngAfterViewInit(): void {
        // Initialize charts after view is ready
        setTimeout(() => this.initializeCharts(), 100);
    }

    ngOnDestroy(): void {
        // Cleanup charts
        this.stockTrendChart?.destroy();
        this.inventoryValueChart?.destroy();
        this.topProductsChart?.destroy();
    }

    loadData(): void {
        this.loading.set(true);

        // TODO: Replace with actual API call
        // Simulated data for now
        setTimeout(() => {
            this.metrics.set({
                totalProducts: 45,
                totalInventoryValue: 125000,
                totalStock: 2500,
                avgTurnoverRate: 75.5,
            });

            this.productPerformance.set([
                {
                    oid: '1',
                    productName: 'Product A',
                    sku: 'SKU-001',
                    stock: 150,
                    minStock: 50,
                    value: 37500,
                    totalPurchases: 500,
                    totalReturns: 10,
                    totalDisposed: 5,
                    turnoverRate: 85.5,
                },
                {
                    oid: '2',
                    productName: 'Product B',
                    sku: 'SKU-002',
                    stock: 5,
                    minStock: 10,
                    value: 16000,
                    totalPurchases: 200,
                    totalReturns: 5,
                    totalDisposed: 2,
                    turnoverRate: 45.2,
                },
            ]);

            this.stockMovements.set([
                {
                    date: '2026-01-23T10:30:00',
                    type: 'Purchase',
                    quantity: 100,
                    value: 25000,
                    referenceType: 'purchase-order',
                    referenceId: 'po-001',
                    referenceNo: 'PO-2026-001',
                    notes: 'Monthly stock replenishment',
                },
                {
                    date: '2026-01-22T14:15:00',
                    type: 'Return',
                    quantity: -5,
                    value: -1250,
                    referenceType: 'product-return',
                    referenceId: 'pr-001',
                    referenceNo: 'PR-2026-001',
                    notes: 'Defective items',
                },
            ]);

            this.loading.set(false);
        }, 500);
    }

    initializeCharts(): void {
        if (!this.stockTrendCanvas || !this.inventoryValueCanvas || !this.topProductsCanvas) {
            return;
        }

        // Stock Trend Chart (Line Chart)
        const stockTrendConfig: ChartConfiguration = {
            type: 'line',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                datasets: [
                    {
                        label: 'Stock Level',
                        data: [2200, 2350, 2100, 2400, 2500, 2450],
                        borderColor: '#1890ff',
                        backgroundColor: 'rgba(24, 144, 255, 0.1)',
                        fill: true,
                        tension: 0.4,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                    },
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        title: {
                            display: true,
                            text: 'Stock Units',
                        },
                    },
                },
            },
        };

        // Inventory Value Chart (Bar Chart)
        const inventoryValueConfig: ChartConfiguration = {
            type: 'bar',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                datasets: [
                    {
                        label: 'Inventory Value',
                        data: [110000, 118000, 105000, 120000, 125000, 122500],
                        backgroundColor: '#52c41a',
                        borderColor: '#52c41a',
                        borderWidth: 1,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context: any) {
                                const value = context.parsed?.y ?? 0;
                                return context.dataset.label + ': $' + value.toLocaleString();
                            },
                        },
                    },
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        title: {
                            display: true,
                            text: 'Value ($)',
                        },
                        ticks: {
                            callback: function (value: any) {
                                return '$' + value.toLocaleString();
                            },
                        },
                    },
                },
            },
        };

        // Top Products Chart (Pie Chart)
        const topProductsConfig: ChartConfiguration = {
            type: 'pie',
            data: {
                labels: ['Product A', 'Product B', 'Product C', 'Product D', 'Product E'],
                datasets: [
                    {
                        label: 'Stock',
                        data: [150, 120, 95, 80, 60],
                        backgroundColor: ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1'],
                        borderWidth: 2,
                        borderColor: '#fff',
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'left',
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context: any) {
                                const label = context.label || '';
                                const value = context.parsed || 0;
                                return label + ': ' + value + ' units';
                            },
                        },
                    },
                },
            },
        };

        // Create chart instances
        this.stockTrendChart = new Chart(this.stockTrendCanvas.nativeElement, stockTrendConfig);
        this.inventoryValueChart = new Chart(this.inventoryValueCanvas.nativeElement, inventoryValueConfig);
        this.topProductsChart = new Chart(this.topProductsCanvas.nativeElement, topProductsConfig);
    }

    getStockColor(stock: number, minStock: number): string {
        if (stock === 0) return 'error';
        if (stock < minStock) return 'warning';
        return 'success';
    }

    getTurnoverStatus(rate: number): 'success' | 'exception' | 'normal' {
        if (rate >= 70) return 'success';
        if (rate < 50) return 'exception';
        return 'normal';
    }

    getMovementColor(type: string): string {
        const colors: Record<string, string> = {
            Purchase: 'success',
            Return: 'warning',
            Dispose: 'error',
            Transfer: 'processing',
        };
        return colors[type] || 'default';
    }

    viewProduct(productId: string): void {
        this._router.navigate(['/configuration/product/view', productId]);
    }

    viewReference(type: string, id: string): void {
        const routes: Record<string, string> = {
            'purchase-order': '/manager/inventory/purchase-order/view',
            'product-return': '/manager/inventory/product-return/view',
            'product-dispose': '/manager/inventory/product-dispose/view',
        };
        const route = routes[type];
        if (route) {
            this._router.navigate([route, id]);
        }
    }

    exportReport(): void {
        this._notificationService.info('Export Report', 'Exporting analytics report...');
        // TODO: Implement Excel/PDF export
    }

    setDateRange(range: 'today' | 'week' | 'month' | 'year'): void {
        const now = new Date();
        const start = new Date();

        switch (range) {
            case 'today':
                start.setHours(0, 0, 0, 0);
                break;
            case 'week':
                start.setDate(now.getDate() - 7);
                break;
            case 'month':
                start.setMonth(now.getMonth() - 1);
                break;
            case 'year':
                start.setFullYear(now.getFullYear() - 1);
                break;
        }

        this.dateRange.set([start, now]);
        this.loadData();
    }

    onDateChange(): void {
        this.loadData();
    }

    onFilterTypeChange(): void {
        this._router.navigate([], {
            relativeTo: this._route,
            queryParams: {
                type: this.filterType(),
                id: null,
                name: null,
            },
            queryParamsHandling: 'merge',
        });
    }
}
