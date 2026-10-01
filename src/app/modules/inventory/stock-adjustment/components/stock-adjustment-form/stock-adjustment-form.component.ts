import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideListOrdered, lucidePencil, lucidePlus, lucideRotateCw, lucideTrash2 } from '@ng-icons/lucide';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { TranslatePipe } from '@ngx-translate/core';
import { finalize } from 'rxjs';

import { AisleChoice, BUDGET_KEYS, Budgets, WarehouseChoice } from '@app/core/models/purchase-order.model';
import { ADJUSTMENT_REASONS, AdjustmentLineDraft, AdjustmentReason, IntendedUse, StockAdjustmentPayload, StockAdjustmentRecord } from '@app/core/models/stock-adjustment.model';
import { AdjustmentLineDrawerComponent } from '@app/modules/inventory/stock-adjustment/components/adjustment-line-drawer/adjustment-line-drawer.component';
import { StockAdjustmentService } from '@app/modules/inventory/stock-adjustment/services/stock-adjustment.service';
import { directionOf, isNewBatch, lineProblem } from '@app/modules/inventory/stock-adjustment/utils/adjustment-line/adjustment-line';
import { DigitsPipe } from '@app/shared/pipes/digits/digits.pipe';
import { MoneyPipe } from '@app/shared/pipes/money/money.pipe';
import { revealErrors } from '@app/shared/utils/reveal-errors/reveal-errors';

const number = (value: unknown): number | null => (value === null || value === undefined || value === '' ? null : Number(value));

/**
 * The stock adjustment form, rendered by both the create page and the edit page.
 *
 * The reason decides which way the lines go. Lines are read only in the table and added or changed
 * one at a time in a drawer, so every picker there has the full width.
 */
