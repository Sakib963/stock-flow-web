import { CommonModule } from '@angular/common';
import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { Constants } from '@app/core/constants/constants';
import { markFormGroupTouched } from '@app/core/constants/helper';
import { FormActions } from '@app/core/interfaces/form-action';
import { HttpService } from '@app/core/services/http.service';
import { SelectPreOrderProductComponent } from '@app/modules/sales/components/select-pre-order-product/select-pre-order-product.component';
import { ConfirmationModalComponent } from '@app/shared/components/confirmation-modal/confirmation-modal.component';
import { NgZorroCustomModule } from '@app/shared/ng-zorro-custom.module';
import { NzModalService } from 'ng-zorro-antd/modal';
import { NzNotificationService } from 'ng-zorro-antd/notification';

// Shared create/edit form for a pre-order (a booking for stock not yet held).
//
// Lines carry a product but NEVER a batch: a pre-order does not reserve stock,
// so there is nothing to pick a batch from. The batch decision happens later, at
// conversion, on the order page.
@Component({
    selector: 'pre-order-form',
    standalone: true,
    imports: [CommonModule, NgZorroCustomModule, ReactiveFormsModule, SelectPreOrderProductComponent],
    templateUrl: './pre-order-form.component.html',
    styleUrl: './pre-order-form.component.scss',
})
export class PreOrderFormComponent {
    preOrder = input<any>(undefined);
    readonly actions = output<FormActions>();
    buttonLoading = input(false);

    private readonly _formBuilder = inject(FormBuilder);
    private readonly _modalService = inject(NzModalService);
    private readonly _httpService = inject(HttpService);
    private readonly _notificationService = inject(NzNotificationService);

    mode = computed(() => (this.preOrder() ? 'edit' : 'create'));

    confirmationMessage = computed(() => (this.mode() === 'edit' ? 'Are you sure you want to update this pre-order?' : 'Are you sure you want to create this pre-order?'));

    // Once confirmed, the booking is a commitment: lines are frozen and only
    // money and contact details stay editable (FR-16).
    linesEditable = computed(() => {
        const current = this.preOrder();
        return !current || current.status === 'Pending';
    });

    items = signal<any[]>([]);
    editingItem: any = null;
    editingIndex: number | null = null;

    form = this._formBuilder.nonNullable.group({
        oid: [null as string | null],
        preorder_no: [null as string | null],
        customer_name: [null as string | null, [Validators.required]],
        customer_phone: [null as string | null, [Validators.required, Validators.pattern(Constants.MOBILE_NO_REGEX)]],
        customer_email: [null as string | null, [Validators.email]],
        // Optional at booking on purpose: a customer booking months ahead may not
        // have a final delivery address yet. It becomes required at conversion.
        customer_address: [null as string | null],
        delivery_city: [null as string | null],
        delivery_zone: [null as string | null],
        delivery_area: [null as string | null],
        delivery_postcode: [null as string | null],
        discount_total: [0],
        delivery_charge: [0],
        advance_paid: [0, [Validators.min(0)]],
        advance_method: [null as string | null],
        advance_reference: [null as string | null],
        expected_date: [null as string | null],
        notes: [null as string | null],
    });

    subtotal = computed(() => this.items().reduce((sum, i) => sum + Number(i.total || 0), 0));

    ngOnInit(): void {
        const preOrder = this.preOrder();
        if (preOrder) {
            this._patchForm(preOrder);
        } else {
            this._loadPreOrderNumber();
        }
    }

    private _patchForm(preOrder: any): void {
        this.form.patchValue({
            oid: preOrder.oid,
            preorder_no: preOrder.preorder_no,
            customer_name: preOrder.customer_name,
            customer_phone: preOrder.customer_phone,
            customer_email: preOrder.customer_email,
            customer_address: preOrder.customer_address,
            delivery_city: preOrder.delivery_city,
            delivery_zone: preOrder.delivery_zone,
            delivery_area: preOrder.delivery_area,
            delivery_postcode: preOrder.delivery_postcode,
            discount_total: Number(preOrder.discount_total || 0),
            delivery_charge: Number(preOrder.delivery_charge || 0),
            advance_paid: Number(preOrder.advance_paid || 0),
            advance_method: preOrder.advance_method,
            advance_reference: preOrder.advance_reference,
            expected_date: preOrder.expected_date,
            notes: preOrder.notes,
        });

        this.items.set(
            (preOrder.items || []).map((i: any) => ({
                product_oid: i.product_oid,
                product_name: i.product_name,
                sellable_quantity: i.sellable_quantity ?? 0,
                quantity: Number(i.quantity),
                unit_price: Number(i.unit_price),
                discount: Number(i.discount || 0),
                total: Number(i.total),
            }))
        );
    }

