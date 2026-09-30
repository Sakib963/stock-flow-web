import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft, lucideCheck, lucideX } from '@ng-icons/lucide';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { BUDGET_KEYS, BudgetKey } from '@app/core/models/purchase-order.model';
import { StockBatch } from '@app/core/models/stock-overview.model';
import { amount } from '@app/modules/inventory/stock-overview/utils/amount/amount';
import { StockOverviewService } from '@app/modules/inventory/stock-overview/services/stock-overview.service';
import { DigitsPipe } from '@app/shared/pipes/digits/digits.pipe';
import { MoneyPipe } from '@app/shared/pipes/money/money.pipe';
import { failureKey } from '@app/shared/utils/request-failure/request-failure';
import { revealErrors } from '@app/shared/utils/reveal-errors/reveal-errors';

/** A batch's five budgets per unit and its remark, confirmed in the same dialog before saving. */
@Component({
    selector: 'batch-budget-dialog',
    imports: [NgIcon, ReactiveFormsModule, NzButtonModule, NzFormModule, NzInputModule, NzInputNumberModule, NzModalModule, TranslatePipe, DigitsPipe, MoneyPipe],
    providers: [provideIcons({ lucideArrowLeft, lucideCheck, lucideX })],
    templateUrl: './batch-budget-dialog.component.html',
    styleUrl: './batch-budget-dialog.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BatchBudgetDialogComponent {
    private readonly _stock = inject(StockOverviewService);
    private readonly _message = inject(NzMessageService);
    private readonly _translate = inject(TranslateService);

    readonly keys = BUDGET_KEYS;

    /** The batch whose budgets are changed; null keeps the dialog closed. */
    readonly batch = input<StockBatch | null>(null);

    readonly saved = output<void>();
    readonly closed = output<void>();

    readonly saving = this._stock.saving;
    readonly confirming = signal(false);

    readonly form = inject(FormBuilder).nonNullable.group({
        ad_run_cost: [null as number | null, [Validators.min(0)]],
        packaging_cost: [null as number | null, [Validators.min(0)]],
        gift_cost: [null as number | null, [Validators.min(0)]],
        content_creation_cost: [null as number | null, [Validators.min(0)]],
        influencer_cost: [null as number | null, [Validators.min(0)]],
        cost_remarks: ['', [Validators.maxLength(500)]],
    });

    private readonly _value = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });

    readonly perUnit = computed(() => BUDGET_KEYS.reduce((sum, key) => sum + Number(this._value()[key] ?? 0), 0));

    constructor() {
        effect(() => {
            const batch = this.batch();
            if (!batch) return;
            this.confirming.set(false);
            this.form.reset({
                ad_run_cost: amount(batch.ad_run_cost),
                packaging_cost: amount(batch.packaging_cost),
                gift_cost: amount(batch.gift_cost),
                content_creation_cost: amount(batch.content_creation_cost),
                influencer_cost: amount(batch.influencer_cost),
                cost_remarks: batch.cost_remarks ?? '',
            });
        });
    }

    review(): void {
        const batch = this.batch();
        if (!batch) return;
        revealErrors(this.form);
        if (this.form.invalid) return;
        const raw = this.form.getRawValue();
        const same = BUDGET_KEYS.every((key) => (raw[key] ?? null) === amount(batch[key])) && (raw.cost_remarks.trim() || null) === (batch.cost_remarks ?? null);
        if (same) {
            this._message.info(this._translate.instant('form.nothingChanged'));
            this.closed.emit();
            return;
        }
        this.confirming.set(true);
    }

    save(): void {
        const batch = this.batch();
        if (!batch || this.saving()) return;
        const raw = this.form.getRawValue();
        const budgets = Object.fromEntries(BUDGET_KEYS.map((key) => [key, raw[key] ?? null])) as Record<BudgetKey, number | null>;
        this._stock.updateBudget({ inventory_oid: batch.oid, ...budgets, cost_remarks: raw.cost_remarks.trim() || null }).subscribe({
            next: (changed) => {
                this._message[changed ? 'success' : 'info'](this._translate.instant(changed ? 'inventory.stockOverview.budget.saved' : 'form.nothingChanged'));
                if (changed) this.saved.emit();
                else this.closed.emit();
            },
            error: (error: unknown) => {
                this._message.error(this._translate.instant(failureKey(error, 'form.saveFailed')));
            },
        });
    }
}
