import { Component, DestroyRef, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoaderComponent } from '@app/shared/components/loader/loader.component';
import { NgZorroCustomModule } from '@app/shared/ng-zorro-custom.module';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpService } from '@app/core/services/http.service';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { debounceTime, distinctUntilChanged, finalize, skip, Subject } from 'rxjs';
import { checkRequiredValidator } from '@app/core/constants/helper';
import { NzFormTooltipIcon } from 'ng-zorro-antd/form';

// Search + configure a single product line for a PRE-ORDER, then emit it to the
// parent booking. Same interaction and layout as the POS/Order picker
// (`select-product`) so the two feel like one product, with two deliberate
// differences:
//
//   1. The feed is the pre-order product feed (products, not batches), so a
//      product with no stock at all is selectable. That is the point of a
//      pre-order, so stock is never a gate here: `quantity` has no ceiling.
//   2. No batch is chosen. The batch decision happens later, at conversion,
//      on the order page.
@Component({
    selector: 'select-pre-order-product',
    standalone: true,
    imports: [CommonModule, LoaderComponent, NgZorroCustomModule, ReactiveFormsModule, FormsModule],
    templateUrl: './select-pre-order-product.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './select-pre-order-product.component.scss',
})
export class SelectPreOrderProductComponent implements OnInit, OnChanges {
    @Output() readonly actionEmitter: EventEmitter<{ action: string; value: any }> = new EventEmitter();

    @Input() formData: any;
    form!: FormGroup;
    loading: boolean = false;
    isFilter: boolean = false;

    productList: any = [];
    filteredProductList: any = [];

    selectedProduct: any = null;

    private $searchSubject = new Subject<string>();

    discountTooltipIcon: NzFormTooltipIcon = {
        type: 'info-circle',
        theme: 'twotone',
    };

    constructor(
        private _fb: FormBuilder,
        private _httpService: HttpService,
        private _destroyRef: DestroyRef,
        private _notificationService: NzNotificationService
    ) {}

