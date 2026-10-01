import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCheck, lucideX } from '@ng-icons/lucide';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { TranslatePipe } from '@ngx-translate/core';
import { Subject, catchError, debounceTime, of, switchMap } from 'rxjs';
import { AisleChoice, BUDGET_KEYS, Budgets, WarehouseChoice } from '@app/core/models/purchase-order.model';
import { AdjustableProduct, AdjustmentDirection, AdjustmentLineDraft, AdjustmentReason, IntendedUse } from '@app/core/models/stock-adjustment.model';
import { StockAdjustmentService } from '@app/modules/inventory/stock-adjustment/services/stock-adjustment.service';
import { batchesFor, directionOf, isNewBatch, lineProblem } from '@app/modules/inventory/stock-adjustment/utils/adjustment-line/adjustment-line';
import { DigitsPipe } from '@app/shared/pipes/digits/digits.pipe';
import { MoneyPipe } from '@app/shared/pipes/money/money.pipe';
import { fromDay, toDay } from '@app/shared/utils/calendar-day/calendar-day';

const number = (value: unknown): number | null => (value === null || value === undefined || value === '' ? null : Number(value));

/**
 * One adjustment line, added or changed in a drawer: every field at full width, so no picker is cut
 * short, and the product's batches shown with what each holds and has free.
 */
