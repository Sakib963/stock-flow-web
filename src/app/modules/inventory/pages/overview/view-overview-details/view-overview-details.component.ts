import { CommonModule, Location } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { COMPANY_INFO } from '@app/core/constants/company-info';
import { DROPDOWN_OPTIONS } from '@app/core/constants/dropdown-options';
import { HttpService } from '@app/core/services/http.service';
import { PrintService } from '@app/core/services/print.service';
import { UpdatePricingDrawerData, UpdatePricingFormComponent } from '@app/modules/inventory/components/overview/update-pricing-form/update-pricing-form.component';
import { LoaderComponent } from '@app/shared/components/loader/loader.component';
import { PageHeaderComponent } from '@app/shared/components/page-header/page-header.component';
import { NgZorroCustomModule } from '@app/shared/ng-zorro-custom.module';
import { CurrencyFormatPipe } from '@app/shared/pipe/currency-format.pipe';
import { NzDrawerService } from 'ng-zorro-antd/drawer';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { NgxBarcode6Module } from 'ngx-barcode6';
import { finalize } from 'rxjs';

@Component({
    selector: 'view-overview-details',
    imports: [CommonModule, NgZorroCustomModule, PageHeaderComponent, LoaderComponent, CurrencyFormatPipe, FormsModule, NgxBarcode6Module],
    templateUrl: './view-overview-details.component.html',
    styleUrl: './view-overview-details.component.scss',
})
export class ViewOverviewDetailsComponent implements OnInit {
    loading = false;
    actionLoading = false;

    productDetails = signal<any | null>(null);
    batchData = signal<any[]>([]);

    isBarcodeDrawerVisible = false;
    barcodePreviewData: {
        productName: string;
        batchCode: string;
        companyName: string;
        price: number | null;
        quantityAvailable: number;
    } | null = null;

    private readonly _httpService = inject(HttpService);
    private readonly _destroyRef = inject(DestroyRef);
    private readonly _notificationService = inject(NzNotificationService);
    private readonly _drawerService = inject(NzDrawerService);
    private readonly _printService = inject(PrintService);
    private readonly _activatedRoute = inject(ActivatedRoute);
    private readonly _router = inject(Router);
    private readonly _location = inject(Location);

    private readonly unitTypes = DROPDOWN_OPTIONS.MEASUREMENT_UNITS;
    private readonly productNatureList = DROPDOWN_OPTIONS.PRODUCT_NATURE;

    ngOnInit(): void {
        const oid = this._activatedRoute.snapshot.paramMap.get('oid');
        if (!oid) {
            this._notificationService.error('Inventory Overview', 'Invalid product identifier');
            this._location.back();
            return;
        }
        this.loadDetails(oid);
    }

    loadDetails(oid: string): void {
        this.loading = true;
        this._httpService
            .get(APIEndpoint.GET_INVENTORY_OVERVIEW_PRODUCT_DETAILS, { product_oid: oid })
            .pipe(
                takeUntilDestroyed(this._destroyRef),
                finalize(() => (this.loading = false))
            )
            .subscribe({
                next: (res: any) => {
                    if (res?.status === 200 && res?.body?.code === 200) {
                        this.productDetails.set(res.body.data || null);
                        this.batchData.set(res.body.data?.batch_data || []);
                        return;
                    }
                    this._notificationService.error('Inventory Overview', res?.body?.message || 'Failed to load product details');
                },
                error: (err: any) => {
                    this._notificationService.error('Inventory Overview', err?.error?.message || 'Failed to load product details');
                },
            });
    }

    navigateBack(): void {
        this._location.back();
    }

    redirectToProduct(): void {
        const oid = this.productDetails()?.oid;
        if (oid) {
            this._router.navigate([`/configuration/product/view/${oid}`], { state: { edit: false } });
        }
    }

    getBatchRibbonColor(item: any): string {
        if (item.status === 'ready_for_sale') return 'green';
        if (item.status === 'pending_pricing') return 'purple';
        return '';
    }

    getBatchStatusText(item: any): string {
        if (item.status === 'ready_for_sale') return 'Ready for Sale';
        if (item.status === 'pending_pricing') return 'Pending Pricing';
        return 'Internal Use';
    }

