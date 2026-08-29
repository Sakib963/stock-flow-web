import { Component, computed, inject, OnInit, signal, ViewChild, ElementRef, AfterViewInit, OnDestroy, DestroyRef } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { PageHeaderComponent } from '@app/shared/components/page-header/page-header.component';
import { NgZorroCustomModule } from '@app/shared/ng-zorro-custom.module';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ConfigurationService } from '@app/modules/configuration/services/configuration.service';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { forkJoin, finalize } from 'rxjs';
import { LoaderComponent } from '@app/shared/components/loader/loader.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslateService } from '@ngx-translate/core';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { NzTableQueryParams } from 'ng-zorro-antd/table';
import { CurrencyFormatPipe } from '@app/shared/pipe/currency-format.pipe';

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

interface StockDistributionSegment {
    label: string;
    value: number;
}

@Component({
    selector: 'app-analytics',
    standalone: true,
    imports: [CommonModule, FormsModule, PageHeaderComponent, NgZorroCustomModule, LoaderComponent, CurrencyFormatPipe],
    templateUrl: './analytics.component.html',
    styleUrl: './analytics.component.scss',
})
export class AnalyticsComponent implements OnInit, AfterViewInit, OnDestroy {
    private readonly _route = inject(ActivatedRoute);
    private readonly _router = inject(Router);
    private readonly _location = inject(Location);
    private readonly _destroyRef = inject(DestroyRef);
    private readonly _configurationService = inject(ConfigurationService);
    private readonly _notificationService = inject(NzNotificationService);
    private readonly _translateService = inject(TranslateService);

    // Canvas references for charts
    @ViewChild('stockTrendCanvas') stockTrendCanvas!: ElementRef<HTMLCanvasElement>;
    @ViewChild('inventoryValueCanvas') inventoryValueCanvas!: ElementRef<HTMLCanvasElement>;
    @ViewChild('topProductsCanvas') topProductsCanvas!: ElementRef<HTMLCanvasElement>;
    @ViewChild('stockDistributionCanvas') stockDistributionCanvas!: ElementRef<HTMLCanvasElement>;

    // Chart instances
    private stockTrendChart?: Chart;
    private inventoryValueChart?: Chart;
    private topProductsChart?: Chart;
    private stockDistributionChart?: Chart;

    // Store chart data until charts are initialized
    private pendingChartData?: {
        stockTrend: any[];
        valueTrend: any[];
        topProducts: any[];
        distribution: StockDistributionSegment[];
    };

    // Query parameters from route
    filterType = signal<string>('all');
    entityId = signal<string | null>(null);
    entityName = signal<string>('');
    dateRange = signal<[Date, Date] | null>(null);

    // Data
    pageLoading = signal<boolean>(false); // Initial page load
    tableLoading = signal<boolean>(false); // Table data refresh
    metrics = signal<AnalyticsMetrics>({
        totalProducts: 0,
        totalInventoryValue: 0,
        totalStock: 0,
        avgTurnoverRate: 0,
    });
    productPerformance = signal<ProductPerformance[]>([]);
    stockMovements = signal<StockMovement[]>([]);
    stockDistributionData = signal<StockDistributionSegment[]>([]);
    productPerformanceTotal = signal<number>(0);

    // UI State
    pageIndex = signal<number>(1);
    pageSize = signal<number>(10);
    exportLoading = signal<boolean>(false);

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

    ngOnInit(): void {
        // Read query parameters
        this._route.queryParams.subscribe((params) => {
            this.filterType.set(params['type'] || 'all');
            this.entityId.set(params['id'] || null);
            this.entityName.set(params['name'] || '');

            this.loadData(true); // Initial load
        });
    }

    ngAfterViewInit(): void {
        // Charts are initialized after initial data load.
    }

    ngOnDestroy(): void {
        // Cleanup charts
        this.stockTrendChart?.destroy();
        this.inventoryValueChart?.destroy();
        this.topProductsChart?.destroy();
        this.stockDistributionChart?.destroy();
    }

