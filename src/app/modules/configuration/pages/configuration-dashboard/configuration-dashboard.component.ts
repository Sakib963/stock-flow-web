import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NgZorroCustomModule } from '@app/shared/ng-zorro-custom.module';
import { PageHeaderComponent } from '@app/shared/components/page-header/page-header.component';
import { getBreadcrumbsByKey } from '@app/core/config/breadcrumb.registry';
import { LoaderComponent } from '@app/shared/components/loader/loader.component';
import { ConfigurationService } from '@app/modules/configuration/services/configuration.service';
import { finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NzNotificationService } from 'ng-zorro-antd/notification';

interface StatCard {
    title: string;
    count: number;
    icon: string;
    color: string;
    trend?: {
        value: number;
        isPositive: boolean;
    };
    route: string;
}

interface QuickAction {
    label: string;
    icon: string;
    route: string;
    color: string;
}

interface RecentActivity {
    title: string;
    description: string;
    time: string;
    icon: string;
    type: 'create' | 'update' | 'delete';
}

interface StatSummary {
    active_categories: number;
    active_sub_categories: number;
    active_brands: number;
    active_suppliers: number;
    active_products: number;
    active_warehouses: number;
    active_aisles: number;
    total_skus: number;
}

interface DataQualitySummary {
    total: number;
    products_with_images: number;
    missing_images: number;
    products_with_brands: number;
    missing_brands: number;
    complete_product_data: number;
}

interface InsightSummary {
    avg_products_per_category: number;
    avg_sub_categories_per_category: number;
    products_per_supplier: number;
    avg_aisles_per_warehouse: number;
    products_per_warehouse: number;
    avg_products_per_brand: number;
    brands_with_10_plus_products: number;
}

interface StatusOverview {
    active_items: number;
    inactive_items: number;
}

interface ProductiveCategory {
    name: string;
    products: number;
    sub_categories: number;
    percent: number;
}

@Component({
    selector: 'app-configuration-dashboard',
    standalone: true,
    imports: [CommonModule, RouterModule, NgZorroCustomModule, PageHeaderComponent, LoaderComponent],
    templateUrl: './configuration-dashboard.component.html',
    styleUrls: ['./configuration-dashboard.component.scss'],
})
export class ConfigurationDashboardComponent implements OnInit {
    private readonly _configurationService = inject(ConfigurationService);
    private readonly _destroyRef = inject(DestroyRef);
    private readonly _notificationService = inject(NzNotificationService);

    breadcrumbs = getBreadcrumbsByKey('configuration.dashboard.main');

    loading = signal(true);
    usingFallback = signal(false);

    statsCards = signal<StatCard[]>([]);
    quickActions = signal<QuickAction[]>([]);
    recentActivities = signal<RecentActivity[]>([]);

    statSummary = signal<StatSummary>({
        active_categories: 0,
        active_sub_categories: 0,
        active_brands: 0,
        active_suppliers: 0,
        active_products: 0,
        active_warehouses: 0,
        active_aisles: 0,
        total_skus: 0,
    });

    dataQuality = signal<DataQualitySummary>({
        total: 0,
        products_with_images: 0,
        missing_images: 0,
        products_with_brands: 0,
        missing_brands: 0,
        complete_product_data: 0,
    });

    insights = signal<InsightSummary>({
        avg_products_per_category: 0,
        avg_sub_categories_per_category: 0,
        products_per_supplier: 0,
        avg_aisles_per_warehouse: 0,
        products_per_warehouse: 0,
        avg_products_per_brand: 0,
        brands_with_10_plus_products: 0,
    });

    statusOverview = signal<StatusOverview>({
        active_items: 0,
        inactive_items: 0,
    });

    productiveCategories = signal<ProductiveCategory[]>([]);
    categoryDistribution = signal<any[]>([]);
    suppliersByRegion = signal<any[]>([]);

    ngOnInit(): void {
        this.loadQuickActions();
        this.loadDashboardData();
    }

