import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft, lucideBan, lucideCheck, lucideDownload, lucideHistory, lucideInfo, lucideMinus, lucidePackage, lucidePackageCheck, lucidePlus, lucideRotateCw, lucideTag, lucideTruck, lucideX, lucideZap } from '@ng-icons/lucide';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { NzTypographyModule } from 'ng-zorro-antd/typography';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Observable, finalize } from 'rxjs';
import { RequestFailure } from '@app/core/models/api.model';
import { BatchOrder, DeliveryBatchDetails, LeftOutOrder } from '@app/core/models/delivery-batch.model';
import { PageBack } from '@app/core/models/page-header.model';
import { LanguageService } from '@app/core/services/language/language.service';
import { SessionService } from '@app/core/services/session/session.service';
import { COURIER_TAG, DELIVERY_BATCH_STATUS } from '@app/modules/sales/delivery-batch/config/delivery-batch-list.config';
import { DELIVERY_BATCH_ROUTES } from '@app/modules/sales/delivery-batch/constants/delivery-batch-routes';
import { DeliveryBatchService } from '@app/modules/sales/delivery-batch/services/delivery-batch.service';
import { DELIVERY_STATUS, ORDER_STATUS } from '@app/modules/sales/order/config/order-list.config';
import { ORDER_ROUTES } from '@app/modules/sales/order/constants/order-routes';
import { ActionFooterComponent } from '@app/shared/components/action-footer/action-footer.component';
import { PageHeaderComponent } from '@app/shared/components/page-header/page-header.component';
import { StatusTagComponent } from '@app/shared/components/status-tag/status-tag.component';
import { DigitsPipe } from '@app/shared/pipes/digits/digits.pipe';
import { MoneyPipe } from '@app/shared/pipes/money/money.pipe';
import { RecordDatePipe } from '@app/shared/pipes/record-date/record-date.pipe';
import { confirmAction } from '@app/shared/utils/confirm-action/confirm-action';
import { isLabelable, labelContent, printLabels } from '@app/shared/utils/delivery-label/delivery-label';
import { saveDownload } from '@app/shared/utils/download-file/download-file';
import { failureKey, failureOf } from '@app/shared/utils/request-failure/request-failure';
import { RecordTimelineComponent } from '@app/shared/components/record-timeline/record-timeline.component';
import { environment } from '@env/environment';

const labelled = (order: BatchOrder) => isLabelable(order.status, order.delivery_status);

type BatchAction = 'hand-over' | 'deliver' | 'add' | 'take-out' | 'cancel';

