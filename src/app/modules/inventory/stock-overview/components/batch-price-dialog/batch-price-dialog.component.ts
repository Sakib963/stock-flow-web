import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft, lucideCheck, lucideX } from '@ng-icons/lucide';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { StockBatch } from '@app/core/models/stock-overview.model';
import { StockOverviewService } from '@app/modules/inventory/stock-overview/services/stock-overview.service';
import { MoneyPipe } from '@app/shared/pipes/money/money.pipe';
import { failureKey } from '@app/shared/utils/request-failure/request-failure';
import { revealErrors } from '@app/shared/utils/reveal-errors/reveal-errors';

/**
 * A batch's selling price and maximum discount. Save turns the dialog into its confirmation, so a
 * second modal never opens over the first. The margin shows only to someone who may see cost.
 */
@Component({
    selector: 'batch-price-dialog',
    imports: [NgIcon, ReactiveFormsModule, NzButtonModule, NzFormModule, NzInputNumberModule, NzModalModule, TranslatePipe, MoneyPipe],
    providers: [provideIcons({ lucideArrowLeft, lucideCheck, lucideX })],
    templateUrl: './batch-price-dialog.component.html',
    styleUrl: './batch-price-dialog.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BatchPriceDialogComponent {
    private readonly _stock = inject(StockOverviewService);
    private readonly _message = inject(NzMessageService);
    private readonly _translate = inject(TranslateService);

    /** The batch being priced; null keeps the dialog closed. */
    readonly batch = input<StockBatch | null>(null);

    readonly saved = output<void>();
    readonly closed = output<void>();

    readonly saving = this._stock.saving;
    readonly confirming = signal(false);

    readonly form = inject(FormBuilder).nonNullable.group({
        selling_price: [0, [Validators.required, Validators.min(1)]],
        maximum_discount: [0, [Validators.required, Validators.min(0)]],
    });

    private readonly _value = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });

    /** What a unit leaves at full price after cost and budget; null when cost is not shown. */
    readonly margin = computed(() => {
        const batch = this.batch();
        if (!batch || batch.cost_price === undefined) return null;
        return Number(this._value().selling_price ?? 0) - Number(batch.cost_price) - Number(batch.budget_per_unit ?? 0);
    });

    readonly discountTooHigh = computed(() => Number(this._value().maximum_discount ?? 0) > Number(this._value().selling_price ?? 0));

    constructor() {
        effect(() => {
            const batch = this.batch();
            if (!batch) return;
            this.confirming.set(false);
            this.form.reset({ selling_price: batch.selling_price ?? 0, maximum_discount: batch.maximum_discount ?? 0 });
        });
    }

    review(): void {
        const batch = this.batch();
        if (!batch) return;
        revealErrors(this.form);
        if (this.form.invalid || this.discountTooHigh()) return;
        const { selling_price, maximum_discount } = this.form.getRawValue();
        if (batch.selling_price === selling_price && (batch.maximum_discount ?? 0) === maximum_discount) {
            this._message.info(this._translate.instant('form.nothingChanged'));
            this.closed.emit();
            return;
        }
        this.confirming.set(true);
    }

    save(): void {
        const batch = this.batch();
        if (!batch || this.saving()) return;
        const { selling_price, maximum_discount } = this.form.getRawValue();
        this._stock.updatePricing(batch.oid, selling_price, maximum_discount).subscribe({
            next: (changed) => {
                this._message[changed ? 'success' : 'info'](this._translate.instant(changed ? 'inventory.stockOverview.price.saved' : 'form.nothingChanged'));
                if (changed) this.saved.emit();
                else this.closed.emit();
            },
            error: (error: unknown) => {
                const key = error instanceof HttpErrorResponse && error.status === 409 ? 'inventory.stockOverview.price.internalUse' : failureKey(error, 'form.saveFailed');
                this._message.error(this._translate.instant(key));
            },
        });
    }
}