@Component({
    selector: 'stock-adjustment-form',
    imports: [AdjustmentLineDrawerComponent, DigitsPipe, MoneyPipe, NgIcon, ReactiveFormsModule, NzButtonModule, NzFormModule, NzInputModule, NzRadioModule, NzTableModule, NzTooltipModule, TranslatePipe],
    providers: [provideIcons({ lucideListOrdered, lucidePencil, lucidePlus, lucideRotateCw, lucideTrash2 })],
    templateUrl: './stock-adjustment-form.component.html',
    styleUrl: './stock-adjustment-form.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StockAdjustmentFormComponent {
    private readonly _adjustments = inject(StockAdjustmentService);

    readonly formId = 'stock-adjustment-form';
    readonly reasons = ADJUSTMENT_REASONS;

    readonly editing = input<StockAdjustmentRecord | null>(null);
    /** A reason chosen before the form opens, such as Opening stock from the stock overview. */
    readonly presetReason = input<AdjustmentReason | null>(null);

    readonly submitted = output<void>();

    readonly form = inject(FormBuilder).nonNullable.group({
        reason: ['' as AdjustmentReason | '', [Validators.required]],
        note: ['', [Validators.maxLength(1000)]],
    });

    private readonly _value = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });

    readonly warehouses = signal<WarehouseChoice[]>([]);
    readonly aisles = signal<AisleChoice[]>([]);
    readonly choicesLoading = signal(true);
    readonly choicesFailed = signal(false);

    readonly lines = signal<AdjustmentLineDraft[]>([]);
    readonly drawerOpen = signal(false);
    /** The row the drawer is changing, or null while it adds one. */
    readonly editingRow = signal<number | null>(null);
    readonly drawerLine = computed(() => {
        const row = this.editingRow();
        return row === null ? null : (this.lines()[row] ?? null);
    });
    /** Where the last line went, so a delivery to one place is chosen once. */
    readonly carry = computed(() => {
        const last = this.lines()
            .filter((line) => !!line.warehouse_oid)
            .at(-1);
        return last ? { warehouse_oid: last.warehouse_oid, aisle_oid: last.aisle_oid } : null;
    });

    readonly reason = computed(() => (this._value().reason || null) as AdjustmentReason | null);
    readonly started = this.lines.asReadonly();

    readonly unitsIn = computed(() => this.unitsGoing('in'));
    readonly unitsOut = computed(() => this.unitsGoing('out'));
    readonly problems = computed(() => this.lines().map((line) => lineProblem(this.reason(), line)));

    /** What Submit is still waiting for, counted for the action bar. */
    readonly remaining = computed(() => (this.reason() ? 0 : 1) + (this.lines().length ? this.problems().filter((key) => key !== null).length : 1));

    constructor() {
        this.loadChoices();

        effect(() => {
            const preset = this.presetReason();
            if (preset && !this.editing()) this.form.controls.reason.setValue(preset);
        });
        effect(() => {
            const record = this.editing();
            if (record) this.fill(record);
        });
    }

    loadChoices(): void {
        this.choicesFailed.set(false);
        this.choicesLoading.set(true);
        let pending = 2;
        const done = () => --pending === 0 && this.choicesLoading.set(false);
        const fail = () => this.choicesFailed.set(true);
        this._adjustments
            .warehouses()
            .pipe(finalize(done))
            .subscribe({ next: (rows) => this.warehouses.set(rows), error: fail });
        this._adjustments
            .aisles()
            .pipe(finalize(done))
            .subscribe({ next: (rows) => this.aisles.set(rows), error: fail });
    }

    directionAt(row: number) {
        return directionOf(this.reason(), this.lines()[row]);
    }

    isNewBatchAt(row: number): boolean {
        return isNewBatch(this.reason(), this.lines()[row]);
    }

    /** Where a line's units are: the place it chose for a new batch, or the batch's own. */
    whereAt(row: number): string | null {
        const line = this.lines()[row];
        if (!this.isNewBatchAt(row)) return line.batch?.warehouse_name ?? null;
        const warehouse = this.warehouses().find((w) => w.value === line.warehouse_oid)?.label;
        const aisle = this.aisles().find((a) => a.value === line.aisle_oid)?.label;
        return warehouse ? (aisle ? `${warehouse} › ${aisle}` : warehouse) : null;
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

    saveLine(line: AdjustmentLineDraft): void {
        const row = this.editingRow();
        this.lines.update((lines) => (row === null ? [...lines, line] : lines.map((old, i) => (i === row ? line : old))));
        this.form.markAsDirty();
        this.closeDrawer();
    }

    removeLine(row: number): void {
        this.lines.update((lines) => lines.filter((_, i) => i !== row));
        this.form.markAsDirty();
    }

    valid(): boolean {
        revealErrors(this.form);
        return !!this.reason() && this.form.controls.note.valid && this.lines().length > 0 && this.problems().every((key) => key === null);
    }

    /** A draft needs only its reason: a long opening stock is rarely typed in one sitting. */
    validDraft(): boolean {
        const reason = this.form.controls.reason;
        reason.markAsTouched();
        reason.updateValueAndValidity();
        return reason.valid;
    }

    payload(draft = false): StockAdjustmentPayload {
        const raw = this.form.getRawValue();
        const reason = raw.reason as AdjustmentReason;
        return {
            ...(this.editing() ? { oid: this.editing()!.details.oid } : {}),
            draft,
            reason,
            note: raw.note.trim() || null,
            lines: this.lines().map(({ product: _product, batch: _batch, ...line }) => ({ ...line, direction: reason === 'entry_error' ? line.direction : null })),
        };
    }

    private unitsGoing(direction: 'in' | 'out'): number {
        return this.lines().reduce((sum, line) => sum + (directionOf(this.reason(), line) === direction ? Number(line.quantity) || 0 : 0), 0);
    }

    private fill(record: StockAdjustmentRecord): void {
        const { details, lines } = record;
        this.form.controls.reason.setValue(details.reason);
        this.form.controls.note.setValue(details.note ?? '');
        // A stored line knows only its own batch; the drawer fetches the product's others when it opens.
        this.lines.set(
            lines.map((line) => {
                const batch = line.inventory_oid ? { oid: line.inventory_oid, batch_code: line.batch_code ?? '', intended_use: 'for_sale' as IntendedUse, on_hand: line.on_hand ?? 0, free: line.free ?? 0, selling_price: null, maximum_discount: null, warehouse_name: line.warehouse_name, expiry_date: line.expiry_date } : null;
                const fresh = !line.inventory_oid;
                return {
                    product: { oid: line.product_oid, name: line.product_name, sku: line.sku, has_expiry: line.has_expiry, unit_type: line.unit_type, photo_thumb: null, batches: batch ? [batch] : [] },
                    batch,
                    product_oid: line.product_oid,
                    direction: line.direction,
                    quantity: line.quantity,
                    inventory_oid: line.inventory_oid,
                    cost_price: fresh ? number(line.cost_price) : null,
                    intended_use: fresh ? line.intended_use : null,
                    selling_price: fresh ? number(line.selling_price) : null,
                    maximum_discount: fresh ? number(line.maximum_discount) : null,
                    warehouse_oid: fresh ? line.warehouse_oid : null,
                    aisle_oid: fresh ? line.aisle_oid : null,
                    expiry_date: fresh ? line.expiry_date : null,
                    ...(Object.fromEntries(BUDGET_KEYS.map((key) => [key, fresh ? number(line[key]) : null])) as Budgets),
                    cost_remarks: fresh ? (line.cost_remarks ?? null) : null,
                };
            })
        );
        this.form.markAsPristine();
    }
}