/** One courier pickup: its orders, the courier's file, the labels, and the handover that dispatches them. */
@Component({
    selector: 'delivery-batch-detail',
    imports: [RecordTimelineComponent, FormsModule, RouterLink, NgIcon, NzButtonModule, NzCardModule, NzFormModule, NzInputModule, NzModalModule, NzSkeletonModule, NzTableModule, NzTooltipModule, NzTypographyModule, TranslatePipe, ActionFooterComponent, PageHeaderComponent, StatusTagComponent, DigitsPipe, MoneyPipe, RecordDatePipe],
    providers: [MoneyPipe, provideIcons({ lucideArrowLeft, lucideBan, lucideCheck, lucideDownload, lucideHistory, lucideInfo, lucideMinus, lucidePackage, lucidePackageCheck, lucidePlus, lucideRotateCw, lucideTag, lucideTruck, lucideX, lucideZap })],
    templateUrl: './delivery-batch-detail.component.html',
    styleUrl: './delivery-batch-detail.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeliveryBatchDetailComponent {
    private readonly _route = inject(ActivatedRoute);
    private readonly _router = inject(Router);
    private readonly _batches = inject(DeliveryBatchService);
    private readonly _session = inject(SessionService);
    private readonly _translate = inject(TranslateService);
    private readonly _message = inject(NzMessageService);
    private readonly _modal = inject(NzModalService);
    private readonly _money = inject(MoneyPipe);

    readonly language = inject(LanguageService).current;
    readonly oid = this._route.snapshot.paramMap.get('oid') ?? '';
    readonly back: PageBack = { route: DELIVERY_BATCH_ROUTES.list };
    readonly orderRoute = ORDER_ROUTES.detail;
    readonly canViewOrders = this._session.can('sales.order.view');
    readonly orderTones = ORDER_STATUS;
    readonly deliveryTones = DELIVERY_STATUS;
    readonly courierTones = COURIER_TAG;
    readonly labelled = labelled;

    readonly record = signal<DeliveryBatchDetails | null>(null);
    readonly failed = signal<RequestFailure | null>(null);
    readonly saving = this._batches.saving;
    readonly downloading = signal(false);
    /** The action whose request is running: its button spins, and every other action waits for it. */
    readonly acting = signal<BatchAction | null>(null);
    readonly busy = computed(() => this.saving() || this.downloading());
    readonly ticked = signal<ReadonlySet<string>>(new Set());

    readonly statusTone = computed(() => (this.record() ? DELIVERY_BATCH_STATUS[this.record()!.status] : null));
    readonly orders = computed(() => this.record()?.orders ?? []);
    readonly chosen = computed(() => this.orders().filter((order) => this.ticked().has(order.oid)));
    readonly allTicked = computed(() => !!this.orders().length && this.chosen().length === this.orders().length);
    readonly someTicked = computed(() => this.chosen().length > 0 && !this.allTicked());
    readonly units = computed(() => this.orders().reduce((sum, order) => sum + order.units, 0));
    readonly toCollect = computed(() =>
        this.orders()
            .filter((order) => order.status !== 'Cancelled')
            .reduce((sum, order) => sum + Number(order.to_collect), 0)
    );
    readonly printable = computed(() => this.orders().filter(labelled));
    readonly withCourier = computed(() => this.chosen().filter((order) => order.status === 'Confirmed' && order.delivery_status === 'WithCourier'));

    readonly actions = computed(() => {
        const status = this.record()?.status;
        const can = (action: string) => this._session.can('sales.delivery-batch.' + action);
        return {
            file: status !== undefined && status !== 'Cancelled' && can('edit'),
            labels: status !== undefined && status !== 'Cancelled',
            add: status === 'Open' && can('edit'),
            takeOut: status === 'Open' && can('edit'),
            handOver: status === 'Open' && can('dispatch'),
            deliver: status === 'HandedOver' && can('deliver'),
            cancel: status === 'Open' && can('cancel'),
        };
    });
    readonly anyAction = computed(() => Object.values(this.actions()).some(Boolean));

    readonly adding = signal(false);
    readonly ready = signal<BatchOrder[] | null>(null);
    readonly readyFailed = signal<RequestFailure | null>(null);
    readonly toAdd = signal<ReadonlySet<string>>(new Set());
    readonly cancelling = signal(false);
    readonly cancelNote = signal('');

    constructor() {
        this.load();
    }

    load(): void {
        this.failed.set(null);
        this._batches.details(this.oid).subscribe({
            next: (details) => {
                this.record.set(details);
                const still = new Set(details.orders.map((order) => order.oid));
                this.ticked.set(new Set([...this.ticked()].filter((oid) => still.has(oid))));
            },
            error: (error: unknown) => this.failed.set(failureOf(error)),
        });
    }

    backToList(): void {
        void this._router.navigateByUrl(DELIVERY_BATCH_ROUTES.list);
    }

    place(order: BatchOrder): string {
        return [order.thana, order.district].filter(Boolean).join(', ');
    }

    tick(oid: string, on: boolean): void {
        const next = new Set(this.ticked());
        if (on) next.add(oid);
        else next.delete(oid);
        this.ticked.set(next);
    }

    tickAll(on: boolean): void {
        this.ticked.set(new Set(on ? this.orders().map((order) => order.oid) : []));
    }

    /** One, the ticked, or every label in the batch, each on its own page. */
    print(orders: BatchOrder[]): void {
        const batch = this.record();
        const list = orders.filter(labelled);
        if (!batch || !list.length) return;
        const business = this._session.business();
        const sender = business ? { name: business.name ?? '', logoUrl: business.logoUrl ?? null, address: business.address ?? null, phone: business.phone ?? null } : null;
        printLabels(
            list.map((order) =>
                labelContent(
                    {
                        invoice_no: order.invoice_no,
                        created_on: order.created_on,
                        units: order.units,
                        courier: order.courier ?? batch.courier,
                        consignment_no: order.consignment_no,
                        recipient_name: order.recipient_name,
                        recipient_phone: order.recipient_phone,
                        address: [order.address_line, order.area_text, order.thana, order.district, order.postal_code].filter(Boolean).join(', '),
                        to_collect: Number(order.to_collect),
                        tracking_token: order.tracking_token,
                    },
                    sender,
                    environment.trackerUrl
                )
            )
        );
    }

    download(): void {
        const batch = this.record();
        if (!batch || this.busy()) return;
        this.downloading.set(true);
        this._batches.uploadFile(this.oid).subscribe({
            next: (response) => {
                this.downloading.set(false);
                saveDownload(response, `${batch.batch_no}-pathao.csv`);
            },
            error: (error: unknown) => {
                this.downloading.set(false);
                this._message.error(this._translate.instant(failureKey(error, 'sales.deliveryBatch.fileFailed')));
            },
        });
    }

    openAdd(): void {
        this.adding.set(true);
        this.ready.set(null);
        this.readyFailed.set(null);
        this.toAdd.set(new Set());
        this._batches.readyToSend().subscribe({
            next: (orders) => this.ready.set(orders),
            error: (error: unknown) => this.readyFailed.set(failureOf(error)),
        });
    }

    tickToAdd(oid: string, on: boolean): void {
        const next = new Set(this.toAdd());
        if (on) next.add(oid);
        else next.delete(oid);
        this.toAdd.set(next);
    }

    submitAdd(): void {
        if (!this.toAdd().size || this.saving()) return;
        this.send('add', this._batches.setOrders(this.oid, [...this.orders().map((order) => order.oid), ...this.toAdd()]), 'sales.deliveryBatch.action.add.done');
    }

    takeOut(): void {
        const leaving = this.chosen();
        const staying = this.orders().filter((order) => !this.ticked().has(order.oid));
        if (!leaving.length) return;
        if (!staying.length) {
            this._message.warning(this._translate.instant('sales.deliveryBatch.action.takeOut.notAll'));
            return;
        }
        confirmAction(this._modal, {
            title: this._translate.instant('sales.deliveryBatch.action.takeOut.title', { count: leaving.length }),
            body: this._translate.instant('sales.deliveryBatch.action.takeOut.body'),
            ok: this._translate.instant('sales.deliveryBatch.action.takeOut.button'),
            cancel: this._translate.instant('form.confirm.cancel'),
        }).subscribe((confirmed) => {
            if (confirmed)
                this.send(
                    'take-out',
                    this._batches.setOrders(
                        this.oid,
                        staying.map((order) => order.oid)
                    ),
                    'sales.deliveryBatch.action.takeOut.done'
                );
        });
    }

    handOver(): void {
        const batch = this.record();
        if (!batch) return;
        const going = this.orders().filter((order) => order.ready);
        confirmAction(this._modal, {
            title: this._translate.instant('sales.deliveryBatch.action.handOver.title', { number: batch.batch_no, courier: this._translate.instant('sales.order.couriers.' + batch.courier) }),
            body: this._translate.instant('sales.deliveryBatch.action.handOver.body', { count: going.length, amount: this._money.transform(this.toCollect()) }),
            ok: this._translate.instant('sales.deliveryBatch.action.handOver.button'),
            cancel: this._translate.instant('form.confirm.cancel'),
        }).subscribe((confirmed) => {
            if (!confirmed) return;
            this.send('hand-over', this._batches.handOver(this.oid), null, (done) => {
                const result = done as { dispatched: number; left_out: LeftOutOrder[] };
                this.say('sales.deliveryBatch.action.handOver.done', result.dispatched, result.left_out);
            });
        });
    }

    deliver(): void {
        const going = this.withCourier();
        if (!going.length) return;
        confirmAction(this._modal, {
            title: this._translate.instant('sales.deliveryBatch.action.deliver.title', { count: going.length }),
            body: this._translate.instant('sales.deliveryBatch.action.deliver.body'),
            ok: this._translate.instant('sales.deliveryBatch.action.deliver.button'),
            cancel: this._translate.instant('form.confirm.cancel'),
        }).subscribe((confirmed) => {
            if (!confirmed) return;
            this.send(
                'deliver',
                this._batches.deliver(
                    this.oid,
                    going.map((order) => order.oid)
                ),
                null,
                (done) => {
                    const result = done as { delivered: number; left_out: LeftOutOrder[] };
                    this.say('sales.deliveryBatch.action.deliver.done', result.delivered, result.left_out);
                }
            );
        });
    }

    openCancel(): void {
        this.cancelNote.set('');
        this.cancelling.set(true);
    }

    submitCancel(): void {
        const note = this.cancelNote().trim();
        if (note.length < 3 || this.saving()) return;
        this.send('cancel', this._batches.cancel(this.oid, note), 'sales.deliveryBatch.action.cancel.done');
    }

    private say(key: string, count: number, left_out: LeftOutOrder[]): void {
        this._message.success(this._translate.instant(key, { count }));
        if (left_out.length) this._message.warning(this._translate.instant('sales.deliveryBatch.leftOut', { numbers: left_out.map((order) => order.invoice_no).join(', ') }), { nzDuration: 8000 });
    }

    private send(action: BatchAction, request: Observable<unknown>, doneKey: string | null, done?: (result: unknown) => void): void {
        this.acting.set(action);
        request.pipe(finalize(() => this.acting.set(null))).subscribe({
            next: (result) => {
                this.adding.set(false);
                this.cancelling.set(false);
                this.ticked.set(new Set());
                if (doneKey) this._message.success(this._translate.instant(doneKey));
                done?.(result);
                this.load();
            },
            error: (error: unknown) => {
                if (error instanceof HttpErrorResponse && (error.status === 409 || error.status === 400)) {
                    this._message.error(error.error?.message ?? this._translate.instant('sales.deliveryBatch.movedOn'));
                    if (error.status === 409) {
                        this.adding.set(false);
                        this.cancelling.set(false);
                        this.load();
                    }
                    return;
                }
                this._message.error(this._translate.instant(failureKey(error, 'form.saveFailed')));
            },
        });
    }
}
