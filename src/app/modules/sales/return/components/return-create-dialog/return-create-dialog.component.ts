import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, model, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft, lucideCheck, lucideX } from '@ng-icons/lucide';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { OrderDetails } from '@app/core/models/order.model';
import { CreatedReturn, RETURN_REASONS, ReturnCondition, ReturnReason } from '@app/core/models/return.model';
import { ReturnService } from '@app/modules/sales/return/services/return.service';
import { DigitsPipe } from '@app/shared/pipes/digits/digits.pipe';
import { MoneyPipe } from '@app/shared/pipes/money/money.pipe';
import { failureKey } from '@app/shared/utils/request-failure/request-failure';

interface Pick {
    order_item_oid: string;
    product_name: string;
    returnable: number;
    per_unit: number;
    quantity: number;
    condition: ReturnCondition;
}

/**
 * Raises a return against a sale from its order record. It is recorded Pending and moves nothing; the
 * server works out the refund from what was paid, so the dialog shows only what the goods are worth.
 */
@Component({
    selector: 'return-create-dialog',
    imports: [FormsModule, NgIcon, NzButtonModule, NzCheckboxModule, NzFormModule, NzInputModule, NzInputNumberModule, NzModalModule, NzRadioModule, NzSelectModule, TranslatePipe, DigitsPipe, MoneyPipe],
    providers: [provideIcons({ lucideArrowLeft, lucideCheck, lucideX })],
    templateUrl: './return-create-dialog.component.html',
    styleUrl: './return-create-dialog.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReturnCreateDialogComponent {
    private readonly _returns = inject(ReturnService);
    private readonly _translate = inject(TranslateService);
    private readonly _message = inject(NzMessageService);

    readonly order = input.required<OrderDetails>();
    readonly returnable = input.required<Record<string, number>>();
    readonly visible = model(false);
    readonly created = output<CreatedReturn>();

    readonly saving = this._returns.saving;
    readonly reasons = RETURN_REASONS;
    readonly picks = signal<Pick[]>([]);
    readonly reason = signal<ReturnReason | null>(null);
    readonly note = signal('');
    readonly refundDelivery = signal(false);
    readonly confirming = signal(false);
    /** Made once per opening, so a retried Create finds the return it already raised. */
    private _oid = crypto.randomUUID();

    readonly units = computed(() => this.picks().reduce((sum, pick) => sum + pick.quantity, 0));
    readonly whole = computed(() => this.picks().every((pick) => pick.quantity === pick.returnable));
    readonly canRefundDelivery = computed(() => this.order().channel === 'ONLINE' && this.order().delivery_charge > 0 && this.whole());
    readonly value = computed(() => this.picks().reduce((sum, pick) => sum + pick.quantity * pick.per_unit, 0) + (this.canRefundDelivery() && this.refundDelivery() ? this.order().delivery_charge : 0));
    readonly incomplete = computed(() => !this.units() || !this.reason() || (this.reason() === 'other' && !this.note().trim()));

    constructor() {
        effect(() => {
            if (this.visible()) this.reset();
        });
    }

    private reset(): void {
        const left = this.returnable();
        this.picks.set(
            this.order()
                .items.filter((line) => (left[line.oid] ?? 0) > 0)
                .map((line) => ({ order_item_oid: line.oid, product_name: line.product_name, returnable: left[line.oid], per_unit: Math.max(0, line.unit_price - line.discount), quantity: 0, condition: 'Good' as const }))
        );
        this.reason.set(null);
        this.note.set('');
        this.refundDelivery.set(false);
        this.confirming.set(false);
        this._oid = crypto.randomUUID();
    }

    update(index: number, change: Partial<Pick>): void {
        this.picks.update((all) => all.map((pick, i) => (i === index ? { ...pick, ...change } : pick)));
    }

    all(): void {
        this.picks.update((all) => all.map((pick) => ({ ...pick, quantity: pick.returnable })));
    }

    close(): void {
        if (!this.saving()) this.visible.set(false);
    }

    /** Asks inside the same dialog, never a second modal on top. */
    submit(): void {
        if (this.incomplete() || this.saving()) return;
        if (!this.confirming()) {
            this.confirming.set(true);
            return;
        }
        const reason = this.reason() as Exclude<ReturnReason, 'not_delivered'>;
        this._returns
            .create({
                oid: this._oid,
                order_oid: this.order().oid,
                return_reason: reason,
                note: this.note().trim() || null,
                refund_delivery_charge: this.canRefundDelivery() && this.refundDelivery(),
                items: this.picks()
                    .filter((pick) => pick.quantity > 0)
                    .map((pick) => ({ order_item_oid: pick.order_item_oid, quantity: pick.quantity, condition: pick.condition })),
            })
            .subscribe({
                next: (created) => {
                    this.visible.set(false);
                    this._message.success(this._translate.instant('sales.return.action.create.done', { number: created.return_no }));
                    this.created.emit(created);
                },
                error: (error: unknown) => {
                    this.confirming.set(false);
                    const conflict = error instanceof HttpErrorResponse && (error.status === 409 || error.status === 400) ? (error.error?.message as string | undefined) : undefined;
                    this._message.error(conflict ?? this._translate.instant(failureKey(error, 'form.saveFailed')));
                },
            });
    }
}