    loadData(isInitialLoad: boolean = false): void {
        // Set appropriate loading state
        if (isInitialLoad) {
            this.pageLoading.set(true);
        } else {
            this.tableLoading.set(true);
        }

        const params = {
            type: this.filterType(),
            id: this.entityId(),
            dateFrom: this.dateRange()?.[0]?.toISOString().split('T')[0],
            dateTo: this.dateRange()?.[1]?.toISOString().split('T')[0],
            page: this.pageIndex(),
            pageSize: this.pageSize(),
        };

        // Load all analytics data in parallel
        forkJoin({
            metrics: this._configurationService.getAnalyticsMetrics$(params),
            stockTrend: this._configurationService.getStockTrend$(params),
            valueTrend: this._configurationService.getInventoryValueTrend$(params),
            topProducts: this._configurationService.getTopProducts$(params),
            performance: this._configurationService.getProductPerformance$(params),
            movements: this._configurationService.getStockMovements$(params),
        })
            .pipe(
                finalize(() => {
                    this.pageLoading.set(false);
                    this.tableLoading.set(false);

                    // Initialize charts after loading completes and canvas elements are rendered
                    if (isInitialLoad) {
                        setTimeout(() => {
                            this.initializeChartsIfNeeded();
                        }, 100);
                    }
                })
            )
            .subscribe({
                next: (data) => {
                    // Update metrics cards
                    if (data.metrics.body?.data) {
                        this.metrics.set(data.metrics.body.data);
                    }

                    // Update tables
                    const performanceItems = data.performance.body?.data?.items || [];
                    const performanceTotal = data.performance.body?.data?.total || performanceItems.length;
                    if (performanceItems.length) {
                        this.productPerformance.set(performanceItems);
                        this.productPerformanceTotal.set(performanceTotal);
                    } else {
                        this.productPerformance.set([]);
                        this.productPerformanceTotal.set(0);
                    }

                    const distributionSegments = this.buildStockDistributionSegments(performanceItems);
                    this.stockDistributionData.set(distributionSegments);

                    if (data.movements.body?.data?.items) {
                        this.stockMovements.set(data.movements.body.data.items);
                    }

                    // Update charts with real data
                    const stockTrendData = data.stockTrend.body?.data || [];
                    const valueTrendData = data.valueTrend.body?.data || [];
                    const topProductsData = data.topProducts.body?.data || [];
                    const distributionData = distributionSegments;

                    this.updateCharts(stockTrendData, valueTrendData, topProductsData, distributionData);
                },
                error: (err) => {
                    this._notificationService.error('Analytics', 'Failed to load analytics data: ' + (err.error?.message || err.message));
                },
            });
    }

    initializeChartsIfNeeded(): void {
        // If charts already exist, just apply pending data if any
        if (this.stockTrendChart && this.inventoryValueChart && this.topProductsChart && this.stockDistributionChart) {
            if (this.pendingChartData) {
                this.updateCharts(this.pendingChartData.stockTrend, this.pendingChartData.valueTrend, this.pendingChartData.topProducts, this.pendingChartData.distribution);
                this.pendingChartData = undefined;
            }
            return;
        }

        // Try to initialize charts
        this.initializeCharts();

        // After initialization, apply pending data if any
        if (this.pendingChartData && this.stockTrendChart && this.inventoryValueChart && this.topProductsChart && this.stockDistributionChart) {
            this.updateCharts(this.pendingChartData.stockTrend, this.pendingChartData.valueTrend, this.pendingChartData.topProducts, this.pendingChartData.distribution);
            this.pendingChartData = undefined;
        }
    }