    private loadDashboardData(): void {
        this.loading.set(true);
        this.usingFallback.set(false);

        this._configurationService
            .getConfigurationDashboardSummary$({})
            .pipe(
                takeUntilDestroyed(this._destroyRef),
                finalize(() => this.loading.set(false))
            )
            .subscribe({
                next: (response: any) => {
                    if (response?.body?.code === 200 && response?.body?.data) {
                        this.applyDashboardData(response.body.data);
                        return;
                    }

                    this._notificationService.warning('Configuration Dashboard', response?.body?.message || 'Dashboard response is incomplete. Showing fallback data.');
                    this.loadFallbackData();
                },
                error: (error: any) => {
                    this._notificationService.error('Configuration Dashboard', error?.error?.message || 'Unable to load dashboard data. Showing fallback data.');
                    this.loadFallbackData();
                },
            });
    }

    private applyDashboardData(data: any): void {
        this.statSummary.set({
            active_categories: Number(data?.stat_cards?.active_categories) || 0,
            active_sub_categories: Number(data?.stat_cards?.active_sub_categories) || 0,
            active_brands: Number(data?.stat_cards?.active_brands) || 0,
            active_suppliers: Number(data?.stat_cards?.active_suppliers) || 0,
            active_products: Number(data?.stat_cards?.active_products) || 0,
            active_warehouses: Number(data?.stat_cards?.active_warehouses) || 0,
            active_aisles: Number(data?.stat_cards?.active_aisles) || 0,
            total_skus: Number(data?.stat_cards?.total_skus) || 0,
        });

        this.dataQuality.set({
            total: Number(data?.data_quality?.total) || 0,
            products_with_images: Number(data?.data_quality?.products_with_images) || 0,
            missing_images: Number(data?.data_quality?.missing_images) || 0,
            products_with_brands: Number(data?.data_quality?.products_with_brands) || 0,
            missing_brands: Number(data?.data_quality?.missing_brands) || 0,
            complete_product_data: Number(data?.data_quality?.complete_product_data) || 0,
        });

        this.insights.set({
            avg_products_per_category: Number(data?.insights?.avg_products_per_category) || 0,
            avg_sub_categories_per_category: Number(data?.insights?.avg_sub_categories_per_category) || 0,
            products_per_supplier: Number(data?.insights?.products_per_supplier) || 0,
            avg_aisles_per_warehouse: Number(data?.insights?.avg_aisles_per_warehouse) || 0,
            products_per_warehouse: Number(data?.insights?.products_per_warehouse) || 0,
            avg_products_per_brand: Number(data?.insights?.avg_products_per_brand) || 0,
            brands_with_10_plus_products: Number(data?.insights?.brands_with_10_plus_products) || 0,
        });

        this.statusOverview.set({
            active_items: Number(data?.status_overview?.active_items) || 0,
            inactive_items: Number(data?.status_overview?.inactive_items) || 0,
        });

        this.productiveCategories.set(Array.isArray(data?.productive_categories) ? data.productive_categories : []);

        this.mapStatCards();
        this.mapRecentActivities(Array.isArray(data?.recent_activities) ? data.recent_activities : []);
        this.mapChartData(Array.isArray(data?.category_distribution) ? data.category_distribution : [], Array.isArray(data?.top_suppliers) ? data.top_suppliers : []);
    }

