import { CommonModule } from '@angular/common';
import { Component, DestroyRef, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { checkRequiredValidator } from '@app/core/constants/helper';
import { HttpService } from '@app/core/services/http.service';
import { LoaderComponent } from '@app/shared/components/loader/loader.component';
import { NgZorroCustomModule } from '@app/shared/ng-zorro-custom.module';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { debounceTime, distinctUntilChanged, finalize, skip, Subject } from 'rxjs';

// Product picker for a PRE-ORDER line.
//
// Deliberately NOT `select-product`: that one searches batches and gates on
// sellable stock, which is exactly wrong here. A pre-order is for products the
// shop does NOT have, so every active product is selectable regardless of stock,
// and no batch is chosen. Stock is shown as context only, never as a limit.
@Component({
    selector: 'select-pre-order-product',
    standalone: true,
    imports: [CommonModule, LoaderComponent, NgZorroCustomModule, ReactiveFormsModule, FormsModule],
    templateUrl: './select-pre-order-product.component.html',
    styleUrl: './select-pre-order-product.component.scss',
})
export class SelectPreOrderProductComponent implements OnInit, OnChanges {
    @Output() readonly actionEmitter: EventEmitter<{ action: string; value: any }> = new EventEmitter();
    @Input() formData: any;

    form!: FormGroup;
    loading = false;
    isFilter = false;

    productList: any[] = [];
    selectedProduct: any = null;

    private $searchSubject = new Subject<string>();

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

        // Reactive forms own these controls, so react to valueChanges rather than
        // template ngModel bindings.
        this.form
            .get('product_oid')
            ?.valueChanges.pipe(takeUntilDestroyed(this._destroyRef))
            .subscribe((product_oid: string) => this.onProductSelected(product_oid));

        ['quantity', 'unit_price', 'discount'].forEach((control) => {
            this.form
                .get(control)
                ?.valueChanges.pipe(takeUntilDestroyed(this._destroyRef))
                .subscribe(() => this.recalculateTotal());
        });
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['formData'] && changes['formData'].currentValue) {
            this.form?.reset({ quantity: 1, discount: 0, total: 0 });
            const data = changes['formData'].currentValue;
            this.form?.patchValue({
                product_oid: data.product_oid,
                product_name: data.product_name,
                sellable_quantity: data.sellable_quantity ?? 0,
                quantity: data.quantity,
                unit_price: data.unit_price,
                discount: data.discount,
                total: data.total,
            });
            this.selectedProduct = this.productList.find((p) => p.product_oid === data.product_oid) ?? null;
        }
    }

    createForm(): FormGroup {
        return this._fb.group({
            search_input: [null],
            product_oid: [null, [Validators.required]],
            product_name: [null, [Validators.required]],
            // Context only. There is no min() here on purpose: booking a product
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

    loadProductList(payload: any = null): void {
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
                    if (res.status === 200 && res.body?.code === 200) {
                        this.productList = res.body.data ?? [];
                    }
                },
                error: (err: any) => {
                    this._notificationService.error('Error!', err?.error?.message || 'Unable to load products');
                },
            });
    }

    onSearch(value: string): void {
        this.$searchSubject.next(value);
    }

    onProductSelected(product_oid: string): void {
        const product = this.productList.find((p) => p.product_oid === product_oid);
        if (!product) {
            this.selectedProduct = null;
            return;
        }

        this.selectedProduct = product;
        this.form.patchValue(
            {
                product_name: product.product_name,
                sellable_quantity: product.sellable_quantity ?? 0,
                unit_price: product.selling_price ?? 0,
            },
            { emitEvent: false }
        );
        this.recalculateTotal();
    }

    recalculateTotal(): void {
        const quantity = Number(this.form.get('quantity')?.value || 0);
        const unitPrice = Number(this.form.get('unit_price')?.value || 0);
        const discount = Number(this.form.get('discount')?.value || 0);
        const total = Math.max(quantity * unitPrice - discount, 0);
        this.form.get('total')?.setValue(total, { emitEvent: false });
    }

    onAdd(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }
        this.recalculateTotal();
        const value = this.form.getRawValue();
        this.actionEmitter.emit({ action: this.formData ? 'update' : 'add', value });
        this.resetLine();
    }

    onCancelEdit(): void {
        this.actionEmitter.emit({ action: 'cancel', value: null });
        this.resetLine();
    }

    resetLine(): void {
        this.form.reset({ quantity: 1, discount: 0, total: 0, sellable_quantity: 0 });
        this.selectedProduct = null;
    }
}
