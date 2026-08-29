import { Component, DestroyRef, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgZorroCustomModule } from '@app/shared/ng-zorro-custom.module';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpService } from '@app/core/services/http.service';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { LoaderComponent } from '@app/shared/components/loader/loader.component';
import { SelectProductComponent } from '../../components/select-product/select-product.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { finalize } from 'rxjs';
import { ConfirmationModalComponent } from '@app/shared/components/confirmation-modal/confirmation-modal.component';
import { NzModalService } from 'ng-zorro-antd/modal';
import { ActivatedRoute, Router } from '@angular/router';
import { markFormGroupTouched } from '@app/core/constants/helper';
import { PrintService } from '@app/core/services/print.service';

// POS Sale. This is the counter-checkout UI proven in shops (formerly "Quick
// Sale"), now wired to the revamp `orders` spine: Generate Invoice creates a
// Purchased POS order and deducts stock; Save as Draft parks the cart without
// touching stock; opening /sales/pos/:oid resumes a saved draft for finalizing.
@Component({
    selector: 'pos',
    standalone: true,
    imports: [CommonModule, NgZorroCustomModule, FormsModule, ReactiveFormsModule, LoaderComponent, SelectProductComponent],
    templateUrl: './pos.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './pos.component.scss',
})
export class PosComponent implements OnInit {
    invoiceId: string | null = null;
    form!: FormGroup;

    loading: boolean = false;

    editingProduct: any = null;
    selectedProductIndex: number | null = null;

    constructor(
        private _httpService: HttpService,
        private _destroyRef: DestroyRef,
        private _notificationService: NzNotificationService,
        private _fb: FormBuilder,
        private _modal: NzModalService,
        private _router: Router,
        private _activatedRoute: ActivatedRoute,
        private _printService: PrintService
    ) {}

    ngOnInit(): void {
        this.form = this.createForm();
        this.invoiceId = this._activatedRoute.snapshot.paramMap.get('oid');

        if (this.invoiceId) {
            this.loadInvoiceDetails();
        } else {
            this.loadInvoiceNumber();
        }

        // Payment reference is required only for bKash.
        this.form
            .get('payment_method')
            ?.valueChanges.pipe(takeUntilDestroyed(this._destroyRef))
            .subscribe((method) => {
                const refCtrl = this.form.get('payment_reference');
                if (method === 'bkash') {
                    refCtrl?.setValidators([Validators.required]);
                } else {
                    refCtrl?.clearValidators();
                    refCtrl?.setValue(null);
                }
                refCtrl?.updateValueAndValidity();
            });

        // Marking a sale paid fills the amount for the cashier. Only a partial
        // payment needs typing, and switching away from it clears the figure so a
        // stale number can never be saved against an unpaid sale.
        this.form
            .get('payment_status')
            ?.valueChanges.pipe(takeUntilDestroyed(this._destroyRef))
            .subscribe((status) => this.syncAmountPaid(status));
    }

    // Keeps amount_paid consistent with the status and the running total. Mirrors
    // resolveAmountPaid on the server, which is authoritative.
    private syncAmountPaid(status = this.form.get('payment_status')?.value): void {
        const ctrl = this.form.get('amount_paid');
        if (status === 'paid') {
            ctrl?.setValue(Number(this.form.get('total_amount')?.value || 0), { emitEvent: false });
        } else if (status === 'unpaid') {
            ctrl?.setValue(0, { emitEvent: false });
        }
        // partially_paid keeps whatever the cashier typed.
    }

    // Shown in the summary so the cashier can see what is still owed.
    get amountDue(): number {
        return Math.max(0, Number(this.form.get('total_amount')?.value || 0) - Number(this.form.get('amount_paid')?.value || 0));
    }

    createForm(): FormGroup {
        return this._fb.group({
            oid: [null],
            invoice_no: [null, [Validators.required]],
            customer_name: [null],
            customer_phone: [null],
            customer_address: [null],
            customer_email: [null],
            payment_method: ['cash', Validators.required],
            payment_reference: [null],
            payment_status: ['paid', Validators.required],
            amount_paid: [0, [Validators.min(0)]],
            notes: [null],
            status: ['Draft'],
            total_amount: [0, [Validators.required, Validators.min(0)]],
            products: this._fb.array([]),
        });
    }

    createProductGroup(product: any = null): FormGroup {
        return this._fb.group({
            inventory_oid: [product?.inventory_oid ?? null, Validators.required],
            product_name: [product?.product_name ?? null, Validators.required],
            product_oid: [product?.product_oid ?? null, Validators.required],
            quantity_available: [product?.quantity_available ?? null],
            quantity: [product?.quantity ?? 1, [Validators.required, Validators.min(1)]],
            unit_price: [product?.unit_price ?? null, [Validators.required, Validators.min(0)]],
            discount: [product?.discount ?? 0],
            total: [product?.total ?? 0, Validators.required],
        });
    }

