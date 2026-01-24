import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PageHeaderComponent } from '@app/shared/components/page-header/page-header.component';
import { NgZorroCustomModule } from '@app/shared/ng-zorro-custom.module';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ConfigurationService } from '@app/modules/configuration/services/configuration.service';
import { NzNotificationService } from 'ng-zorro-antd/notification';

interface AlertProduct {
    oid: string;
    name: string;
    sku: string;
    category: string;
    categoryId: string;
    subCategory?: string;
    brand?: string;
    warehouse: string;
    warehouseId: string;
    stock: number;
    minStock: number;
    price: number;
    value: number;
    nearestExpiry: string | null;
    status: 'Active' | 'Inactive';
}

interface AlertStats {
    lowStockCount: number;
    outOfStockCount: number;
    expiringCount: number;
    totalValue: number;
}

@Component({
    selector: 'app-alerts',
    standalone: true,
    imports: [CommonModule, FormsModule, PageHeaderComponent, NgZorroCustomModule],
    templateUrl: './alerts.component.html',
    styleUrl: './alerts.component.scss',
})
export class AlertsComponent implements OnInit {
    private readonly _route = inject(ActivatedRoute);
    private readonly _router = inject(Router);
    private readonly _configurationService = inject(ConfigurationService);
    private readonly _notificationService = inject(NzNotificationService);

    // Query parameters from route
    filterType = signal<string>('all');
    entityId = signal<string | null>(null);
    entityName = signal<string>('');
    alertType = signal<string>('all');

    // Data
    loading = signal<boolean>(false);
    products = signal<AlertProduct[]>([]);
    stats = signal<AlertStats>({
        lowStockCount: 0,
        outOfStockCount: 0,
        expiringCount: 0,
        totalValue: 0,
    });

    // UI State
    searchTerm = signal<string>('');
    pageIndex = signal<number>(1);
    pageSize = signal<number>(10);

    // Computed
    pageTitle = computed(() => {
        if (this.entityName()) {
            return `Alerts & Low Stock - ${this.entityName()}`;
        }
        return 'Alerts & Low Stock';
    });

    pageDescription = computed(() => {
        return 'Monitor stock levels and alerts across your inventory';
    });

    filteredProducts = computed(() => {
        const search = this.searchTerm().toLowerCase();
        const alert = this.alertType();
        let filtered = this.products();

        // Filter by search term
        if (search) {
            filtered = filtered.filter((p) => p.name.toLowerCase().includes(search) || p.sku.toLowerCase().includes(search));
        }

        // Filter by alert type
        if (alert === 'low-stock') {
            filtered = filtered.filter((p) => p.stock > 0 && p.stock < p.minStock);
        } else if (alert === 'out-of-stock') {
            filtered = filtered.filter((p) => p.stock === 0);
        } else if (alert === 'expiring') {
            filtered = filtered.filter((p) => p.nearestExpiry !== null);
        }

        return filtered;
    });

    // Filter options
    filterTypeOptions = [
        { label: 'All Products', value: 'all' },
        { label: 'Category', value: 'category' },
        { label: 'Sub Category', value: 'sub-category' },
        { label: 'Brand', value: 'brand' },
        { label: 'Supplier', value: 'supplier' },
        { label: 'Warehouse', value: 'warehouse' },
    ];

    alertTypeOptions = [
        { label: 'All Alerts', value: 'all' },
        { label: 'Low Stock', value: 'low-stock' },
        { label: 'Out of Stock', value: 'out-of-stock' },
        { label: 'Expiring Soon', value: 'expiring' },
    ];

    ngOnInit(): void {
        // Read query parameters
        this._route.queryParams.subscribe((params) => {
            this.filterType.set(params['type'] || 'all');
            this.entityId.set(params['id'] || null);
            this.entityName.set(params['name'] || '');
            this.alertType.set(params['alert'] || 'all');

            this.loadData();
        });
    }

    loadData(): void {
        this.loading.set(true);

        // TODO: Replace with actual API call
        // Simulated data for now
        setTimeout(() => {
            this.products.set([
                {
                    oid: '1',
                    name: 'Product A',
                    sku: 'SKU-001',
                    category: 'Electronics',
                    categoryId: '1',
                    warehouse: 'Main Warehouse',
                    warehouseId: 'w1',
                    stock: 5,
                    minStock: 10,
                    price: 2500,
                    value: 12500,
                    nearestExpiry: null,
                    status: 'Active',
                },
                {
                    oid: '2',
                    name: 'Product B',
                    sku: 'SKU-002',
                    category: 'Electronics',
                    categoryId: '1',
                    warehouse: 'Main Warehouse',
                    warehouseId: 'w1',
                    stock: 0,
                    minStock: 10,
                    price: 3200,
                    value: 0,
                    nearestExpiry: null,
                    status: 'Active',
                },
            ]);

            this.stats.set({
                lowStockCount: 8,
                outOfStockCount: 3,
                expiringCount: 2,
                totalValue: 45000,
            });

            this.loading.set(false);
        }, 500);
    }

    getStockColor(stock: number, minStock: number): string {
        if (stock === 0) return 'error';
        if (stock < minStock) return 'warning';
        return 'success';
    }

    getStockStatus(stock: number, minStock: number): string {
        if (stock === 0) return 'Out of Stock';
        if (stock < minStock) return 'Low Stock';
        return 'In Stock';
    }

    viewProduct(productId: string): void {
        this._router.navigate(['/configuration/product/view', productId]);
    }

    createPurchaseOrder(productId: string): void {
        this._router.navigate(['/manager/inventory/purchase-order/create'], {
            queryParams: { product: productId },
        });
    }

    exportToExcel(): void {
        this._notificationService.info('Export', 'Exporting alerts to Excel...');
        // TODO: Implement Excel export
    }

    generateReport(): void {
        this._notificationService.info('Generate Report', 'Generating alert report...');
        // TODO: Implement report generation
    }

    onFilterTypeChange(): void {
        // Update query params
        this._router.navigate([], {
            relativeTo: this._route,
            queryParams: {
                type: this.filterType(),
                id: null,
                name: null,
                alert: this.alertType(),
            },
            queryParamsHandling: 'merge',
        });
    }

    onAlertTypeChange(value: string): void {
        this.alertType.set(value);
    }

    onSearch(): void {
        // Search is handled by computed property
    }
}