    private mapStatCards(): void {
        const stats = this.statSummary();

        this.statsCards.set([
            {
                title: 'Active Categories',
                count: stats.active_categories,
                icon: 'appstore',
                color: '#594ED1',
                route: '/configuration/category/list',
            },
            {
                title: 'Sub Categories',
                count: stats.active_sub_categories,
                icon: 'block',
                color: '#7E75E5',
                route: '/configuration/sub-category/list',
            },
            {
                title: 'Active Brands',
                count: stats.active_brands,
                icon: 'flag',
                color: '#52C41A',
                route: '/configuration/brands/list',
            },
            {
                title: 'Active Suppliers',
                count: stats.active_suppliers,
                icon: 'team',
                color: '#1890FF',
                route: '/configuration/supplier/list',
            },
            {
                title: 'Active Products',
                count: stats.active_products,
                icon: 'shopping',
                color: '#FA8C16',
                route: '/configuration/product/list',
            },
            {
                title: 'Warehouses',
                count: stats.active_warehouses,
                icon: 'home',
                color: '#13C2C2',
                route: '/configuration/warehouse/list',
            },
            {
                title: 'Aisles/Zones',
                count: stats.active_aisles,
                icon: 'apartment',
                color: '#EB2F96',
                route: '/configuration/aisle/list',
            },
            {
                title: 'Total SKUs',
                count: stats.total_skus,
                icon: 'barcode',
                color: '#722ED1',
                route: '/configuration/product/list',
            },
        ]);
    }

    /**
     * Load quick action buttons
     */
    private loadQuickActions(): void {
        this.quickActions.set([
            {
                label: 'Add Category',
                icon: 'appstore', // from menu: assets/icons/category.svg
                route: '/configuration/category/create',
                color: 'primary',
            },
            {
                label: 'Add Sub Category',
                icon: 'block', // from menu: assets/icons/sub_category.svg
                route: '/configuration/sub-category/create',
                color: 'primary',
            },
            {
                label: 'Add Brand',
                icon: 'flag', // from menu: assets/icons/brands.svg
                route: '/configuration/brands/create',
                color: 'primary',
            },
            {
                label: 'Add Supplier',
                icon: 'team', // from menu: assets/icons/source.svg
                route: '/configuration/supplier/create',
                color: 'primary',
            },
            {
                label: 'Add Product',
                icon: 'shopping', // from menu: assets/icons/product.svg
                route: '/configuration/product/create',
                color: 'primary',
            },
            {
                label: 'Add Warehouse',
                icon: 'home', // from menu: assets/icons/warehouse.svg
                route: '/configuration/warehouse/create',
                color: 'primary',
            },
            {
                label: 'Add Aisle/Zone',
                icon: 'apartment', // from menu: assets/icons/shelf.svg
                route: '/configuration/aisle/create',
                color: 'primary',
            },
        ]);
    }

    private mapRecentActivities(activities: any[]): void {
        this.recentActivities.set(
            activities.map((activity: any) => {
                const activityType = this.mapActivityType(activity?.reference_type);

                return {
                    title: activity?.title || 'Activity',
                    description: activity?.description || 'No additional details available',
                    time: this.formatRelativeTime(activity?.performed_on),
                    icon: activityType === 'update' ? 'edit' : activityType === 'delete' ? 'delete' : 'check-circle',
                    type: activityType,
                };
            })
        );
    }

    private mapChartData(categoryDistribution: any[], topSuppliers: any[]): void {
        this.categoryDistribution.set(
            categoryDistribution.map((item: any) => ({
                name: item?.name || 'N/A',
                value: Number(item?.percent) || 0,
            }))
        );

        this.suppliersByRegion.set(
            topSuppliers.map((item: any) => ({
                name: item?.name || 'N/A',
                value: Number(item?.value) || 0,
            }))
        );
    }