    get products(): FormArray {
        return this.form.get('products') as FormArray;
    }

    get productRows(): any[] {
        return this.products.value;
    }

    removeProduct(index: number): void {
        this.products.removeAt(index);
        this.updateTotalAmount();
    }

    handleProductSelect(event: { action: string; value: any }): void {
        const { action, value } = event;

        switch (action) {
            case 'add':
                this.addProductToInvoice(value);
                break;
            case 'update':
                this.updateProductInInvoice(value);
                break;
            default:
                console.warn(`Unhandled action: ${action}`);
        }
    }

    addProductToInvoice(product: any): void {
        const exists = this.products.controls.some((ctrl) => ctrl.get('inventory_oid')?.value === product.inventory_oid);
        if (!exists) {
            this.products.push(this.createProductGroup(product));
            this.updateTotalAmount();
        } else {
            this._notificationService.warning('Product already exists', 'This product is already added to the invoice.');
        }
    }

    updateTotalAmount(): void {
        const total = this.products.controls.reduce((sum, productGroup) => {
            const itemTotal = Number(productGroup.get('total')?.value) || 0;
            return sum + itemTotal;
        }, 0);

        this.form.get('total_amount')?.setValue(total);
        // A paid sale tracks the total as the cart changes.
        this.syncAmountPaid();
    }

    updateProductInInvoice(updatedProduct: any): void {
        const index = this.products.controls.findIndex((item) => item.get('inventory_oid')?.value === updatedProduct.inventory_oid);

        if (index !== -1) {
            const item = this.products.at(index);
            item.patchValue({
                quantity: updatedProduct.quantity,
                unit_price: updatedProduct.unit_price,
                discount: updatedProduct.discount,
                total: updatedProduct.total,
                quantity_available: updatedProduct.quantity_available,
                inventory_oid: updatedProduct.inventory_oid,
            });

            this.updateTotalAmount();
            this.selectedProductIndex = null;
            this.editingProduct = null;
        } else {
            this.addProductToInvoice(updatedProduct);
        }
    }

    editProduct(index: number): void {
        const product = this.products.at(index).value;
        this.selectedProductIndex = index;
        this.editingProduct = { ...product };
    }

    // Build the request body the POS endpoints expect (only allowed keys; `oid`
    // is sent only when we are finalizing/updating an existing draft).
    private buildPayload(): any {
        const raw = this.form.getRawValue();
        const payload: any = {
            invoice_no: raw.invoice_no,
            customer_name: raw.customer_name || null,
            customer_phone: raw.customer_phone || null,
            customer_address: raw.customer_address || null,
            customer_email: raw.customer_email || null,
            payment_method: raw.payment_method,
            payment_reference: raw.payment_reference || null,
            payment_status: raw.payment_status,
            // Only meaningful for a partial payment; the server fills the rest.
            amount_paid: raw.payment_status === 'partially_paid' ? Number(raw.amount_paid || 0) : undefined,
            notes: raw.notes || null,
            total_amount: raw.total_amount,
            products: (raw.products || []).map((p: any) => ({
                inventory_oid: p.inventory_oid,
                product_name: p.product_name,
                product_oid: p.product_oid,
                quantity_available: p.quantity_available ?? null,
                quantity: p.quantity,
                unit_price: p.unit_price,
                discount: p.discount ?? 0,
                total: p.total,
            })),
        };
        if (this.invoiceId) payload.oid = this.invoiceId;
        return payload;
    }

    confirmSalesInvoice(): void {
        if (this.form.valid && this.products.length > 0) {
            this.displayConfirmationModal(this.buildPayload(), 'confirm');
        } else {
            markFormGroupTouched(this.form);
            this._notificationService.error('Error', 'Please fill all required fields and add at least one product before generating the invoice.');
        }
    }

    saveAsDraft(): void {
        if (this.form.valid && this.products.length > 0) {
            this.displayConfirmationModal(this.buildPayload(), 'draft');
        } else {
            markFormGroupTouched(this.form);
            this._notificationService.error('Error', 'Please fill all required fields and add at least one product before saving the draft.');
        }
    }

