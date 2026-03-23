import { Component, computed, DestroyRef, inject, input, OnInit, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { PrimaryButton } from '@app/shared/components/buttons/primary-button/primary-button.component';
import { SecondaryButton } from '@app/shared/components/buttons/secondary-button/secondary-button.component';
import { NgZorroCustomModule } from '@app/shared/ng-zorro-custom.module';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { checkRequiredValidator, markFormGroupTouched } from '@app/core/constants/helper';
import { HttpService } from '@app/core/services/http.service';
import { ConfirmationModalComponent } from '@app/shared/components/confirmation-modal/confirmation-modal.component';
import { NzModalService } from 'ng-zorro-antd/modal';
import { DROPDOWN_OPTIONS } from '@app/core/constants/dropdown-options';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { FormActions } from '@app/core/interfaces/form-action';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';

@Component({
    selector: 'app-purchase-order-form',
    imports: [CommonModule, NgZorroCustomModule, ReactiveFormsModule, PrimaryButton, SecondaryButton, AngularSvgIconModule],
    templateUrl: './purchase-order-form.component.html',
    styleUrl: './purchase-order-form.component.scss',
})
export class PurchaseOrderFormComponent implements OnInit {
    purchase = input<any>(undefined);
    readonly actions = output<FormActions>();
    buttonLoading = input(false);

    private readonly _formBuilder = inject(FormBuilder);
    private readonly _modalService = inject(NzModalService);
    private readonly _httpService = inject(HttpService);
    private readonly _notificationService = inject(NzNotificationService);
    private readonly _destroyRef = inject(DestroyRef);

    form = this._formBuilder.group({
        oid: [null],
        supplier_oid: [null, Validators.required],
        total_amount: [0, [Validators.required, Validators.min(0.01)]],
        special_notes: [null],
        payment_status: [null, Validators.required],
        paid_amount: [null, Validators.min(0)],
        purchase_type: [null, Validators.required],
        products: this._formBuilder.array([]),
    });

    drawerForm = this._createProductGroup();

    supplierList: any[] = [];
    productList: any[] = [];
    warehouseList: any[] = [];
    aisleList: any[] = [];
    supplierListLoading = signal(false);
    productListLoading = signal(false);
    warehouseListLoading = signal(false);
    aisleListLoading = signal(false);

    purchaseTypes = DROPDOWN_OPTIONS.PURCHASE_TYPES;
    paymentStatuses = DROPDOWN_OPTIONS.PAYMENT_STATUS;

    visible = false;
    editIndex: number | null = null;
    currentTotalPrice = 0;

    mode = computed(() => {
        return this.purchase() ? 'edit' : 'create';
    });

    confirmationMessage = computed(() => {
        return this.mode() === 'edit' ? 'Are you sure you want to update this purchase order?' : 'Are you sure you want to create this purchase order?';
    });

    ngOnInit(): void {
        this.loadSupplierList();
        this.loadProductList();
        this.loadWarehouseList();

        const purchase = this.purchase();
        if (purchase) {
            this._patchForm(purchase);
        }

        this.form
            .get('payment_status')
            ?.valueChanges.pipe(takeUntilDestroyed(this._destroyRef))
            .subscribe((value) => {
                const paidControl = this.form.get('paid_amount');
                if (value === 'paid' || value === 'partially_paid') {
                    paidControl?.setValidators([Validators.required, Validators.min(0.01)]);
                } else {
                    paidControl?.clearValidators();
                    paidControl?.setValue(null);
                }
                paidControl?.updateValueAndValidity();
            });

        this.drawerForm
            .get('warehouse_oid')
            ?.valueChanges.pipe(takeUntilDestroyed(this._destroyRef))
            .subscribe((value: any) => {
                this.drawerForm.get('aisle_oid')?.setValue(null);
                if (value) {
                    this.loadAisleList(value);
                } else {
                    this.aisleList = [];
                }
            });

        this.products.valueChanges.pipe(takeUntilDestroyed(this._destroyRef)).subscribe(() => {
            this.calculateTotalPriceFromProducts();
        });
    }

    private _createProductGroup(product: any = {}): FormGroup {
        return this._formBuilder.group({
            oid: [null],
            product_oid: [product.product_oid ?? null, Validators.required],
            warehouse_oid: [product.warehouse_oid ?? null, Validators.required],
            aisle_oid: [product.aisle_oid ?? null],
            quantity: [product.quantity ?? null, [Validators.required, Validators.min(1)]],
            unit_price: [product.unit_price ?? null, [Validators.required, Validators.min(0.01)]],
        });
    }

    private _patchForm(purchase: any): void {
        if (!purchase) return;

        this.form.patchValue({
            oid: purchase.oid ?? null,
            supplier_oid: purchase.supplier_oid ?? null,
            total_amount: purchase.total_amount ?? 0,
            special_notes: purchase.special_notes ?? null,
            payment_status: purchase.payment_status ?? null,
            paid_amount: purchase.paid_amount ?? null,
            purchase_type: purchase.purchase_type ?? null,
        });

        this.products.clear();
        (purchase.products || []).forEach((product: any) => {
            this.products.push(this._createProductGroup(product));
        });

        this.calculateTotalPriceFromProducts();
    }

    get products(): FormArray {
        return this.form.get('products') as FormArray;
    }

    get productRows(): any[] {
        return this.products.value as any[];
    }

    calculateTotalPriceFromProducts(): void {
        const allProducts = this.products.value;
        this.currentTotalPrice = allProducts.reduce((acc: number, product: any) => {
            const unitPrice = product.unit_price || 0;
            const quantity = product.quantity || 0;
            return acc + unitPrice * quantity;
        }, 0);
        this.form.patchValue({ total_amount: this.currentTotalPrice }, { emitEvent: false });
    }

    handleAdd(): void {
        this.visible = true;
    }

    onSubmit(): void {
        if (this.form.invalid) {
            markFormGroupTouched(this.form);
            return;
        }

        if (!this.products.length) {
            this._notificationService.warning('Warning!', 'You have to add at least 1 product');
            return;
        }

        const formValue = this.form.getRawValue();
        this.showConfirmationModal(formValue);
    }

    showConfirmationModal(payload: any): void {
        this._modalService.create({
            nzContent: ConfirmationModalComponent,
            nzData: { message: this.confirmationMessage() },
            nzFooter: null,
            nzClosable: false,
            nzOnOk: () => this.handleForm(payload),
        });
    }

    handleForm(payload: any): void {
        const mode = this.mode();
        if (mode === 'create') {
            this.actions.emit({ action: 'save', data: payload });
        } else {
            this.actions.emit({ action: 'update', data: payload });
        }
    }

    onCancel(): void {
        this.actions.emit({ action: 'cancel' });
    }

    close(): void {
        this.visible = false;
    }

    hasRequiredValidator(controlName: string): boolean {
        const control = this.form.get(controlName);
        return control ? checkRequiredValidator(control) : false;
    }

    hasRequiredValidatorDrawerForm(controlName: string): boolean {
        const control = this.drawerForm.get(controlName);
        return control ? checkRequiredValidator(control) : false;
    }

    checkDisabledStatus(value: any): boolean {
        return this.products.value.some((item: any, index: number) => {
            return index !== this.editIndex && item.product_oid === value;
        });
    }

    handleDrawerForm(): void {
        if (this.drawerForm.valid) {
            const productData = this.drawerForm.value;
            if (this.editIndex !== null) {
                this.products.at(this.editIndex).patchValue(productData);
                this.editIndex = null;
            } else {
                this.products.push(this._createProductGroup(productData));
            }
            this.drawerForm.reset();
            this.visible = false;
        } else {
            markFormGroupTouched(this.drawerForm);
        }
    }

    handleItemEdit(index: number): void {
        this.editIndex = index;
        const product = this.products.at(index).value;
        this.drawerForm.patchValue(product);
        this.visible = true;
    }

    handleItemDelete(index: number): void {
        this.products.removeAt(index);
    }

    getProductName(product_oid: string): string {
        const product = this.productList.find((item: any) => item.value === product_oid);
        return product ? product.label : 'Unknown Product';
    }

    getWarehouseName(warehouse_oid: string): string {
        const warehouse = this.warehouseList.find((item: any) => item.value === warehouse_oid);
        return warehouse ? warehouse.label : 'Unknown Warehouse';
    }

    calculateTotalPrice(product: any): number {
        return Number(product?.unit_price || 0) * Number(product?.quantity || 0);
    }

    loadSupplierList(): void {
        this.supplierListLoading.set(true);
        this._httpService
            .get(APIEndpoint.GET_SUPPLIER_LIST_FOR_DROPDOWN)
            .pipe(finalize(() => this.supplierListLoading.set(false)))
            .subscribe({
                next: (res: any) => {
                    this.supplierList = res?.body?.code === 200 ? res.body.data || [] : [];
                },
            });
    }

    loadProductList(): void {
        this.productListLoading.set(true);
        this._httpService
            .get(APIEndpoint.GET_PRODUCT_LIST_FOR_DROPDOWN)
            .pipe(finalize(() => this.productListLoading.set(false)))
            .subscribe({
                next: (res: any) => {
                    this.productList = res?.body?.code === 200 ? res.body.data || [] : [];
                },
            });
    }

    loadWarehouseList(): void {
        this.warehouseListLoading.set(true);
        this._httpService
            .get(APIEndpoint.GET_WAREHOUSE_LIST_FOR_DROPDOWN)
            .pipe(finalize(() => this.warehouseListLoading.set(false)))
            .subscribe({
                next: (res: any) => {
                    this.warehouseList = res?.body?.code === 200 ? res.body.data || [] : [];
                },
            });
    }

    loadAisleList(warehouse_oid: any): void {
        this.aisleListLoading.set(true);
        this._httpService
            .get(APIEndpoint.GET_AISLE_LIST_FOR_DROPDOWN, { warehouse_oid })
            .pipe(finalize(() => this.aisleListLoading.set(false)))
            .subscribe({
                next: (res: any) => {
                    this.aisleList = res?.body?.code === 200 ? res.body.data || [] : [];
                },
            });
    }
}