    private loadFallbackData(): void {
        this.usingFallback.set(true);

        this.statSummary.set({
            active_categories: 46,
            active_sub_categories: 148,
            active_brands: 82,
            active_suppliers: 31,
            active_products: 487,
            active_warehouses: 12,
            active_aisles: 87,
            total_skus: 487,
        });

        this.dataQuality.set({
            total: 487,
            products_with_images: 463,
            missing_images: 24,
            products_with_brands: 451,
            missing_brands: 36,
            complete_product_data: 425,
        });

        this.insights.set({
            avg_products_per_category: 10.6,
            avg_sub_categories_per_category: 3.2,
            products_per_supplier: 15.7,
            avg_aisles_per_warehouse: 7.3,
            products_per_warehouse: 40.6,
            avg_products_per_brand: 5.9,
            brands_with_10_plus_products: 15,
        });

        this.statusOverview.set({
            active_items: 855,
            inactive_items: 15,
        });

        this.productiveCategories.set([
            { name: 'Electronics & Gadgets', products: 142, sub_categories: 12, percent: 29 },
            { name: 'Clothing & Apparel', products: 98, sub_categories: 8, percent: 20 },
            { name: 'Food & Beverage', products: 87, sub_categories: 15, percent: 18 },
            { name: 'Home & Kitchen', products: 76, sub_categories: 10, percent: 16 },
        ]);

        this.mapStatCards();
        this.mapRecentActivities([
            {
                title: 'Category Created',
                description: 'Electronics & Gadgets category added by John Doe',
                performed_on: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
                reference_type: 'create',
            },
            {
                title: 'Product Updated',
                description: 'Samsung Galaxy S24 - SKU and pricing updated by Sarah Smith',
                performed_on: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
                reference_type: 'update',
            },
            {
                title: 'Supplier Added',
                description: 'Tech Wholesale Inc. registered as supplier by Admin',
                performed_on: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
                reference_type: 'create',
            },
            {
                title: 'Brand Updated',
                description: 'Apple brand description and logo updated by Manager',
                performed_on: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
                reference_type: 'update',
            },
            {
                title: 'Warehouse Created',
                description: 'Warehouse-WH-004 added in North Region by Admin',
                performed_on: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
                reference_type: 'create',
            },
        ]);
        this.mapChartData(
            [
                { name: 'Electronics & Gadgets', percent: 29 },
                { name: 'Clothing & Apparel', percent: 20 },
                { name: 'Food & Beverage', percent: 18 },
                { name: 'Home & Kitchen', percent: 16 },
                { name: 'Health & Beauty', percent: 11 },
                { name: 'Sports & Outdoors', percent: 6 },
            ],
            [
                { name: 'Tech Wholesale Inc.', value: 142 },
                { name: 'Global Distributors Ltd.', value: 98 },
                { name: 'Premium Suppliers Co.', value: 87 },
                { name: 'Direct Import Partners', value: 60 },
                { name: 'Local Vendors Group', value: 45 },
            ]
        );
    }

    private mapActivityType(value: string): 'create' | 'update' | 'delete' {
        const normalized = (value || '').toLowerCase();

        if (normalized.includes('delete') || normalized.includes('remove')) {
            return 'delete';
        }

        if (normalized.includes('update') || normalized.includes('edit')) {
            return 'update';
        }

        return 'create';
    }

    private formatRelativeTime(value: string): string {
        if (!value) {
            return 'just now';
        }

        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return 'just now';
        }

        const diffInMs = Date.now() - date.getTime();
        const diffInMinutes = Math.floor(diffInMs / (1000 * 60));

        if (diffInMinutes < 1) {
            return 'just now';
        }

        if (diffInMinutes < 60) {
            return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
        }

        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) {
            return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
        }

        const diffInDays = Math.floor(diffInHours / 24);
        return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    }

    getDataQualityPercent(numerator: number): number {
        const total = this.dataQuality().total;

        if (!total) {
            return 0;
        }

        return Math.round((numerator / total) * 100);
    }

    getProductsTotalForSupplierBar(): number {
        return this.statSummary().active_products || 1;
    }

    /**
     * Get icon color class based on activity type
     */
    getActivityIconColor(type: 'create' | 'update' | 'delete'): string {
        switch (type) {
            case 'create':
                return 'text-green-500';
            case 'update':
                return 'text-blue-500';
            case 'delete':
                return 'text-red-500';
            default:
                return 'text-gray-500';
        }
    }

    /**
     * Calculate percentage for progress bars
     */
    getPercentage(value: number, total: number): number {
        if (!total) {
            return 0;
        }

        return Math.round((value / total) * 100);
    }
}
