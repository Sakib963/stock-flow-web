import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowRight, lucideCheck } from '@ng-icons/lucide';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { TranslatePipe } from '@ngx-translate/core';
import { BUDGET_KEYS, BudgetKey, Budgets, IntendedUse, PurchaseOrderLine, VerifyLinePayload } from '@app/core/models/purchase-order.model';
import { DigitsPipe } from '@app/shared/pipes/digits/digits.pipe';
import { MoneyPipe } from '@app/shared/pipes/money/money.pipe';
import { revealErrors } from '@app/shared/utils/reveal-errors/reveal-errors';
import { budgetPerUnit, marginPerUnit } from '@app/modules/inventory/purchase-order/utils/verify-line/verify-line';

/** A discount can never be more than the price it comes off. */
const discountWithinPrice = (group: AbstractControl): ValidationErrors | null => {
    const { intended_use, selling_price, maximum_discount } = group.value as { intended_use: IntendedUse; selling_price: number | null; maximum_discount: number | null };
    return intended_use === 'for_sale' && selling_price !== null && maximum_discount !== null && maximum_discount > selling_price ? { discountAbovePrice: true } : null;
};

/**
 * Everything about one line of a delivery, opened from the line's Edit or by clicking the row: what
 * arrived, the price billed, what the stock is for, how it sells and the budgets set against it.
 * "Save, next line" moves straight on to the next line still to check.
 */
@Component({
    selector: 'verify-line-drawer',
    imports: [DigitsPipe, MoneyPipe, NgIcon, ReactiveFormsModule, NzButtonModule, NzDrawerModule, NzFormModule, NzInputModule, NzInputNumberModule, NzRadioModule, TranslatePipe],
    providers: [provideIcons({ lucideArrowRight, lucideCheck })],
    templateUrl: './verify-line-drawer.component.html',
    styleUrl: './verify-line-drawer.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VerifyLineDrawerComponent {
    private readonly _builder = inject(FormBuilder).nonNullable;

    readonly budgetKeys = BUDGET_KEYS;

    /** The line being checked; null keeps the drawer closed. */
    readonly line = input<PurchaseOrderLine | null>(null);
    /** What was already recorded for it, if anything. */
    readonly value = input<VerifyLinePayload | null>(null);
    readonly hasNext = input(false);

    readonly saved = output<{ value: VerifyLinePayload; next: boolean }>();
    readonly closed = output<void>();

    readonly form = this._builder.group(
        {
            received_quantity: [0, [Validators.required, Validators.min(0)]],
            unit_price: [0, [Validators.required, Validators.min(0)]],
            intended_use: ['for_sale' as IntendedUse, [Validators.required]],
            selling_price: [null as number | null],
            maximum_discount: [null as number | null],
            ad_run_cost: [null as number | null],
            packaging_cost: [null as number | null],
            gift_cost: [null as number | null],
            content_creation_cost: [null as number | null],
            influencer_cost: [null as number | null],
            cost_remarks: ['', [Validators.maxLength(500)]],
        },
        { validators: [discountWithinPrice] }
    );

    private readonly _value = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });

    readonly forSale = computed(() => this._value().intended_use === 'for_sale');

    readonly short = computed(() => {
        const line = this.line();
        return line ? Math.max(line.ordered_quantity - Number(this._value().received_quantity ?? 0), 0) : 0;
    });

    readonly receivedTotal = computed(() => Number(this._value().received_quantity ?? 0) * Number(this._value().unit_price ?? 0));

    readonly budgetPerUnit = computed(() => budgetPerUnit(this._value() as Budgets));

    readonly margin = computed(() => {
        const value = this._value();
        return this.forSale() && value.selling_price !== null && value.selling_price !== undefined ? marginPerUnit(Number(value.selling_price), Number(value.unit_price ?? 0), this.budgetPerUnit()) : null;
    });

    constructor() {
        // Selling price and discount are needed only when the stock is for sale.
        this.form.controls.intended_use.valueChanges.subscribe((use) => this.applyUse(use));

        effect(() => {
            const line = this.line();
            if (!line) return;
            const recorded = this.value();
            this.form.reset({
                received_quantity: recorded?.received_quantity ?? line.ordered_quantity,
                unit_price: recorded?.unit_price ?? Number(line.ordered_unit_price),
                intended_use: recorded?.intended_use ?? 'for_sale',
                selling_price: recorded ? (recorded.selling_price ?? null) : line.current_selling_price !== null ? Number(line.current_selling_price) : null,
                maximum_discount: recorded ? (recorded.maximum_discount ?? null) : line.current_maximum_discount !== null ? Number(line.current_maximum_discount) : null,
                ad_run_cost: recorded?.ad_run_cost ?? null,
                packaging_cost: recorded?.packaging_cost ?? null,
                gift_cost: recorded?.gift_cost ?? null,
                content_creation_cost: recorded?.content_creation_cost ?? null,
                influencer_cost: recorded?.influencer_cost ?? null,
                cost_remarks: recorded?.cost_remarks ?? '',
            });
            this.form.controls.received_quantity.setValidators([Validators.required, Validators.min(0), Validators.max(line.ordered_quantity)]);
            this.form.controls.received_quantity.updateValueAndValidity();
            this.applyUse(this.form.controls.intended_use.value);
        });
    }

    save(next: boolean): void {
        const line = this.line();
        if (!line) return;
        revealErrors(this.form);
        if (this.form.invalid) return;

        const raw = this.form.getRawValue();
        const budgets = Object.fromEntries(BUDGET_KEYS.map((key) => [key, raw[key] ?? null])) as Record<BudgetKey, number | null>;
        this.saved.emit({
            next,
            value: {
                oid: line.oid,
                received_quantity: Number(raw.received_quantity),
                unit_price: Number(raw.unit_price),
                intended_use: raw.intended_use,
                ...(raw.intended_use === 'for_sale' ? { selling_price: Number(raw.selling_price), maximum_discount: Number(raw.maximum_discount) } : {}),
                ...budgets,
                cost_remarks: raw.cost_remarks.trim() || null,
            },
        });
    }

    invalid(field: 'received_quantity' | 'unit_price' | 'selling_price' | 'maximum_discount'): boolean | null {
        const control = this.form.controls[field];
        return control.invalid && control.touched ? true : null;
    }

    private applyUse(use: IntendedUse): void {
        const { selling_price, maximum_discount } = this.form.controls;
        selling_price.setValidators(use === 'for_sale' ? [Validators.required, Validators.min(1)] : []);
        maximum_discount.setValidators(use === 'for_sale' ? [Validators.required, Validators.min(0)] : []);
        selling_price.updateValueAndValidity({ emitEvent: false });
        maximum_discount.updateValueAndValidity({ emitEvent: false });
    }
}
