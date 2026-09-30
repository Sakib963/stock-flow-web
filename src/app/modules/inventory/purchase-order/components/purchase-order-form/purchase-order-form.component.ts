import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, computed, effect, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideListOrdered, lucideRotateCw, lucideTrash2 } from '@ng-icons/lucide';
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
import { Subject, debounceTime, finalize, switchMap, catchError, of } from 'rxjs';

import { AisleChoice, PAYMENT_STATUSES, PURCHASE_TYPES, PaymentStatus, PurchasableProduct, PurchaseOrderDetails, PurchaseOrderPayload, PurchaseType, SupplierChoice, WarehouseChoice } from '@app/core/models/purchase-order.model';
import { LanguageService } from '@app/core/services/language/language.service';
import { PurchaseOrderService } from '@app/modules/inventory/purchase-order/services/purchase-order.service';
import { DigitsPipe } from '@app/shared/pipes/digits/digits.pipe';
import { MoneyPipe } from '@app/shared/pipes/money/money.pipe';
import { RecordDatePipe } from '@app/shared/pipes/record-date/record-date.pipe';
import { revealErrors } from '@app/shared/utils/reveal-errors/reveal-errors';
import { fromDay, toDay } from '@app/shared/utils/calendar-day/calendar-day';

/** What a product looks like on a line: enough to draw it without asking the server again. */
interface LineProduct {
    oid: string;
    name: string;
    sku: string | null;
    sellable: number;
    restock_threshold: number;
    sold_30_days: number | null;
    last_unit_price: string | null;
    last_supplier_name: string | null;
}

type LineGroup = FormGroup<{
    product_oid: FormControl<string>;
    warehouse_oid: FormControl<string>;
    aisle_oid: FormControl<string | null>;
    quantity: FormControl<number | null>;
    unit_price: FormControl<number | null>;
}>;

/**
 * The purchase order form, rendered by both the create page and the edit page.
 *
 * The products are a ledger: typed straight into rows, with a blank row always last. Picking a
 * product in it starts the next one, carrying the warehouse and aisle down, so a delivery going to
 * one place is typed once. A blank last row is not a line and never blocks saving.
 */
