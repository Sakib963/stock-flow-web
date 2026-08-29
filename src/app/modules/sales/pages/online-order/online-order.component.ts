import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, ChangeDetectionStrategy } from '@angular/core';
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
import { SelectBatchForLineComponent } from '../../components/select-batch-for-line/select-batch-for-line.component';
import { finalize } from 'rxjs';

// New Online Order. Same product-first flow as POS (select-product -> line table,
// showing SELLABLE stock so held units are excluded), then customer information
// and payment information. Smart Fill parses a pasted message to prefill the
// customer + a structured delivery address (city / zone / area / postcode) that
// Pathao needs. Creating the order holds stock (status Pending). No pre-orders here.
@Component({
    selector: 'online-order',
    standalone: true,
    imports: [CommonModule, FormsModule, ReactiveFormsModule, NgZorroCustomModule, LoaderComponent, SelectProductComponent, SelectBatchForLineComponent],
    templateUrl: './online-order.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
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

    // Pre-order conversion state. Set when the page is opened from a pre-order's
    // "Create Order" action; the booking is patched in whole, but each booked
    // line still needs a batch chosen explicitly.
    fromPreOrderOid: string | null = null;
    preOrderNo: string | null = null;
    // Kept for the conversion banner: these are the parts of the booking that are
    // not otherwise visible on this page, so the admin can see what carried over.
    preOrderAdvance = 0;
    preOrderExpectedDate: string | null = null;
    batchPickerVisible = false;
    batchLineIndex: number | null = null;
    batchLine: any = null;

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
        this.fromPreOrderOid = (history.state && history.state.fromPreOrderOid) || null;

        if (this.editOid) {
            this.loadForEdit(this.editOid);
        } else if (this.fromPreOrderOid) {
            this.loadInvoiceNumber();
            this.loadFromPreOrder(this.fromPreOrderOid);
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
            // --- Pre-order conversion only; never sent to the server ---
            // A booked line arrives with no batch, so it starts 'awaiting_batch'
            // and blocks save until the admin picks a batch and confirms it.
            pre_order_item_oid: [product?.pre_order_item_oid ?? null],
            booked_quantity: [product?.booked_quantity ?? null],
            line_state: [product?.line_state ?? 'confirmed'],
        });
    }

    // --- Pre-order conversion helpers ---
    get awaitingBatchCount(): number {
        return this.products.controls.filter((c) => c.get('line_state')?.value === 'awaiting_batch').length;
    }

    // Only lines that came from the booking count towards conversion progress.
    // Anything added here during the conversion is an ordinary line and is not
    // part of what has to be resolved before saving.
    get bookedLineCount(): number {
        return this.products.controls.filter((c) => !!c.get('pre_order_item_oid')?.value).length;
    }

    get batchedBookedCount(): number {
        return this.bookedLineCount - this.awaitingBatchCount;
    }

    get batchProgressPercent(): number {
        const total = this.bookedLineCount;
        return total ? Math.round((this.batchedBookedCount / total) * 100) : 100;
    }

    get addedAtConversionCount(): number {
        return this.products.length - this.bookedLineCount;
    }

    get conversionReady(): boolean {
        return this.awaitingBatchCount === 0;
    }

    viewPreOrder(): void {
        if (!this.fromPreOrderOid) return;
        this._router.navigate([`/sales/pre-order/view/${this.fromPreOrderOid}`]);
    }

    isBookedLine(i: number): boolean {
        return !!this.products.at(i).get('pre_order_item_oid')?.value;
    }

    lineState(i: number): string {
        return this.products.at(i).get('line_state')?.value;
    }

    // A booked line is a commitment: it cannot be dropped and cannot go below the
    // booked quantity, because either would quietly turn an all-or-nothing
    // conversion into a partial one.
    minQuantityFor(i: number): number {
        return Number(this.products.at(i).get('booked_quantity')?.value || 1);
    }

    openBatchPicker(i: number): void {
        const group = this.products.at(i);
        this.batchLineIndex = i;
        this.batchLine = {
            product_oid: group.get('product_oid')?.value,
            product_name: group.get('product_name')?.value,
            quantity: Number(group.get('quantity')?.value || 0),
        };
        this.batchPickerVisible = true;
    }

    onBatchConfirmed(event: { inventory_oid: string; batch: any }): void {
        if (this.batchLineIndex === null) return;
        const group = this.products.at(this.batchLineIndex);
        group.patchValue({
            inventory_oid: event.inventory_oid,
            quantity_available: event.batch.sellable_quantity,
            line_state: 'confirmed',
        });
        this.closeBatchPicker();
    }

    closeBatchPicker(): void {
        this.batchPickerVisible = false;
        this.batchLineIndex = null;
        this.batchLine = null;
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
        if (this.isBookedLine(i)) {
            this._notify.warning('Booked item', 'This item came from the pre-order and cannot be removed. Cancel the pre-order instead if the customer no longer wants it.');
            return;
        }
        this.products.removeAt(i);
    }

    // Pull the whole booking onto this page: customer, delivery, money and every
    // product line. Lines arrive WITHOUT a batch, because a pre-order never had
    // one, and the system must not guess which batch a booked line meant.
    private loadFromPreOrder(oid: string): void {
        this.loading = true;
        this._http
            .get(`${APIEndpoint.GET_PRE_ORDER_DETAILS}/${oid}`)
            .pipe(
                takeUntilDestroyed(this._destroyRef),
                finalize(() => (this.loading = false))
            )
            .subscribe({
                next: (res: any) => {
                    if (res.status !== 200 || !res.body?.data) return;
                    const p = res.body.data.details;
                    const items = res.body.data.items || [];

                    this.preOrderNo = p.preorder_no;
                    this.preOrderExpectedDate = p.expected_date || null;

                    const advance = Number(p.advance_paid || 0);
                    const total = Number(p.total_amount || 0);
                    this.preOrderAdvance = advance;

                    this._skipPaymentSync = true;
                    this.form.patchValue({
                        customer_name: p.customer_name,
                        customer_phone: p.customer_phone,
                        customer_email: p.customer_email,
                        address: p.customer_address,
                        city: p.delivery_city,
                        zone: p.delivery_zone,
                        area: p.delivery_area,
                        postcode: p.delivery_postcode,
                        delivery_charge: Number(p.delivery_charge || 0),
                        discount_total: Number(p.discount_total || 0),
                        // The advance already collected carries straight over.
                        amount_paid: advance,
                        payment_status: advance <= 0 ? 'unpaid' : advance >= total ? 'paid' : 'partially_paid',
                        notes: p.notes,
                    });
                    this._skipPaymentSync = false;

                    this.products.clear();
                    items.forEach((i: any) =>
                        this.products.push(
                            this.createProductGroup({
                                inventory_oid: null, // chosen per line, below
                                product_oid: i.product_oid,
                                product_name: i.product_name,
                                quantity_available: null,
                                quantity: Number(i.quantity),
                                unit_price: Number(i.unit_price),
                                discount: Number(i.discount || 0),
                                total: Number(i.total),
                                pre_order_item_oid: i.oid,
                                booked_quantity: Number(i.quantity),
                                line_state: 'awaiting_batch',
                            })
                        )
                    );

                    this._notify.info('Pre-order loaded', `Pick a batch for each of the ${items.length} booked item(s), then save to create the order.`);
                },
                error: (err: any) => this._notify.error('Error!', err?.error?.message || 'Unable to load the pre-order'),
            });
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
        // `line_state` and `booked_quantity` are UI-only and deliberately dropped
        // here; `pre_order_item_oid` is not sent either, since the pre-order link
        // is established by mark-converted after the order is saved.
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

        // A booked line without a batch is not a valid order line.
        if (this.awaitingBatchCount > 0) {
            this._notify.error('Batch needed', `${this.awaitingBatchCount} pre-ordered item(s) still need a batch. Choose one for each before saving.`);
            return;
        }

        const message = this.editOid ? 'Save changes to this order?' : this.fromPreOrderOid ? `Create this order from pre-order ${this.preOrderNo}? Stock will be held and the pre-order will be marked Converted.` : 'Create this order and hold stock?';
        this.confirm(message, () => this.save());
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

                        // Close the loop on a conversion: link both directions and
                        // move the booking to Converted. The order already exists at
                        // this point, so a failure here is reported but does not
                        // discard the order.
                        if (this.fromPreOrderOid && oid) {
                            this._markPreOrderConverted(this.fromPreOrderOid, oid);
                            return;
                        }

                        if (oid) this._router.navigate([`/sales/orders/view/${oid}`]);
                        else this._router.navigate(['/sales/orders/list']);
                    } else {
                        this._notify.error('Error!', res.body?.message);
                    }
                },
                error: (err: any) => this._notify.error('Blocked', err?.error?.message || 'Failed'),
            });
    }

    private _markPreOrderConverted(preOrderOid: string, orderOid: string): void {
        this._http
            .post(APIEndpoint.MARK_PRE_ORDER_CONVERTED, { oid: preOrderOid, order_oid: orderOid })
            .pipe(takeUntilDestroyed(this._destroyRef))
            .subscribe({
                next: (res: any) => {
                    if (res.status === 200 && res.body?.code === 200) {
                        this._notify.success('Pre-order converted', `Pre-order ${this.preOrderNo} is now marked Converted.`);
                    } else {
                        this._notify.warning('Order saved', `The order was created, but the pre-order could not be marked Converted: ${res.body?.message || 'unknown error'}`);
                    }
                    this._router.navigate([`/sales/orders/view/${orderOid}`]);
                },
                error: (err: any) => {
                    this._notify.warning('Order saved', `The order was created, but the pre-order could not be marked Converted: ${err?.error?.message || 'request failed'}`);
                    this._router.navigate([`/sales/orders/view/${orderOid}`]);
                },
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