@Component({
    selector: 'adjustment-line-drawer',
    imports: [DigitsPipe, MoneyPipe, FormsModule, NgIcon, ReactiveFormsModule, NzButtonModule, NzDatePickerModule, NzDrawerModule, NzFormModule, NzInputModule, NzInputNumberModule, NzRadioModule, NzSelectModule, NzSpinModule, TranslatePipe],
    providers: [provideIcons({ lucideCheck, lucideX })],
    templateUrl: './adjustment-line-drawer.component.html',
    styleUrl: './adjustment-line-drawer.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdjustmentLineDrawerComponent {
    private readonly _adjustments = inject(StockAdjustmentService);
    private readonly _destroy = inject(DestroyRef);

    readonly open = input(false);
    readonly reason = input<AdjustmentReason | null>(null);
    /** The line being changed, or null to add one. */
    readonly line = input<AdjustmentLineDraft | null>(null);
    /** Where the last line went, so a delivery to one place is chosen once. */
    readonly carry = input<{ warehouse_oid: string | null; aisle_oid: string | null } | null>(null);
    readonly warehouses = input<WarehouseChoice[]>([]);
    readonly aisles = input<AisleChoice[]>([]);
    readonly choicesLoading = input(false);

    /** The picker sizes its list by row height; product and batch rows are two lines, not the default one. */
    readonly optionHeight = 42;
    readonly budgetKeys = BUDGET_KEYS;

    readonly saved = output<AdjustmentLineDraft>();
    readonly closed = output<void>();

    readonly form = inject(FormBuilder).nonNullable.group({
        direction: [null as AdjustmentDirection | null],
        inventory_oid: [''],
        quantity: [null as number | null],
        cost_price: [null as number | null],
        intended_use: ['for_sale' as IntendedUse],
        selling_price: [null as number | null],
        maximum_discount: [null as number | null],
        warehouse_oid: [''],
        aisle_oid: [null as string | null],
        expiry_date: [null as Date | null],
        ad_run_cost: [null as number | null],
        packaging_cost: [null as number | null],
        gift_cost: [null as number | null],
        content_creation_cost: [null as number | null],
        influencer_cost: [null as number | null],
        cost_remarks: ['', [Validators.maxLength(500)]],
    });
    readonly value = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });

    readonly product = signal<AdjustableProduct | null>(null);
    readonly results = signal<AdjustableProduct[]>([]);
    /** A search the person typed; it shows the picker's spinner. */
    readonly searching = signal(false);
    /** The list loaded in the background as the drawer or picker opens; it never spins the picker. */
    readonly preloading = signal(false);
    private _lastTerm: string | null = null;
    private readonly _search = new Subject<string>();
    readonly tried = signal(false);

    readonly direction = computed(() => directionOf(this.reason(), { direction: this.value().direction ?? null }));
    readonly newBatch = computed(() => !!this.product() && isNewBatch(this.reason(), { direction: this.value().direction ?? null, inventory_oid: this.value().inventory_oid || null }));
    readonly batches = computed(() => batchesFor(this.reason(), this.direction(), this.product()));
    readonly batch = computed(() => this.product()?.batches.find((b) => b.oid === this.value().inventory_oid) ?? null);
    readonly options = computed(() => {
        const own = this.product();
        const found = this.results();
        return own && !found.some((p) => p.oid === own.oid) ? [own, ...found] : found;
    });
    readonly aislesHere = computed(() => this.aisles().filter((aisle) => aisle.warehouse_oid === this.value().warehouse_oid));
    readonly problem = computed(() => (this.tried() ? lineProblem(this.reason(), this.draft()) : null));

    constructor() {
        this._search
            .pipe(
                debounceTime(250),
                switchMap((term) => this._adjustments.searchProducts(term).pipe(catchError(() => of([] as AdjustableProduct[])))),
                takeUntilDestroyed(this._destroy)
            )
            .subscribe((found) => {
                this.results.set(found);
                this.searching.set(false);
                this.preloading.set(false);
            });

        // Checked against the warehouse just chosen: the form's own value still holds the old one here.
        this.form.controls.warehouse_oid.valueChanges.pipe(takeUntilDestroyed(this._destroy)).subscribe((warehouse) => {
            const aisle = this.form.controls.aisle_oid.value;
            if (aisle && !this.aisles().some((a) => a.value === aisle && a.warehouse_oid === warehouse)) this.form.controls.aisle_oid.setValue(null);
        });

        effect(() => {
            if (!this.open()) return;
            untracked(() => this.reset());
        });
    }

    search(term: string, quiet = false): void {
        this._lastTerm = term;
        (quiet ? this.preloading : this.searching).set(true);
        this._search.next(term);
    }

    /** Opening the picker shows the whole list again, unless it already does. */
    opened(open: boolean): void {
        if (open && (this._lastTerm !== '' || !this.results().length)) this.search('', true);
    }

    pickProduct(oid: string): void {
        const found = this.options().find((p) => p.oid === oid) ?? null;
        this.product.set(found);
        this.form.controls.inventory_oid.setValue('');
        // A new batch starts at the price and cost of the product's newest one; both can be changed.
        const newest = found?.batches[0];
        if (!newest) return;
        const controls = this.form.controls;
        if (controls.cost_price.value === null && newest.cost_price !== undefined) controls.cost_price.setValue(number(newest.cost_price));
        if (controls.selling_price.value === null) controls.selling_price.setValue(number(newest.selling_price));
        if (controls.maximum_discount.value === null) controls.maximum_discount.setValue(number(newest.maximum_discount));
    }

    save(): void {
        this.tried.set(true);
        if (lineProblem(this.reason(), this.draft()) !== null) return;
        this.saved.emit(this.draft());
    }

    draft(): AdjustmentLineDraft {
        const raw = this.form.getRawValue();
        const product = this.product();
        const fresh = this.newBatch();
        const for_sale = raw.intended_use === 'for_sale';
        return {
            product: product!,
            batch: fresh ? null : this.batch(),
            product_oid: product?.oid ?? '',
            direction: this.reason() === 'entry_error' ? raw.direction : null,
            quantity: number(raw.quantity),
            inventory_oid: fresh ? null : raw.inventory_oid || null,
            cost_price: fresh ? number(raw.cost_price) : null,
            intended_use: fresh ? raw.intended_use : null,
            selling_price: fresh && for_sale ? number(raw.selling_price) : null,
            maximum_discount: fresh && for_sale ? (number(raw.maximum_discount) ?? 0) : null,
            warehouse_oid: fresh ? raw.warehouse_oid || null : null,
            aisle_oid: fresh ? raw.aisle_oid : null,
            expiry_date: fresh && product?.has_expiry ? toDay(raw.expiry_date) : null,
            ...(Object.fromEntries(BUDGET_KEYS.map((key) => [key, fresh ? number(raw[key]) : null])) as Budgets),
            cost_remarks: fresh ? raw.cost_remarks.trim() || null : null,
        };
    }

    private reset(): void {
        const line = this.line();
        const carry = this.carry();
        this.tried.set(false);
        this.results.set([]);
        this.product.set(line?.product ?? null);
        this.form.reset({
            direction: line?.direction ?? null,
            // Opening stock never moves an existing batch, so a line kept from another reason lets its batch go.
            inventory_oid: this.reason() === 'opening_stock' ? '' : (line?.inventory_oid ?? ''),
            quantity: line?.quantity ?? null,
            cost_price: line?.cost_price ?? null,
            intended_use: line?.intended_use ?? 'for_sale',
            selling_price: line?.selling_price ?? null,
            maximum_discount: line?.maximum_discount ?? null,
            warehouse_oid: line?.warehouse_oid ?? carry?.warehouse_oid ?? '',
            aisle_oid: line?.aisle_oid ?? carry?.aisle_oid ?? null,
            expiry_date: fromDay(line?.expiry_date ?? null),
            ad_run_cost: line?.ad_run_cost ?? null,
            packaging_cost: line?.packaging_cost ?? null,
            gift_cost: line?.gift_cost ?? null,
            content_creation_cost: line?.content_creation_cost ?? null,
            influencer_cost: line?.influencer_cost ?? null,
            cost_remarks: line?.cost_remarks ?? '',
        });
        this.search('', true);
        if (line) this.refreshBatches(line.product);
    }

    /** A line opened for editing carries only its own batch; this brings the product's others without touching the picker. */
    private refreshBatches(product: AdjustableProduct): void {
        this._adjustments
            .searchProducts(product.sku || product.name)
            .pipe(
                catchError(() => of([] as AdjustableProduct[])),
                takeUntilDestroyed(this._destroy)
            )
            .subscribe((found) => {
                const fresh = found.find((p) => p.oid === product.oid);
                if (fresh && this.product()?.oid === fresh.oid) this.product.set(fresh);
            });
    }
}
