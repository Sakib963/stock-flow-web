import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { HttpService } from '@app/core/services/http.service';
import { markFormGroupTouched } from '@app/core/constants/helper';
import { getDefaultDeliveryCharge } from '@app/core/constants/settings-state';
import { LoaderComponent } from '@app/shared/components/loader/loader.component';
import { ConfirmationModalComponent } from '@app/shared/components/confirmation-modal/confirmation-modal.component';
import { NgZorroCustomModule } from '@app/shared/ng-zorro-custom.module';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { NzModalService } from 'ng-zorro-antd/modal';
import { SelectProductComponent } from '../../components/select-product/select-product.component';
import { finalize } from 'rxjs';

// New Online Order. Same product-first flow as POS (select-product -> line table,
// showing SELLABLE stock so held units are excluded), then customer information
// and payment information. Smart Fill parses a pasted message to prefill the
// customer + a structured delivery address (city / zone / area / postcode) that
// Pathao needs. Creating the order holds stock (status Pending). No pre-orders here.
@Component({
    selector: 'online-order',
    standalone: true,
    imports: [CommonModule, FormsModule, ReactiveFormsModule, NgZorroCustomModule, LoaderComponent, SelectProductComponent],
    templateUrl: './online-order.component.html',
    styleUrl: './online-order.component.scss',
})
export class OnlineOrderComponent implements OnInit {
    form!: FormGroup;
    loading = false;
    parsing = false;
    submitting = false;

    pastedText = '';

    editingProduct: any = null;
    selectedProductIndex: number | null = null;

    editOid: string | null = null;
    private _skipPaymentSync = false;

    constructor(private _http: HttpService, private _notify: NzNotificationService, private _router: Router, private _fb: FormBuilder, private _modal: NzModalService, private _destroyRef: DestroyRef) {}

    ngOnInit(): void {
        this.form = this.createForm();

        // Keep payment status consistent with the type: Prepaid -> paid, COD -> unpaid.
        // (Prevents the "Prepaid but Unpaid" contradiction.) Skipped while loading an edit.
        this.form
            .get('payment_type')
            ?.valueChanges.pipe(takeUntilDestroyed(this._destroyRef))
            .subscribe((t) => {
                if (this._skipPaymentSync) return;
                this.form.get('payment_status')?.setValue(t === 'PREPAID' ? 'paid' : 'unpaid');
            });

        this.editOid = (history.state && history.state.editOid) || null;
        if (this.editOid) {
            this.loadForEdit(this.editOid);
        } else {
            this.loadInvoiceNumber();
        }
    }

    createForm(): FormGroup {
        return this._fb.group({
            oid: [null],
            invoice_no: [null],
            customer_name: [null, [Validators.required]],
            customer_phone: [null, [Validators.required]],
            customer_email: [null],
            social_handle: [null],
            address: [null, [Validators.required]],
            area: [null],
            zone: [null],
            city: [null],
            postcode: [null],
            payment_type: ['COD', [Validators.required]],
            payment_status: ['unpaid', [Validators.required]],
            amount_paid: [0, [Validators.min(0)]],
            delivery_charge: [getDefaultDeliveryCharge(), [Validators.min(0)]],
            discount_total: [0, [Validators.min(0)]],
            notes: [null],
            products: this._fb.array([]),
        });
    }

    // Reserve + show the next order/invoice number on load, same as POS. Sent on create.
    loadInvoiceNumber(): void {
        this._http
            .get(APIEndpoint.POS_GET_INVOICE_NUMBER)
            .pipe(takeUntilDestroyed(this._destroyRef))
            .subscribe({
                next: (res: any) => {
                    if (res.status === 200 && res.body?.data?.invoice_no) {
                        this.form.get('invoice_no')?.setValue(res.body.data.invoice_no);
                    }
                },
                error: () => {},
            });
    }