    isLowStock(): boolean {
        const product = this.productDetails();
        if (!product) return false;
        const total = this.batchData().reduce((sum: number, b: any) => sum + Number(b.quantity_available || 0), 0);
        return total < Number(product.restock_threshold || 0);
    }

    canUpdatePricing(item: any): boolean {
        return item.intended_use === 'for_sale';
    }

    displayUpdatePricingDrawer(item: any): void {
        const drawerData: UpdatePricingDrawerData = {
            formData: {
                oid: item.inventory_oid,
                selling_price: item.selling_price,
                maximum_discount: item.maximum_discount,
                ad_run_cost: item.ad_run_cost,
                packaging_cost: item.packaging_cost,
                gift_cost: item.gift_cost,
                content_creation_cost: item.content_creation_cost,
                influencer_cost: item.influencer_cost,
                cost_remarks: item.cost_remarks,
            },
            cost_price: item.cost_price,
            batch_code: item.batch_code,
        };

        const drawerRef = this._drawerService.create<UpdatePricingFormComponent, UpdatePricingDrawerData, any>({
            nzTitle: `Update Pricing - ${item.batch_code}`,
            nzContent: UpdatePricingFormComponent,
            nzData: drawerData,
            nzWidth: 480,
            nzMaskClosable: false,
        });

        drawerRef.afterClose.subscribe((result) => {
            if (result) {
                this.updatePricing(result);
            }
        });
    }

    private updatePricing(payload: any): void {
        this.actionLoading = true;
        this._httpService
            .post(APIEndpoint.UPDATE_INVENTORY_OVERVIEW_PRICING, payload)
            .pipe(
                takeUntilDestroyed(this._destroyRef),
                finalize(() => (this.actionLoading = false))
            )
            .subscribe({
                next: (res: any) => {
                    if (res?.status === 200 && res?.body?.code === 200) {
                        this._notificationService.success('Pricing', res?.body?.message || 'Pricing updated successfully');
                        const oid = this._activatedRoute.snapshot.paramMap.get('oid');
                        if (oid) this.loadDetails(oid);
                        return;
                    }
                    this._notificationService.error('Pricing', res?.body?.message || 'Failed to update pricing');
                },
                error: (err: any) => {
                    this._notificationService.error('Pricing', err?.error?.message || 'Failed to update pricing');
                },
            });
    }

    generateBarcode(item: any): void {
        const showPrice = item.intended_use === 'for_sale';
        if (showPrice && !item.selling_price) {
            this._notificationService.warning('Barcode', 'Cannot generate barcode: Selling price is missing.');
            return;
        }
        this.barcodePreviewData = {
            productName: this.productDetails()?.name || '',
            batchCode: item.batch_code,
            companyName: COMPANY_INFO.name,
            price: showPrice ? item.selling_price : null,
            quantityAvailable: item.quantity_available,
        };
        this.isBarcodeDrawerVisible = true;
    }

    printBarcode(): void {
        if (!this.barcodePreviewData) return;
        this._printService.printBarcodes(this.barcodePreviewData);
    }

    closeDrawer(): void {
        this.isBarcodeDrawerVisible = false;
        this.barcodePreviewData = null;
    }

    getLabel(value: string | number, type: 'unit_type' | 'product_nature'): string {
        const list = type === 'unit_type' ? this.unitTypes : this.productNatureList;
        const item = (list as any[]).find((o) => o.value === value);
        return item ? item.label : String(value || '');
    }

    getTotalStockCost(): number {
        return this.batchData().reduce((sum: number, b: any) => sum + Number(b.total_stock_cost || 0), 0);
    }

    getTotalExpectedRevenue(): number {
        return this.batchData().reduce((sum: number, b: any) => sum + Number(b.expected_revenue || 0), 0);
    }

    getTotalPotentialProfit(): number {
        return this.batchData().reduce((sum: number, b: any) => sum + Number(b.potential_profit || 0), 0);
    }

    getTotalAvailableStock(): number {
        return this.batchData().reduce((sum: number, b: any) => sum + Number(b.quantity_available || 0), 0);
    }
}