    generateInvoice(payload: any): void {
        this.loading = true;
        this._httpService
            .post(APIEndpoint.POS_CHECKOUT, payload)
            .pipe(
                takeUntilDestroyed(this._destroyRef),
                finalize(() => (this.loading = false))
            )
            .subscribe({
                next: (res: any) => {
                    if (res.status === 200 && res.body?.code === 200) {
                        this._notificationService.success('Success', 'Invoice generated successfully');
                        const receipt = { ...payload, invoice_no: res.body?.data?.invoice_no || payload.invoice_no };
                        this._printService.printReceipt(receipt).then(() => {
                            if (this.invoiceId) this.resetToPlainPosRoute();
                            this.resetForm();
                        });
                    } else {
                        this._notificationService.error('Error', res.body?.message);
                    }
                },
                error: (err: any) => {
                    console.log(err);
                    this._notificationService.error('Error!', err?.error?.message);
                },
            });
    }

    saveInvoiceInDraft(payload: any): void {
        this.loading = true;
        this._httpService
            .post(APIEndpoint.POS_SAVE_DRAFT, payload)
            .pipe(
                takeUntilDestroyed(this._destroyRef),
                finalize(() => (this.loading = false))
            )
            .subscribe({
                next: (res: any) => {
                    if (res.status === 200 && res.body?.code === 200) {
                        this._notificationService.success('Success', 'Draft saved successfully');
                        if (this.invoiceId) {
                            this.resetToPlainPosRoute();
                        }
                        this.resetForm();
                    } else {
                        this._notificationService.error('Error', res.body?.message);
                    }
                },
                error: (err: any) => {
                    console.log(err);
                    this._notificationService.error('Error!', err?.error?.message);
                },
            });
    }

    displayConfirmationModal(payload: any, type: string): void {
        const message = type === 'draft' ? 'Do you want to save this sale as a draft?' : 'Do you want to generate this invoice?';
        this._modal.create({
            nzContent: ConfirmationModalComponent,
            nzData: { message },
            nzFooter: null,
            nzClosable: false,
            nzOnOk: () => (type === 'draft' ? this.saveInvoiceInDraft(payload) : this.generateInvoice(payload)),
        });
    }

    loadInvoiceNumber(): void {
        this.loading = true;
        this._httpService
            .get(APIEndpoint.POS_GET_INVOICE_NUMBER)
            .pipe(
                takeUntilDestroyed(this._destroyRef),
                finalize(() => (this.loading = false))
            )
            .subscribe({
                next: (res: any) => {
                    if (res.status === 200 && res.body?.data?.invoice_no) {
                        this.form.get('invoice_no')?.setValue(res.body.data.invoice_no);
                    } else {
                        this._notificationService.error('Error', 'Invoice number not found in response');
                    }
                },
                error: (err: any) => {
                    console.log(err);
                    this._notificationService.error('Error!', err?.error?.message);
                },
            });
    }

    loadInvoiceDetails(): void {
        this.loading = true;
        this._httpService
            .get(APIEndpoint.ORDER_DETAILS, { oid: this.invoiceId })
            .pipe(
                takeUntilDestroyed(this._destroyRef),
                finalize(() => (this.loading = false))
            )
            .subscribe({
                next: (res: any) => {
                    if (res.status === 200 && res.body?.data) {
                        this.patchInvoiceForm(res.body.data);
                    }
                },
                error: (err: any) => {
                    console.log(err);
                    this._notificationService.error('Error!', err?.error?.message);
                    this.resetToPlainPosRoute();
                },
            });
    }

    patchInvoiceForm(data: any): void {
        this.form.patchValue({
            oid: data.oid,
            invoice_no: data.invoice_no,
            customer_name: data.customer_name,
            customer_phone: data.customer_phone,
            customer_address: data.customer_address,
            customer_email: data.customer_email,
            payment_method: data.payment_method,
            payment_reference: data.payment_reference,
            payment_status: data.payment_status,
            amount_paid: Number(data.amount_paid || 0),
            notes: data.notes,
            status: data.status,
            total_amount: data.total_amount,
        });

        this.products.clear();
        const lines = data.items || data.products || [];
        lines.forEach((product: any) => this.products.push(this.createProductGroup(product)));
        this.updateTotalAmount();
    }

    resetForm(): void {
        this.form.reset({
            oid: null,
            invoice_no: null,
            customer_name: null,
            customer_phone: null,
            customer_address: null,
            customer_email: null,
            payment_method: 'cash',
            payment_reference: null,
            payment_status: 'paid',
            amount_paid: 0,
            notes: null,
            status: 'Draft',
            total_amount: 0,
            products: [],
        });
        this.products.clear();
        this.invoiceId = null;
        this.loadInvoiceNumber();
        this.updateTotalAmount();
    }

    resetToPlainPosRoute(): void {
        this._router.navigate(['/sales/pos'], { replaceUrl: true });
    }
}
