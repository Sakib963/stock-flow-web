import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideListOrdered, lucidePencil, lucidePlus, lucideRotateCw, lucideTrash2 } from '@ng-icons/lucide';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { TranslatePipe } from '@ngx-translate/core';
import { finalize } from 'rxjs';

import { AisleChoice, PAYMENT_STATUSES, PURCHASE_TYPES, PaymentStatus, PurchaseLineDraft, PurchaseOrderDetails, PurchaseOrderPayload, PurchaseType, SupplierChoice, WarehouseChoice } from '@app/core/models/purchase-order.model';
import { LanguageService } from '@app/core/services/language/language.service';
import { OrderLineDrawerComponent } from '@app/modules/inventory/purchase-order/components/order-line-drawer/order-line-drawer.component';
import { PurchaseOrderService } from '@app/modules/inventory/purchase-order/services/purchase-order.service';
import { lineComplete, lineTotal } from '@app/modules/inventory/purchase-order/utils/order-line/order-line';
import { DigitsPipe } from '@app/shared/pipes/digits/digits.pipe';
import { MoneyPipe } from '@app/shared/pipes/money/money.pipe';
import { RecordDatePipe } from '@app/shared/pipes/record-date/record-date.pipe';
import { revealErrors } from '@app/shared/utils/reveal-errors/reveal-errors';
import { fromDay, toDay } from '@app/shared/utils/calendar-day/calendar-day';

/**
 * The purchase order form, rendered by both the create page and the edit page.
 *
 * Lines are read only in the table and added or changed one at a time in a drawer, so the product
 * picker has the full width on a phone. A new line starts in the last line's warehouse and aisle.
 */