    // Paid amount actually recorded: full on 'paid', entered on 'partially_paid', else 0.
    private effectivePaid(): number {
        const status = this.form.get('payment_status')?.value;
        if (status === 'paid') return this.grandTotal;
        if (status === 'partially_paid') return Number(this.form.get('amount_paid')?.value || 0);
        return 0;
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

    get subtotal(): number {
        return this.products.controls.reduce((s, g) => s + (Number(g.get('total')?.value) || 0), 0);
    }

    get grandTotal(): number {
        return this.subtotal - Number(this.form.get('discount_total')?.value || 0) + Number(this.form.get('delivery_charge')?.value || 0);
    }

    // --- Smart Fill ---
    smartFill(): void {
        if (!this.pastedText.trim()) return;
        this.parsing = true;
        this._http
            .post(APIEndpoint.ONLINE_SMART_FILL, { text: this.pastedText })
            .pipe(
                takeUntilDestroyed(this._destroyRef),
                finalize(() => (this.parsing = false))
            )
            .subscribe({
                next: (res: any) => {
                    if (res.status === 200 && res.body?.data) {
                        const d = res.body.data;
                        this.form.patchValue({
                            customer_name: d.name ?? this.form.get('customer_name')?.value,
                            customer_phone: d.phone ?? this.form.get('customer_phone')?.value,
                            address: d.address ?? this.form.get('address')?.value,
                            city: d.city ?? this.form.get('city')?.value,
                            zone: d.zone ?? this.form.get('zone')?.value,
                            area: d.area ?? this.form.get('area')?.value,
                            postcode: d.postcode ?? this.form.get('postcode')?.value,
                        });
                        this._notify.success('Parsed', 'Review the delivery details below and edit if needed');
                    }
                },
                error: (err: any) => this._notify.error('Error!', err?.error?.message),
            });
    }

    // --- Products (same interaction as POS) ---
    handleProductSelect(event: { action: string; value: any }): void {
        if (event.action === 'add') this.addProductToInvoice(event.value);
        else if (event.action === 'update') this.updateProductInInvoice(event.value);
    }

    addProductToInvoice(p: any): void {
        if (this.products.controls.some((c) => c.get('inventory_oid')?.value === p.inventory_oid)) {
            this._notify.warning('Product already exists', 'This product is already added to the order.');
            return;
        }
        this.products.push(this.createProductGroup(p));
    }

    updateProductInInvoice(p: any): void {
        const i = this.products.controls.findIndex((c) => c.get('inventory_oid')?.value === p.inventory_oid);
        if (i !== -1) {
            this.products.at(i).patchValue({ quantity: p.quantity, unit_price: p.unit_price, discount: p.discount, total: p.total, quantity_available: p.quantity_available, inventory_oid: p.inventory_oid });
            this.selectedProductIndex = null;
            this.editingProduct = null;
        } else {
            this.addProductToInvoice(p);
        }
    }

    editProduct(i: number): void {
        this.selectedProductIndex = i;
        this.editingProduct = { ...this.products.at(i).value };
    }

    removeProduct(i: number): void {
        this.products.removeAt(i);
    }

    private buildPayload(): any {
        const raw = this.form.getRawValue();
        return {
            invoice_no: raw.invoice_no || null,
            amount_paid: this.effectivePaid(),
            customer: {
                name: raw.customer_name || null,
                phone: raw.customer_phone || null,
                email: raw.customer_email || null,
                social_handle: raw.social_handle || null,
                address: raw.address,
                city: raw.city || null,
                zone: raw.zone || null,
                area: raw.area || null,
                postcode: raw.postcode || null,
            },
            payment_type: raw.payment_type,
            payment_status: raw.payment_status,
            delivery_charge: Number(raw.delivery_charge || 0),
            discount_total: Number(raw.discount_total || 0),
            note: raw.notes || null,
            products: (raw.products || []).map((p: any) => ({
                inventory_oid: p.inventory_oid,
                product_oid: p.product_oid,
                product_name: p.product_name,
                quantity_available: p.quantity_available ?? null,
                quantity: p.quantity,
                unit_price: p.unit_price,
                discount: p.discount ?? 0,
                total: p.total,
            })),
        };
    }

    // Every action asks for confirmation first.
    private confirm(message: string, onOk: () => void): void {
        this._modal.create({ nzContent: ConfirmationModalComponent, nzData: { message }, nzFooter: null, nzClosable: false, nzOnOk: onOk });
    }

    promptCreate(): void {
        if (this.form.invalid || this.products.length === 0) {
            markFormGroupTouched(this.form);
            this._notify.error('Error', 'Fill customer name, phone and delivery address, and add at least one product.');
            return;
        }
        this.confirm(this.editOid ? 'Save changes to this order?' : 'Create this order and hold stock?', () => this.save());
    }

    promptDraft(): void {
        if (this.products.length === 0) {
            this._notify.error('Error', 'Add at least one product before saving a draft.');
            return;
        }
        this.confirm('Save this order as a draft? Stock will not be held.', () => this.saveDraft());
    }

    promptClear(): void {
        this.confirm('Clear the form? All entered information will be lost.', () => this.clearAll());
    }

    save(): void {
        const payload = this.buildPayload();
        this.submitting = true;

        if (this.editOid) {
            const body = { oid: this.editOid, customer: payload.customer, payment_status: payload.payment_status, amount_paid: payload.amount_paid, delivery_charge: payload.delivery_charge, discount_total: payload.discount_total, note: payload.note, products: payload.products };
            this._post(APIEndpoint.ORDER_EDIT_PENDING, body, 'Order updated');
        } else {
            this._post(APIEndpoint.ONLINE_CREATE_ORDER, payload, 'Online order created; stock held');
        }
    }

    saveDraft(): void {
        this.submitting = true;
        this._post(APIEndpoint.ONLINE_SAVE_DRAFT, this.buildPayload(), 'Draft saved');
    }

    clearAll(): void {
        this.form.reset({
            oid: null,
            invoice_no: null,
            customer_name: null,
            customer_phone: null,
            customer_email: null,
            social_handle: null,
            address: null,
            area: null,
            zone: null,
            city: null,
            postcode: null,
            payment_type: 'COD',
            payment_status: 'unpaid',
            amount_paid: 0,
            delivery_charge: getDefaultDeliveryCharge(),
            discount_total: 0,
            notes: null,
            products: [],
        });
        this.products.clear();
        this.pastedText = '';
        this.editingProduct = null;
        this.selectedProductIndex = null;
        this.loadInvoiceNumber();
    }

    private _post(endpoint: string, body: any, msg: string): void {
        this._http
            .post(endpoint, body)
            .pipe(
                takeUntilDestroyed(this._destroyRef),
                finalize(() => (this.submitting = false))
            )
            .subscribe({
                next: (res: any) => {
                    if (res.status === 200 && res.body?.code === 200) {
                        this._notify.success('Saved', msg);
                        const oid = res.body.data?.oid || this.editOid;
                        if (oid) this._router.navigate([`/sales/orders/view/${oid}`]);
                        else this._router.navigate(['/sales/orders/list']);
                    } else {
                        this._notify.error('Error!', res.body?.message);
                    }
                },
                error: (err: any) => this._notify.error('Blocked', err?.error?.message || 'Failed'),
            });
    }

    private loadForEdit(oid: string): void {
        this.loading = true;
        this._http
            .get(APIEndpoint.ORDER_DETAILS, { oid })
            .pipe(
                takeUntilDestroyed(this._destroyRef),
                finalize(() => (this.loading = false))
            )
            .subscribe({
                next: (res: any) => {
                    if (res.status !== 200 || !res.body?.data) return;
                    const o = res.body.data;
                    // Don't let the payment_type auto-link overwrite the loaded status.
                    this._skipPaymentSync = true;
                    this.form.patchValue({
                        oid: o.oid,
                        invoice_no: o.invoice_no,
                        customer_name: o.customer_name,
                        customer_phone: o.customer_phone,
                        customer_email: o.customer_email,
                        address: o.customer_address,
                        city: o.delivery_city,
                        zone: o.delivery_zone,
                        area: o.delivery_area,
                        postcode: o.delivery_postcode,
                        payment_type: o.payment_type || 'COD',
                        payment_status: o.payment_status || 'unpaid',
                        amount_paid: Number(o.amount_paid || 0),
                        delivery_charge: Number(o.delivery_charge || 0),
                        discount_total: Number(o.discount_total || 0),
                        notes: o.notes,
                    });
                    this._skipPaymentSync = false;
                    this.products.clear();
                    (o.items || []).forEach((i: any) =>
                        this.products.push(
                            this.createProductGroup({
                                inventory_oid: i.inventory_oid,
                                product_oid: i.product_oid,
                                product_name: i.product_name,
                                quantity_available: i.quantity_available,
                                quantity: Number(i.quantity),
                                unit_price: Number(i.unit_price),
                                discount: Number(i.discount || 0),
                                total: Number(i.total),
                            })
                        )
                    );
                },
            });
    }
}