    ngOnInit(): void {
        this.form = this.createForm();
        this.loadProductList();

        this.$searchSubject.pipe(skip(1), debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this._destroyRef)).subscribe((value: string) => {
            this.isFilter = true;
            this.loadProductList({ search_text: value });
        });
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['formData'] && changes['formData'].currentValue) {
            this.form?.reset();
            this.selectedProduct = null;

            const data = changes['formData'].currentValue;

            this.form?.patchValue({
                search_input: data.product_oid,
                product_oid: data.product_oid,
                product_name: data.product_name,
                sellable_quantity: data.sellable_quantity ?? 0,
                quantity: data.quantity,
                unit_price: data.unit_price,
                discount: data.discount,
                total: data.total,
            });

            this.onProductSelectedById(data.product_oid);

            // The feed is capped and search-driven, so a booked product is not
            // guaranteed to be in the current page of results. Fall back to the
            // line's own values rather than rendering an empty card.
            if (!this.selectedProduct) {
                this.selectedProduct = {
                    product_oid: data.product_oid,
                    product_name: data.product_name,
                    sku: data.sku ?? null,
                    sellable_quantity: Number(data.sellable_quantity ?? 0),
                    unit_price: Number(data.unit_price ?? 0),
                    max_discount_range: Number(data.max_discount_range ?? 0),
                };
            }
        }
    }

    createForm(): FormGroup {
        return this._fb.group({
            search_input: [null],
            product_name: [null, [Validators.required]],
            product_oid: [null, [Validators.required]],
            // Context only. There is deliberately no min() here: booking a product
            // with zero stock is the entire point of a pre-order.
            sellable_quantity: [0],
            quantity: [1, [Validators.required, Validators.min(1)]],
            unit_price: [null, [Validators.required, Validators.min(0)]],
            discount: [0, [Validators.required, Validators.min(0)]],
            total: [0, [Validators.required, Validators.min(0)]],
        });
    }

    hasRequiredValidator(controlName: string): boolean {
        const control = this.form.get(controlName);
        return control ? checkRequiredValidator(control) : false;
    }

    loadProductList(payload: any = null): any {
        if (!this.isFilter) {
            this.loading = true;
        }
        this._httpService
            .get(APIEndpoint.GET_PRODUCT_LIST_FOR_PRE_ORDER, payload)
            .pipe(
                takeUntilDestroyed(this._destroyRef),
                finalize(() => {
                    this.loading = false;
                    this.isFilter = false;
                })
            )
            .subscribe({
                next: (res: any) => {
                    if (res.status === 200) {
                        this.productList = res.body?.data?.length ? res.body.data : [];
                        this.filteredProductList = this.groupProductsBySubCategory(this.productList);
                    }
                },
                error: (err: any) => {
                    this._notificationService.error('Error!', err?.error?.message || 'Unable to load products');
                },
            });
    }

    groupProductsBySubCategory(rawList: any[]): any[] {
        const groupedMap = new Map<string, any>();

        rawList.forEach((item) => {
            const subCategoryKey = item.sub_category_oid ?? 'uncategorised';

            if (!groupedMap.has(subCategoryKey)) {
                groupedMap.set(subCategoryKey, {
                    sub_category: item.sub_category_name || 'Uncategorised',
                    parent_category: item.category_name || 'Uncategorised',
                    children: [],
                });
            }

            const group = groupedMap.get(subCategoryKey);

            group.children.push({
                product_oid: item.product_oid,
                product_name: item.product_name,
                image_url: item.image_url,
                sku: item.sku,
                // Shown as context, never as a limit.
                sellable_quantity: Number(item.sellable_quantity ?? 0),
                unit_price: Number(item.selling_price),
                max_discount_range: Number(item.maximum_discount),
            });
        });

        return Array.from(groupedMap.values());
    }

    onChange(value: string): void {
        this.$searchSubject.next(value);
    }

    clearSelection(): void {
        this.form.reset({ quantity: 1, discount: 0, total: 0, sellable_quantity: 0 });
        this.selectedProduct = null;
        this.formData = null;
    }

    onProductSelected(product: any): void {
        this.selectedProduct = product;

        this.form.patchValue({
            product_oid: product.product_oid,
            product_name: product.product_name,
            sellable_quantity: product.sellable_quantity,
            quantity: this.formData ? this.form.value.quantity : 1,
            unit_price: product.unit_price,
            discount: this.formData ? this.form.value.discount : 0,
            total: product.unit_price,
        });
    }

    onProductSelectedById(productOid: string): void {
        for (const group of this.filteredProductList) {
            const found = group.children.find((p: any) => p.product_oid === productOid);
            if (found) {
                this.onProductSelected(found);
                return;
            }
        }
        this.selectedProduct = null;
    }

    getProductDisplayLabel(product: any): string {
        if (!product) return '';
        return product.sku ? `${product.product_name} (${product.sku})` : `${product.product_name}`;
    }

    getProductUnitPriceLabel(product: any): any {
        return product ? product?.unit_price : 0;
    }

    // A pre-ordered product often has no batch on hand yet, so there may be no
    // price on record to derive a cap from. Fall back to the line's unit price
    // rather than pinning the discount to zero.
    getMaxDiscountAmount(): number {
        if (!this.selectedProduct) return 0;
        const configured = Number(this.selectedProduct.max_discount_range) || 0;
        return configured > 0 ? configured : Number(this.form.get('unit_price')?.value) || 0;
    }

    getDiscountTooltip(): string {
        if (!this.selectedProduct) {
            return 'Please select a product to view the available discount range.';
        }
        const configured = Number(this.selectedProduct.max_discount_range) || 0;
        if (configured > 0) {
            return `Maximum discount allowed: ${configured.toFixed(2)}`;
        }
        return 'This product has no batch on record yet, so no discount cap is configured. Capped at the unit price.';
    }

    // Same formula as POS and Orders: the discount is per unit. Keeping it
    // identical matters at conversion, where a booked line is carried onto the
    // order page and re-priced by that page's rules.
    getTotalPrice(): number {
        const quantity = Number(this.form.get('quantity')?.value) || 0;
        const unitPrice = Number(this.form.get('unit_price')?.value) || 0;
        const discountAmount = Number(this.form.get('discount')?.value) || 0;

        const total = Math.max(0, (unitPrice - discountAmount) * quantity);

        this.form.get('total')?.setValue(total, { emitEvent: false });
        return total;
    }

    addToPreOrder(): void {
        const actionType = this.formData ? 'update' : 'add';

        this.getTotalPrice();
        this.actionEmitter.emit({
            action: actionType,
            value: this.form.getRawValue(),
        });

        this.clearSelection();
    }

    onCancelEdit(): void {
        this.actionEmitter.emit({ action: 'cancel', value: null });
        this.clearSelection();
    }
}
