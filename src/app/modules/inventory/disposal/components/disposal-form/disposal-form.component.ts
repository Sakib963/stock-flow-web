import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideListOrdered, lucidePencil, lucidePlus, lucideTrash2 } from '@ng-icons/lucide';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { TranslatePipe } from '@ngx-translate/core';
import { DISPOSAL_METHODS, DisposalLineDraft, DisposalMethod, DisposalPayload, DisposalRecord } from '@app/core/models/disposal.model';
import { DisposalLineDrawerComponent } from '@app/modules/inventory/disposal/components/disposal-line-drawer/disposal-line-drawer.component';
import { lineProblem } from '@app/modules/inventory/disposal/utils/disposal-line/disposal-line';
import { DigitsPipe } from '@app/shared/pipes/digits/digits.pipe';
import { MoneyPipe } from '@app/shared/pipes/money/money.pipe';
import { revealErrors } from '@app/shared/utils/reveal-errors/reveal-errors';

/**
 * The disposal form, rendered by both the create page and the edit page. Lines are read only in the
 * table and added or changed one at a time in a drawer, as on a stock adjustment.
 */
@Component({
    selector: 'disposal-form',
    imports: [DisposalLineDrawerComponent, DigitsPipe, MoneyPipe, NgIcon, ReactiveFormsModule, NzButtonModule, NzFormModule, NzInputModule, NzSelectModule, NzTableModule, NzTooltipModule, TranslatePipe],
    providers: [provideIcons({ lucideListOrdered, lucidePencil, lucidePlus, lucideTrash2 })],
    templateUrl: './disposal-form.component.html',
    styleUrl: './disposal-form.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DisposalFormComponent {
    readonly formId = 'disposal-form';
    readonly methods = DISPOSAL_METHODS;

    readonly editing = input<DisposalRecord | null>(null);
    readonly submitted = output<void>();

    readonly form = inject(FormBuilder).nonNullable.group({
        method: [null as DisposalMethod | null],
        note: ['', [Validators.maxLength(1000)]],
    });

    readonly lines = signal<DisposalLineDraft[]>([]);
    readonly started = this.lines.asReadonly();
    readonly drawerOpen = signal(false);
    /** The row the drawer is changing, or null while it adds one. */
    readonly editingRow = signal<number | null>(null);
    readonly drawerLine = computed(() => {
        const row = this.editingRow();
        return row === null ? null : (this.lines()[row] ?? null);
    });

    readonly units = computed(() => this.lines().reduce((sum, line) => sum + (Number(line.quantity) || 0), 0));
    readonly problems = computed(() => this.lines().map((line) => lineProblem(line)));
    /** What Submit is still waiting for, counted for the action bar. */
    readonly remaining = computed(() => (this.lines().length ? this.problems().filter((key) => key !== null).length : 1));

    constructor() {
        effect(() => {
            const record = this.editing();
            if (record) this.fill(record);
        });
    }

    valueOf(line: DisposalLineDraft): number | null {
        const cost = line.batch?.cost_price;
        return cost === undefined || cost === null || !line.quantity ? null : Number(cost) * line.quantity;
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

    saveLine(line: DisposalLineDraft): void {
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
        return this.form.valid && this.lines().length > 0 && this.problems().every((key) => key === null);
    }

    /** A draft needs nothing more than what is typed so far. */
    validDraft(): boolean {
        revealErrors(this.form);
        return this.form.valid;
    }

    payload(draft = false): DisposalPayload {
        const raw = this.form.getRawValue();
        return {
            ...(this.editing() ? { oid: this.editing()!.details.oid } : {}),
            draft,
            method: raw.method,
            note: raw.note.trim() || null,
            lines: this.lines().map(({ product: _product, batch: _batch, ...line }) => line),
        };
    }

    private fill(record: DisposalRecord): void {
        const { details, lines } = record;
        this.form.setValue({ method: details.method, note: details.note ?? '' });
        // A stored line knows only its own batch; the drawer fetches the product's others when it opens.
        this.lines.set(
            lines.map((line) => {
                const batch = line.inventory_oid
                    ? { oid: line.inventory_oid, batch_code: line.batch_code ?? '', intended_use: 'for_sale' as const, on_hand: line.on_hand ?? 0, free: line.free ?? 0, cost_price: line.cost_price, selling_price: null, maximum_discount: null, warehouse_name: line.warehouse_name, expiry_date: line.expiry_date }
                    : null;
                return {
                    product: { oid: line.product_oid, name: line.product_name, sku: line.sku, has_expiry: false, unit_type: line.unit_type, photo_thumb: null, batches: batch ? [batch] : [] },
                    batch,
                    product_oid: line.product_oid,
                    inventory_oid: line.inventory_oid,
                    quantity: line.quantity,
                    reason: line.reason,
                    line_note: line.line_note,
                };
            })
        );
        this.form.markAsPristine();
    }
}