@Component({
    selector: 'purchase-order-form',
    imports: [DigitsPipe, MoneyPipe, RecordDatePipe, NgIcon, OrderLineDrawerComponent, ReactiveFormsModule, NzButtonModule, NzDatePickerModule, NzFormModule, NzInputModule, NzInputNumberModule, NzRadioModule, NzSelectModule, NzSpinModule, NzTableModule, NzTooltipModule, TranslatePipe],
    providers: [provideIcons({ lucideListOrdered, lucidePencil, lucidePlus, lucideRotateCw, lucideTrash2 })],
    templateUrl: './purchase-order-form.component.html',
    styleUrl: './purchase-order-form.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PurchaseOrderFormComponent {
    private readonly _builder = inject(FormBuilder).nonNullable;
    private readonly _orders = inject(PurchaseOrderService);
    private readonly _destroy = inject(DestroyRef);

    readonly language = inject(LanguageService).current;
    readonly formId = 'purchase-order-form';
    readonly purchaseTypes = PURCHASE_TYPES;
    readonly paymentStatuses = PAYMENT_STATUSES;

    /** The order being edited. Only a Submitted order reaches this form. */
    readonly editing = input<PurchaseOrderDetails | null>(null);

    readonly submitted = output<void>();

    readonly form = this._builder.group({
        supplier_oid: ['', [Validators.required]],
        purchase_type: ['' as PurchaseType | '', [Validators.required]],
        expected_delivery_date: [null as Date | null],
        payment_status: ['' as PaymentStatus | '', [Validators.required]],
        paid_amount: [null as number | null],
        special_notes: ['', [Validators.maxLength(1000)]],
    });

    private readonly _value = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });

    readonly suppliers = signal<SupplierChoice[]>([]);
    readonly warehouses = signal<WarehouseChoice[]>([]);
    readonly aisles = signal<AisleChoice[]>([]);
    readonly choicesFailed = signal(false);
    readonly suppliersLoading = signal(true);
    readonly warehousesLoading = signal(true);
    readonly aislesLoading = signal(true);

    readonly lines = signal<PurchaseLineDraft[]>([]);
    readonly drawerOpen = signal(false);
    /** The row the drawer is changing, or null while it adds one. */
    readonly editingRow = signal<number | null>(null);
    readonly drawerLine = computed(() => {
        const row = this.editingRow();
        return row === null ? null : (this.lines()[row] ?? null);
    });
    readonly carry = computed(() => {
        const last = this.lines()
            .filter((line) => !!line.warehouse_oid)
            .at(-1);
        return last ? { warehouse_oid: last.warehouse_oid, aisle_oid: last.aisle_oid } : null;
    });
    readonly onOtherLines = computed(() => new Set(this.lines().filter((_, i) => i !== this.editingRow()).map((line) => line.product.oid)));
    readonly choicesLoading = computed(() => this.warehousesLoading() || this.aislesLoading());
    /** A line kept from a draft can still be missing something; Submit waits for it. */
    readonly incomplete = computed(() => this.lines().map((line) => !lineComplete(line)));

    readonly total = computed(() => this.lines().reduce((sum, line) => sum + (lineTotal(line) ?? 0), 0));

    readonly partial = computed(() => this._value().payment_status === 'partially_paid');

    /** What Save is still waiting for, counted for the action bar. */
    readonly remaining = computed(() => {
        const value = this._value();
        const header = [value.supplier_oid, value.purchase_type, value.payment_status].filter((field) => !field).length;
        const paid = value.payment_status === 'partially_paid' && !value.paid_amount ? 1 : 0;
        const lines = this.lines().length ? this.incomplete().filter(Boolean).length : 1;
        return header + paid + lines;
    });

    /** The paid figure the payment status implies, shown beside the status the way the server records it. */
    readonly paidShown = computed(() => {
        const status = this._value().payment_status;
        if (status === 'paid') return this.total();
        if (status === 'unpaid') return 0;
        return null;
    });

    readonly paidWarning = computed(() => {
        const paid = Number(this._value().paid_amount ?? 0);
        return this.partial() && paid > 0 && this.total() > 0 && paid >= this.total();
    });

    constructor() {
        this.loadChoices();

        // Only a partial payment is typed. Paid and unpaid are what the server records anyway.
        this.form.controls.payment_status.valueChanges.pipe(takeUntilDestroyed(this._destroy)).subscribe((status) => {
            const paid = this.form.controls.paid_amount;
            paid.setValidators(status === 'partially_paid' ? [Validators.required, Validators.min(1)] : []);
            if (status !== 'partially_paid') paid.setValue(null, { emitEvent: false });
            paid.updateValueAndValidity();
        });

        effect(() => {
            const record = this.editing();
            if (!record) return;
            this.fill(record);
        });
    }

    loadChoices(): void {
        this.choicesFailed.set(false);
        const fail = () => this.choicesFailed.set(true);
        this.suppliersLoading.set(true);
        this.warehousesLoading.set(true);
        this.aislesLoading.set(true);
        this._orders
            .suppliers()
            .pipe(finalize(() => this.suppliersLoading.set(false)))
            .subscribe({ next: (rows) => this.suppliers.set(rows), error: fail });
        this._orders
            .warehouses()
            .pipe(finalize(() => this.warehousesLoading.set(false)))
            .subscribe({ next: (rows) => this.warehouses.set(rows), error: fail });
        this._orders
            .aisles()
            .pipe(finalize(() => this.aislesLoading.set(false)))
            .subscribe({ next: (rows) => this.aisles.set(rows), error: fail });
    }

    /** Name or phone, the way someone finds a supplier they know by either. */
    matchSupplier = (term: string, option: { nzValue: string }): boolean => {
        const supplier = this.suppliers().find((s) => s.value === option.nzValue);
        if (!supplier) return false;
        const needle = term.trim().toLowerCase();
        const digits = needle.replace(/\D/g, '');
        return supplier.label.toLowerCase().includes(needle) || (!!digits && supplier.phone_number.replace(/\D/g, '').includes(digits));
    };

    /** Where a line goes, as the table shows it. */
    whereAt(row: number): string {
        const line = this.lines()[row];
        const warehouse = this.warehouses().find((w) => w.value === line.warehouse_oid)?.label;
        const aisle = this.aisles().find((a) => a.value === line.aisle_oid)?.label;
        return warehouse ? (aisle ? warehouse + ' › ' + aisle : warehouse) : '';
    }

    lineTotalAt(row: number): number | null {
        return lineTotal(this.lines()[row]);
    }

    addLine(): void {
        this.editingRow.set(null);
        this.drawerOpen.set(true);
    }

    editLine(row: number): void {
        this.editingRow.set(row);
        this.drawerOpen.set(true);
    }

    closeDrawer(): void {
        this.drawerOpen.set(false);
        this.editingRow.set(null);
    }

    saveLine(line: PurchaseLineDraft): void {
        const row = this.editingRow();
        this.lines.update((lines) => (row === null ? [...lines, line] : lines.map((old, i) => (i === row ? line : old))));
        this.form.markAsDirty();
        this.closeDrawer();
    }

    removeLine(row: number): void {
        this.lines.update((lines) => lines.filter((_, i) => i !== row));
        this.form.markAsDirty();
    }

    /** Whether the order being edited has been submitted: its payment is then shown, never sent. */
    readonly submittedOrder = computed(() => !!this.editing() && this.editing()!.details.status !== 'Draft');

    /** As a draft, a half typed line is sent as it is; the server checks it on submit. */
    payload(draft = false): PurchaseOrderPayload {
        const raw = this.form.getRawValue();
        const status = (raw.payment_status || null) as PaymentStatus | null;
        const payment = this.submittedOrder() ? {} : { payment_status: status, paid_amount: status === 'partially_paid' ? Number(raw.paid_amount ?? 0) : 0 };
        const number = (value: number | null) => (value === null || value === undefined || (value as unknown) === '' ? null : Number(value));
        return {
            ...(this.editing() ? { oid: this.editing()!.details.oid } : {}),
            draft,
            ...payment,
            supplier_oid: raw.supplier_oid,
            purchase_type: (raw.purchase_type || null) as PurchaseType | null,
            expected_delivery_date: toDay(raw.expected_delivery_date),
            special_notes: raw.special_notes.trim() || null,
            products: this.lines().map((line) => ({ product_oid: line.product.oid, warehouse_oid: line.warehouse_oid, aisle_oid: line.aisle_oid, quantity: number(line.quantity), unit_price: number(line.unit_price) })),
        };
    }

    /** Valid once every header field and every started line is complete, and at least one line is. */
    valid(): boolean {
        revealErrors(this.form);
        const header = ['supplier_oid', 'purchase_type', 'payment_status', 'paid_amount', 'special_notes'].every((key) => this.form.get(key)!.valid);
        return header && this.lines().length > 0 && this.incomplete().every((missing) => !missing);
    }

    /** A draft needs only its supplier: 20 or 30 lines are rarely typed in one sitting. */
    validDraft(): boolean {
        const supplier = this.form.controls.supplier_oid;
        supplier.markAsTouched();
        supplier.updateValueAndValidity();
        return supplier.valid;
    }

    invalid(field: 'supplier_oid' | 'purchase_type' | 'payment_status' | 'paid_amount'): boolean | null {
        const control = this.form.controls[field];
        return control.invalid && control.touched ? true : null;
    }

    private fill(record: PurchaseOrderDetails): void {
        const { details, lines } = record;
        this.lines.set(
            lines.map((line) => ({
                product: { oid: line.product_oid, name: line.product_name, sku: line.sku, sellable: line.sellable, restock_threshold: line.restock_threshold, sold_30_days: null, last_unit_price: null, last_supplier_name: null },
                warehouse_oid: line.warehouse_oid,
                aisle_oid: line.aisle_oid,
                quantity: line.ordered_quantity,
                unit_price: line.ordered_unit_price === null ? null : Number(line.ordered_unit_price),
            }))
        );

        this.form.patchValue({
            supplier_oid: details.supplier_oid,
            purchase_type: details.purchase_type ?? '',
            expected_delivery_date: fromDay(details.expected_delivery_date),
            payment_status: details.payment_status ?? '',
            paid_amount: details.payment_status === 'partially_paid' ? Number(details.paid_amount) : null,
            special_notes: details.special_notes ?? '',
        });
        // Once submitted, payment is shown, not edited: it changes through Record payment, so an edit
        // opened before a payment was recorded cannot put the old one back. A draft's is still its own.
        if (details.status !== 'Draft') {
            this.form.controls.payment_status.disable({ emitEvent: false });
            this.form.controls.paid_amount.disable({ emitEvent: false });
        }
        // Loading a record is not someone typing, so leaving straight after must not ask.
        this.form.markAsPristine();
    }
}
