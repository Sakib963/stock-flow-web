import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCheck, lucidePackage, lucideRotateCw, lucideTruck, lucideX } from '@ng-icons/lucide';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzTableModule } from 'ng-zorro-antd/table';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { RequestFailure } from '@app/core/models/api.model';
import { BatchOrder } from '@app/core/models/delivery-batch.model';
import { COURIERS, Courier } from '@app/core/models/order.model';
import { PageBack } from '@app/core/models/page-header.model';
import { LanguageService } from '@app/core/services/language/language.service';
import { DELIVERY_BATCH_ROUTES } from '@app/modules/sales/delivery-batch/constants/delivery-batch-routes';
import { DeliveryBatchService } from '@app/modules/sales/delivery-batch/services/delivery-batch.service';
import { DELIVERY_STATUS } from '@app/modules/sales/order/config/order-list.config';
import { ORDER_ROUTES } from '@app/modules/sales/order/constants/order-routes';
import { ActionFooterComponent } from '@app/shared/components/action-footer/action-footer.component';
import { PageHeaderComponent } from '@app/shared/components/page-header/page-header.component';
import { StatusTagComponent } from '@app/shared/components/status-tag/status-tag.component';
import { DigitsPipe } from '@app/shared/pipes/digits/digits.pipe';
import { MoneyPipe } from '@app/shared/pipes/money/money.pipe';
import { RecordDatePipe } from '@app/shared/pipes/record-date/record-date.pipe';
import { confirmAction } from '@app/shared/utils/confirm-action/confirm-action';
import { failureKey, failureOf } from '@app/shared/utils/request-failure/request-failure';

/** New batch (REQ-02): every order ready to send, all ticked; the person unticks what is not going today. */
@Component({
    selector: 'delivery-batch-create',
    imports: [FormsModule, RouterLink, NgIcon, NzButtonModule, NzCardModule, NzFormModule, NzInputModule, NzSelectModule, NzSkeletonModule, NzTableModule, TranslatePipe, ActionFooterComponent, PageHeaderComponent, StatusTagComponent, DigitsPipe, MoneyPipe, RecordDatePipe],
    providers: [MoneyPipe, provideIcons({ lucideCheck, lucidePackage, lucideRotateCw, lucideTruck, lucideX })],
    templateUrl: './delivery-batch-create.component.html',
    styleUrl: './delivery-batch-create.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeliveryBatchCreateComponent {
    private readonly _router = inject(Router);
    private readonly _batches = inject(DeliveryBatchService);
    private readonly _message = inject(NzMessageService);
    private readonly _modal = inject(NzModalService);
    private readonly _translate = inject(TranslateService);
    private readonly _money = inject(MoneyPipe);

    readonly language = inject(LanguageService).current;
    readonly back: PageBack = { route: DELIVERY_BATCH_ROUTES.list };
    readonly couriers = COURIERS;
    readonly deliveryTones = DELIVERY_STATUS;
    readonly ordersRoute = ORDER_ROUTES.list;
    /** Made once per page, so a retried Save finds the batch it already made. */
    private readonly _oid = crypto.randomUUID();

    readonly courier = signal<Courier>('Pathao');
    readonly note = signal('');
    readonly orders = signal<BatchOrder[] | null>(null);
    readonly failed = signal<RequestFailure | null>(null);
    readonly ticked = signal<ReadonlySet<string>>(new Set());
    readonly saving = this._batches.saving;

    readonly chosen = computed(() => (this.orders() ?? []).filter((order) => this.ticked().has(order.oid)));
    readonly toCollect = computed(() => this.chosen().reduce((sum, order) => sum + Number(order.to_collect), 0));
    readonly allTicked = computed(() => !!this.orders()?.length && this.chosen().length === this.orders()!.length);
    readonly someTicked = computed(() => this.chosen().length > 0 && !this.allTicked());

    constructor() {
        this.load();
    }

    load(): void {
        this.failed.set(null);
        this.orders.set(null);
        this._batches.readyToSend().subscribe({
            next: (orders) => {
                this.orders.set(orders);
                this.ticked.set(new Set(orders.map((order) => order.oid)));
            },
            error: (error: unknown) => this.failed.set(failureOf(error)),
        });
    }

    tick(oid: string, on: boolean): void {
        const next = new Set(this.ticked());
        if (on) next.add(oid);
        else next.delete(oid);
        this.ticked.set(next);
    }

    tickAll(on: boolean): void {
        this.ticked.set(new Set(on ? (this.orders() ?? []).map((order) => order.oid) : []));
    }

    place(order: BatchOrder): string {
        return [order.thana, order.district].filter(Boolean).join(', ');
    }

    save(): void {
        const order_oids = this.chosen().map((order) => order.oid);
        if (!order_oids.length || this.saving()) return;
        const courier = this.courier();
        confirmAction(this._modal, {
            title: this._translate.instant('sales.deliveryBatch.confirmCreate.title', { count: order_oids.length, courier: this._translate.instant('sales.order.couriers.' + courier) }),
            body: this._translate.instant('sales.deliveryBatch.confirmCreate.body', { amount: this._money.transform(this.toCollect()) }),
            ok: this._translate.instant('sales.deliveryBatch.save'),
            cancel: this._translate.instant('form.confirm.cancel'),
        }).subscribe((confirmed) => {
            if (!confirmed) return;
            this._batches.create({ oid: this._oid, courier, note: this.note().trim() || null, order_oids }).subscribe({
                next: (made) => {
                    this._message.success(this._translate.instant('sales.deliveryBatch.created', { number: made.batch_no }));
                    void this._router.navigateByUrl(DELIVERY_BATCH_ROUTES.detail(made.oid));
                },
                error: (error: unknown) => {
                    if (error instanceof HttpErrorResponse && error.status === 409) {
                        this._message.error(error.error?.message ?? this._translate.instant('sales.deliveryBatch.movedOn'));
                        this.load();
                        return;
                    }
                    this._message.error(this._translate.instant(failureKey(error, 'form.saveFailed')));
                },
            });
        });
    }

    cancel(): void {
        void this._router.navigateByUrl(DELIVERY_BATCH_ROUTES.list);
    }
}