    private _loadPreOrderNumber(): void {
        this._httpService.get(APIEndpoint.GET_PRE_ORDER_NUMBER).subscribe({
            next: (res: any) => {
                if (res.status === 200 && res.body?.code === 200) {
                    this.form.get('preorder_no')?.setValue(res.body.data.preorder_no);
                }
            },
            error: () => {
                // Non-fatal: the server assigns a number on save if this is blank.
            },
        });
    }

    grandTotal = computed(() => this.subtotal() - Number(this.form.get('discount_total')?.value || 0) + Number(this.form.get('delivery_charge')?.value || 0));

    handleProductAction(event: { action: string; value: any }): void {
        if (event.action === 'cancel') {
            this.editingItem = null;
            this.editingIndex = null;
            return;
        }

        if (event.action === 'update' && this.editingIndex !== null) {
            const next = [...this.items()];
            next[this.editingIndex] = event.value;
            this.items.set(next);
            this.editingItem = null;
            this.editingIndex = null;
            return;
        }

        // Same product booked twice: merge rather than duplicating the line.
        const existingIndex = this.items().findIndex((i) => i.product_oid === event.value.product_oid);
        if (existingIndex > -1) {
            const next = [...this.items()];
            const merged = { ...next[existingIndex] };
            merged.quantity = Number(merged.quantity) + Number(event.value.quantity);
            merged.total = merged.quantity * Number(merged.unit_price) - Number(merged.discount || 0);
            next[existingIndex] = merged;
            this.items.set(next);
            return;
        }

        this.items.set([...this.items(), event.value]);
    }

    editItem(index: number): void {
        this.editingIndex = index;
        this.editingItem = { ...this.items()[index] };
    }

    removeItem(index: number): void {
        this.items.set(this.items().filter((_, i) => i !== index));
        if (this.editingIndex === index) {
            this.editingItem = null;
            this.editingIndex = null;
        }
    }

    onSubmit(): void {
        if (this.form.invalid) {
            markFormGroupTouched(this.form);
            return;
        }

        if (!this.items().length) {
            this._notificationService.warning('Pre-Order', 'Add at least one product to the pre-order');
            return;
        }

        const advance = Number(this.form.get('advance_paid')?.value || 0);
        if (advance > this.grandTotal()) {
            this._notificationService.warning('Pre-Order', 'Advance paid cannot be more than the pre-order total');
            return;
        }

        const payload = {
            ...this.form.getRawValue(),
            products: this.items().map((i) => ({
                product_oid: i.product_oid,
                product_name: i.product_name,
                quantity: Number(i.quantity),
                unit_price: Number(i.unit_price),
                discount: Number(i.discount || 0),
                total: Number(i.total),
            })),
        };

        this.showConfirmationModal(payload);
    }

    showConfirmationModal(payload: any): void {
        this._modalService.create({
            nzContent: ConfirmationModalComponent,
            nzData: {
                message: this.confirmationMessage(),
            },
            nzFooter: null,
            nzClosable: false,
            nzOnOk: () => this.handleForm(payload),
        });
    }

    handleForm(payload: any): void {
        if (this.mode() === 'create') {
            this.actions.emit({ action: 'save', data: payload });
        } else {
            this.actions.emit({ action: 'update', data: payload });
        }
    }

    resetForm(): void {
        this.form.reset({ discount_total: 0, delivery_charge: 0, advance_paid: 0 });
        this.items.set([]);
        this.editingItem = null;
        this.editingIndex = null;
    }

    onCancel(): void {
        this.actions.emit({ action: 'cancel' });
    }

    hasRequiredValidator(controlName: string): boolean {
        const control = this.form.get(controlName);
        if (!control) return false;
        return control.hasValidator(Validators.required);
    }
}
