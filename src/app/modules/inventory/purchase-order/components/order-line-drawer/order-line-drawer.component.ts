import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCheck, lucideX } from '@ng-icons/lucide';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { TranslatePipe } from '@ngx-translate/core';
import { Subject, catchError, debounceTime, of, switchMap } from 'rxjs';
import { AisleChoice, LineProduct, PurchasableProduct, PurchaseLineDraft, WarehouseChoice } from '@app/core/models/purchase-order.model';
import { PurchaseOrderService } from '@app/modules/inventory/purchase-order/services/purchase-order.service';
import { lineComplete, lineTotal } from '@app/modules/inventory/purchase-order/utils/order-line/order-line';
import { DigitsPipe } from '@app/shared/pipes/digits/digits.pipe';
import { MoneyPipe } from '@app/shared/pipes/money/money.pipe';
import { categoryGroups } from '@app/shared/utils/category-groups/category-groups';

const number = (value: unknown): number | null => (value === null || value === undefined || value === '' ? null : Number(value));

/**
 * One purchase order line, added or changed in a drawer: every field at full width, so the product
 * picker is usable on a phone, with the product's stock and last price shown as it is picked.
 */
@Component({
    selector: 'order-line-drawer',
    imports: [DigitsPipe, MoneyPipe, FormsModule, NgIcon, ReactiveFormsModule, NzButtonModule, NzDrawerModule, NzFormModule, NzInputNumberModule, NzSelectModule, NzSpinModule, TranslatePipe],
    providers: [provideIcons({ lucideCheck, lucideX })],
    templateUrl: './order-line-drawer.component.html',
    styleUrl: './order-line-drawer.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderLineDrawerComponent {
    private readonly _orders = inject(PurchaseOrderService);
    private readonly _destroy = inject(DestroyRef);

    readonly open = input(false);
    /** The line being changed, or null to add one. */
    readonly line = input<PurchaseLineDraft | null>(null);
    /** Where the last line went, so a delivery to one place is chosen once. */
    readonly carry = input<{ warehouse_oid: string | null; aisle_oid: string | null } | null>(null);
    /** Products already on the other lines: marked, not refused, since two warehouses is a real case. */
    readonly onOtherLines = input<ReadonlySet<string>>(new Set());
    readonly warehouses = input<WarehouseChoice[]>([]);
    readonly aisles = input<AisleChoice[]>([]);
    readonly choicesLoading = input(false);

    /** Product rows are three lines in the picker, not the default one. */
    readonly optionHeight = 58;

    readonly saved = output<PurchaseLineDraft>();
    readonly closed = output<void>();

    readonly form = inject(FormBuilder).nonNullable.group({
        warehouse_oid: [''],
        aisle_oid: [null as string | null],
        quantity: [null as number | null],
        unit_price: [null as number | null],
    });
    readonly value = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });

    readonly product = signal<LineProduct | null>(null);
    readonly results = signal<PurchasableProduct[]>([]);
    /** A search the person typed; it shows the picker's spinner. */
    readonly searching = signal(false);
    /** The list loaded in the background as the drawer or picker opens; it never spins the picker. */
    readonly preloading = signal(false);
    private _lastTerm: string | null = null;
    private readonly _search = new Subject<string>();
    readonly tried = signal(false);

    readonly options = computed<LineProduct[]>(() => {
        const own = this.product();
        const found = this.results();
        return own && !found.some((p) => p.oid === own.oid) ? [own, ...found] : found;
    });
    readonly optionGroups = computed(() => categoryGroups(this.options()));
    readonly aislesHere = computed(() => this.aisles().filter((aisle) => aisle.warehouse_oid === this.value().warehouse_oid));
    readonly lineTotal = computed(() => lineTotal({ quantity: number(this.value().quantity), unit_price: number(this.value().unit_price) }));
    readonly incomplete = computed(() => this.tried() && !lineComplete(this.draft()));

    constructor() {
        this._search
            .pipe(
                debounceTime(250),
                switchMap((term) => this._orders.searchProducts(term).pipe(catchError(() => of([] as PurchasableProduct[])))),
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
        // A line starts at the last price paid for the product; it can be changed.
        const price = this.form.controls.unit_price;
        if (found && price.value === null && found.last_unit_price !== null) price.setValue(Number(found.last_unit_price));
    }

    save(): void {
        this.tried.set(true);
        const draft = this.draft();
        if (!lineComplete(draft)) return;
        this.saved.emit(draft);
    }

    private draft(): PurchaseLineDraft {
        const raw = this.form.getRawValue();
        return { product: this.product()!, warehouse_oid: raw.warehouse_oid || null, aisle_oid: raw.aisle_oid, quantity: number(raw.quantity), unit_price: number(raw.unit_price) };
    }

    private reset(): void {
        const line = this.line();
        const carry = this.carry();
        this.tried.set(false);
        this.results.set([]);
        this.product.set(line?.product ?? null);
        this.form.reset({
            warehouse_oid: line?.warehouse_oid ?? carry?.warehouse_oid ?? '',
            aisle_oid: line ? line.aisle_oid : (carry?.aisle_oid ?? null),
            quantity: line?.quantity ?? null,
            unit_price: line?.unit_price ?? null,
        });
        this.search('', true);
    }
}
