import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { NzTableModule } from 'ng-zorro-antd/table';
import { TranslatePipe } from '@ngx-translate/core';
import { BUDGET_KEYS, Budgets } from '@app/core/models/purchase-order.model';
import { DigitsPipe } from '@app/shared/pipes/digits/digits.pipe';
import { MoneyPipe } from '@app/shared/pipes/money/money.pipe';

/**
 * A batch's budgets as entered, per unit, beside what each comes to for the whole batch, with the
 * overall total. Shown wherever budgets are entered or read: a purchase order line, a stock
 * adjustment's new batch, and a batch on the stock overview.
 */
@Component({
    selector: 'budget-totals',
    imports: [NzTableModule, TranslatePipe, DigitsPipe, MoneyPipe],
    templateUrl: './budget-totals.component.html',
    styleUrl: './budget-totals.component.scss',
    host: { class: 'block' },
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BudgetTotalsComponent {
    readonly budgets = input<Partial<Budgets> | null>(null);
    /** The batch's units: what arrived, what the adjustment adds, or what the batch started with. */
    readonly units = input(0);

    readonly rows = computed(() => {
        const budgets = this.budgets();
        const units = Math.max(this.units() ?? 0, 0);
        return BUDGET_KEYS.map((key) => {
            const perUnit = budgets?.[key] ?? null;
            return { key, perUnit, total: perUnit === null ? null : Number(perUnit) * units };
        });
    });
    readonly perUnit = computed(() => this.rows().reduce((sum, row) => sum + Number(row.perUnit ?? 0), 0));
    readonly total = computed(() => this.rows().reduce((sum, row) => sum + (row.total ?? 0), 0));
}