    initializeCharts(): void {
        if (!this.stockTrendCanvas || !this.inventoryValueCanvas || !this.topProductsCanvas || !this.stockDistributionCanvas) {
            return;
        }

        // Stock Trend Chart (Line Chart)
        const stockTrendConfig: ChartConfiguration<'line'> = {
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
        const inventoryValueConfig: ChartConfiguration<'bar'> = {
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
        const topProductsConfig: ChartConfiguration<'pie'> = {
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
                        position: 'bottom',
                        labels: {
                            boxWidth: 10,
                            padding: 10,
                            font: {
                                size: 10,
                            },
                        },
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

        const distributionConfig: ChartConfiguration<'doughnut'> = {
            type: 'doughnut',
            data: {
                labels: [],
                datasets: [
                    {
                        data: [],
                        backgroundColor: ['#3f51b5', '#00bcd4', '#ff9800', '#4caf50', '#f44336', '#9c27b0'],
                        borderColor: '#fff',
                        borderWidth: 2,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            boxWidth: 10,
                            padding: 10,
                            font: {
                                size: 10,
                            },
                        },
                    },
                },
                cutout: '55%',
            },
        };

        // Create chart instances
        this.stockTrendChart = new Chart(this.stockTrendCanvas.nativeElement, stockTrendConfig);
        this.inventoryValueChart = new Chart(this.inventoryValueCanvas.nativeElement, inventoryValueConfig);
        this.topProductsChart = new Chart(this.topProductsCanvas.nativeElement, topProductsConfig);
        this.stockDistributionChart = new Chart(this.stockDistributionCanvas.nativeElement, distributionConfig);
    }

    updateCharts(stockTrendData: any[], valueTrendData: any[], topProductsData: any[], distributionData: StockDistributionSegment[]): void {
        // If charts are not initialized yet, store data for later
        if (!this.stockTrendChart || !this.inventoryValueChart || !this.topProductsChart || !this.stockDistributionChart) {
            this.pendingChartData = {
                stockTrend: stockTrendData,
                valueTrend: valueTrendData,
                topProducts: topProductsData,
                distribution: distributionData,
            };
            return;
        }

        // Update Stock Trend Line Chart
        if (this.stockTrendChart) {
            if (stockTrendData.length > 0) {
                this.stockTrendChart.data.labels = stockTrendData.map((d) => d.period);
                this.stockTrendChart.data.datasets[0].data = stockTrendData.map((d) => d.stock);
                this.stockTrendChart.update();
            } else {
                // Clear chart to show no data
                this.stockTrendChart.data.labels = [];
                this.stockTrendChart.data.datasets[0].data = [];
                this.stockTrendChart.update();
            }
        }

        // Update Inventory Value Bar Chart
        if (this.inventoryValueChart) {
            if (valueTrendData.length > 0) {
                this.inventoryValueChart.data.labels = valueTrendData.map((d) => d.period);
                this.inventoryValueChart.data.datasets[0].data = valueTrendData.map((d) => d.value);
                this.inventoryValueChart.update();
            } else {
                // Clear chart to show no data
                this.inventoryValueChart.data.labels = [];
                this.inventoryValueChart.data.datasets[0].data = [];
                this.inventoryValueChart.update();
            }
        }

        // Update Top Products Pie Chart
        if (this.topProductsChart) {
            if (topProductsData.length > 0) {
                this.topProductsChart.data.labels = topProductsData.map((d) => d.productName);
                this.topProductsChart.data.datasets[0].data = topProductsData.map((d) => d.stock);
                this.topProductsChart.update();
            } else {
                // Clear chart to show no data
                this.topProductsChart.data.labels = [];
                this.topProductsChart.data.datasets[0].data = [];
                this.topProductsChart.update();
            }
        }

        if (this.stockDistributionChart) {
            this.stockDistributionChart.data.labels = distributionData.map((segment) => segment.label);
            this.stockDistributionChart.data.datasets[0].data = distributionData.map((segment) => segment.value);
            this.stockDistributionChart.update();
        }
    }

    private buildStockDistributionSegments(items: ProductPerformance[]): StockDistributionSegment[] {
        if (!items || !items.length) {
            return [];
        }

        const sorted = [...items].filter((item) => item.stock > 0).sort((a, b) => b.stock - a.stock);
        const topFive = sorted.slice(0, 5);
        const othersTotal = sorted.slice(5).reduce((sum, item) => sum + item.stock, 0);

        const segments: StockDistributionSegment[] = topFive.map((item) => ({
            label: item.productName || 'Unnamed',
            value: item.stock,
        }));

        if (othersTotal > 0) {
            segments.push({ label: 'Others', value: othersTotal });
        }

        return segments;
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
            'purchase-order': '/inventory/purchase-order',
            'product-return': '/sales/returns/view',
            'product-dispose': '/inventory/product-dispose',
        };
        const route = routes[type];
        if (route) {
            this._router.navigate([route, id]);
        }
    }

    navigateBack(): void {
        this._location.back();
    }

    exportReport(): void {
        const params = {
            type: this.filterType(),
            id: this.entityId(),
            name: this.entityName(),
            dateFrom: this.dateRange()?.[0]?.toISOString().split('T')[0],
            dateTo: this.dateRange()?.[1]?.toISOString().split('T')[0],
        };

        this.exportLoading.set(true);
        this._configurationService
            .downloadReport$(APIEndpoint.EXPORT_ANALYTICS_REPORT, params)
            .pipe(
                takeUntilDestroyed(this._destroyRef),
                finalize(() => this.exportLoading.set(false))
            )
            .subscribe({
                next: (res: any) => {
                    const blob: Blob = res.body;
                    if (!blob) {
                        this._notificationService.info(this._translateService.instant('common.notification.title.info'), this._translateService.instant('common.notification.no_data_found'));
                        return;
                    }

                    const fileName = res.headers.get('X-Filename') || `analytics_report_${Date.now()}.xlsx`;

                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = fileName;
                    a.click();
                    window.URL.revokeObjectURL(url);
                },
                error: (err: any) => {
                    if (err.status === 404) {
                        this._notificationService.warning(this._translateService.instant('common.notification.title.warning'), this._translateService.instant('common.notification.no_content_found_for_report'));
                        return;
                    }
                    this._notificationService.error(this._translateService.instant('common.notification.title.error'), this._translateService.instant('common.notification.something_went_wrong'));
                },
            });
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
        this.loadData(false);
    }

    onDateChange(): void {
        this.pageIndex.set(1);
        this.loadData(false);
    }

    onPerformanceQueryParamsChange(params: NzTableQueryParams): void {
        const { pageIndex, pageSize } = params;
        if (pageIndex === this.pageIndex() && pageSize === this.pageSize()) {
            return;
        }

        this.pageIndex.set(pageIndex);
        this.pageSize.set(pageSize);
        this.loadData(false);
    }
}