@Component({
    selector: 'purchase-order-form',
    imports: [DigitsPipe, MoneyPipe, RecordDatePipe, NgIcon, ReactiveFormsModule, NzButtonModule, NzDatePickerModule, NzFormModule, NzInputModule, NzInputNumberModule, NzRadioModule, NzSelectModule, NzSpinModule, NzTableModule, NzTooltipModule, TranslatePipe],
    providers: [provideIcons({ lucideListOrdered, lucideRotateCw, lucideTrash2 })],
    templateUrl: './purchase-order-form.component.html',
    styleUrl: './purchase-order-form.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PurchaseOrderFormComponent {
    private readonly _builder = inject(FormBuilder).nonNullable;
    private readonly _orders = inject(PurchaseOrderService);
    private readonly _host = inject<ElementRef<HTMLElement>>(ElementRef);
    private readonly _destroy = inject(DestroyRef);

    readonly language = inject(LanguageService).current;
    readonly formId = 'purchase-order-form';
    readonly purchaseTypes = PURCHASE_TYPES;
    readonly paymentStatuses = PAYMENT_STATUSES;

    /** The order being edited. Only a Submitted order reaches this form. */
    readonly editing = input<PurchaseOrderDetails | null>(null);

    readonly submitted = output<void>();

    readonly lines = this._builder.array<LineGroup>([]);

    readonly form = this._builder.group({
        supplier_oid: ['', [Validators.required]],
        purchase_type: ['' as PurchaseType | '', [Validators.required]],
        expected_delivery_date: [null as Date | null],
        payment_status: ['' as PaymentStatus | '', [Validators.required]],
        paid_amount: [null as number | null],
        special_notes: ['', [Validators.maxLength(1000)]],
        lines: this.lines,
    });

    private readonly _value = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });

    readonly suppliers = signal<SupplierChoice[]>([]);
    readonly warehouses = signal<WarehouseChoice[]>([]);
    readonly aisles = signal<AisleChoice[]>([]);
    readonly choicesFailed = signal(false);
    readonly suppliersLoading = signal(true);
    readonly warehousesLoading = signal(true);
    readonly aislesLoading = signal(true);

    /** Every product a line has picked, by oid, so a row draws its name, stock and last price. */
    readonly products = signal<Record<string, LineProduct>>({});
    readonly results = signal<PurchasableProduct[]>([]);
    readonly searching = signal(false);
    /** The row whose product search is open: the results belong to it alone. */
    readonly searchRow = signal<number | null>(null);
    private readonly _search = new Subject<string>();

    /** The lines that count: a product picked. The blank row at the end is not a line. */
    readonly started = computed(() => (this._value().lines ?? []).filter((line) => !!line?.product_oid));

    readonly total = computed(() => this.started().reduce((sum, line) => sum + (Number(line.quantity) || 0) * (Number(line.unit_price) || 0), 0));

    readonly partial = computed(() => this._value().payment_status === 'partially_paid');

    /** What Save is still waiting for, counted for the action bar. */
    readonly remaining = computed(() => {
        const value = this._value();
        const header = [value.supplier_oid, value.purchase_type, value.payment_status].filter((field) => !field).length;
        const paid = value.payment_status === 'partially_paid' && !value.paid_amount ? 1 : 0;
        const lines = this.started().length ? this.started().filter((line) => !line.warehouse_oid || !line.quantity || line.unit_price === null || line.unit_price === undefined).length : 1;
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
        this.addBlankLine();

        this._search
            .pipe(
                debounceTime(250),
                switchMap((term) => this._orders.searchProducts(term).pipe(catchError(() => of([] as PurchasableProduct[])))),
                takeUntilDestroyed(this._destroy)
            )
            .subscribe((found) => {
                this.results.set(found);
                this.searching.set(false);
            });

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

    aislesOf(warehouse: string | null): AisleChoice[] {
        return warehouse ? this.aisles().filter((aisle) => aisle.warehouse_oid === warehouse) : [];
    }

    search(row: number, term: string): void {
        this.searchRow.set(row);
        // From the keystroke, not after the debounce, so the picker never says nothing matches while it is still asking.
        this.searching.set(true);
        this._search.next(term);
    }

    /** What a row's product picker offers: its own product, then the search results while it is the one searching. */
    optionsFor(row: number): LineProduct[] {
        const own = this.products()[this.lines.at(row).controls.product_oid.value];
        const found = this.searchRow() === row ? this.results() : [];
        return own && !found.some((p) => p.oid === own.oid) ? [own, ...found] : found;
    }

    /** How many other lines already carry this product, so it is marked rather than refused: two warehouses is a real case. */
    alreadyOn(product: string, row: number): boolean {
        return this.lines.controls.some((line, index) => index !== row && line.controls.product_oid.value === product);
    }

    private picked(line: LineGroup, product: string): void {
        const row = this.lines.controls.indexOf(line);
        if (row < 0 || !product) return;
        const found = this.results().find((p) => p.oid === product);
        if (found) this.products.update((known) => ({ ...known, [found.oid]: found }));

        if (found && line.controls.unit_price.value === null && found.last_unit_price !== null) line.controls.unit_price.setValue(Number(found.last_unit_price));
        if (row === this.lines.length - 1) this.addBlankLine(line);

        // Enter picks, then moves on to the quantity.
        setTimeout(() => this._host.nativeElement.querySelector<HTMLInputElement>(`#po-line-${row}-quantity input`)?.focus());
    }

    /** An aisle belongs to one warehouse, so moving the line elsewhere drops an aisle that is not there. */
    private warehouseChanged(line: LineGroup): void {
        const aisle = line.controls.aisle_oid.value;
        if (aisle && !this.aislesOf(line.controls.warehouse_oid.value).some((a) => a.value === aisle)) line.controls.aisle_oid.setValue(null);
    }

    removeLine(row: number): void {
        this.lines.removeAt(row);
        this.lines.markAsDirty();
        if (!this.lines.length || this.lines.at(this.lines.length - 1).controls.product_oid.value) this.addBlankLine();
    }

    isBlank(row: number): boolean {
        return !this.lines.at(row).controls.product_oid.value;
    }

    lineTotal(row: number): number | null {
        const { quantity, unit_price, product_oid } = this.lines.at(row).getRawValue();
        return product_oid && quantity && unit_price !== null ? quantity * unit_price : null;
    }

    lineInvalid(row: number): boolean {
        const line = this.lines.at(row);
        return !!line.controls.product_oid.value && line.invalid && line.touched;
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
            products: raw.lines.filter((line) => !!line.product_oid).map((line) => ({ product_oid: line.product_oid, warehouse_oid: line.warehouse_oid || null, aisle_oid: line.aisle_oid || null, quantity: number(line.quantity), unit_price: number(line.unit_price) })),
        };
    }

    /** Valid once every header field and every started line is complete, and at least one line is. */
    valid(): boolean {
        revealErrors(this.form);
        for (const line of this.lines.controls) if (line.controls.product_oid.value) line.markAllAsTouched();
        const lines = this.lines.controls.filter((line) => !!line.controls.product_oid.value);
        const header = ['supplier_oid', 'purchase_type', 'payment_status', 'paid_amount', 'special_notes'].every((key) => this.form.get(key)!.valid);
        return header && lines.length > 0 && lines.every((line) => line.valid);
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

    private addBlankLine(from?: LineGroup): void {
        const warehouse = from?.controls.warehouse_oid.value ?? '';
        const line: LineGroup = this._builder.group({
            product_oid: [''],
            warehouse_oid: [warehouse, [Validators.required]],
            aisle_oid: [from?.controls.aisle_oid.value ?? (null as string | null)],
            quantity: [null as number | null, [Validators.required, Validators.min(1), Validators.max(9999)]],
            unit_price: [null as number | null, [Validators.required, Validators.min(0), Validators.max(99999999)]],
        }) as LineGroup;
        line.controls.product_oid.valueChanges.pipe(takeUntilDestroyed(this._destroy)).subscribe((product) => this.picked(line, product));
        line.controls.warehouse_oid.valueChanges.pipe(takeUntilDestroyed(this._destroy)).subscribe(() => this.warehouseChanged(line));
        this.lines.push(line);
    }

    private fill(record: PurchaseOrderDetails): void {
        const { details, lines } = record;
        this.products.update((known) => ({
            ...known,
            ...Object.fromEntries(lines.map((line) => [line.product_oid, { oid: line.product_oid, name: line.product_name, sku: line.sku, sellable: line.sellable, restock_threshold: line.restock_threshold, sold_30_days: null, last_unit_price: null, last_supplier_name: null }])),
        }));

        this.lines.clear();
        for (const line of lines) {
            this.addBlankLine();
            this.lines.at(this.lines.length - 1).setValue({ product_oid: line.product_oid, warehouse_oid: line.warehouse_oid ?? '', aisle_oid: line.aisle_oid, quantity: line.ordered_quantity, unit_price: line.ordered_unit_price === null ? null : Number(line.ordered_unit_price) }, { emitEvent: false });
        }
        this.addBlankLine(this.lines.at(this.lines.length - 1));

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
