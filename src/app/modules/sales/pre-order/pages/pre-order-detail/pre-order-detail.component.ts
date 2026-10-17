import { Location } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft, lucideBan, lucideCalendarCheck, lucideCheck, lucideShoppingBag, lucideHandCoins, lucideHistory, lucideInfo, lucidePackage, lucidePencil, lucideRotateCw, lucideX, lucideZap } from '@ng-icons/lucide';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTypographyModule } from 'ng-zorro-antd/typography';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Observable } from 'rxjs';
import { RequestFailure } from '@app/core/models/api.model';
import { PageBack } from '@app/core/models/page-header.model';
import { PRE_ORDER_CANCEL_REASONS, PreOrderCancelReason, PreOrderDetails } from '@app/core/models/pre-order.model';
import { LanguageService } from '@app/core/services/language/language.service';
import { SessionService } from '@app/core/services/session/session.service';
import { ORDER_ROUTES } from '@app/modules/sales/order/constants/order-routes';
import { PRE_ORDER_STATUS } from '@app/modules/sales/pre-order/config/pre-order-list.config';
import { PRE_ORDER_ROUTES } from '@app/modules/sales/pre-order/constants/pre-order-routes';
import { PreOrderService } from '@app/modules/sales/pre-order/services/pre-order.service';
import { ActionFooterComponent } from '@app/shared/components/action-footer/action-footer.component';
import { PageHeaderComponent } from '@app/shared/components/page-header/page-header.component';
import { StatusTagComponent } from '@app/shared/components/status-tag/status-tag.component';
import { DigitsPipe } from '@app/shared/pipes/digits/digits.pipe';
import { MoneyPipe } from '@app/shared/pipes/money/money.pipe';
import { RecordDatePipe } from '@app/shared/pipes/record-date/record-date.pipe';
import { confirmAction } from '@app/shared/utils/confirm-action/confirm-action';
import { failureKey, failureOf } from '@app/shared/utils/request-failure/request-failure';
import { RecordTimelineComponent } from '@app/shared/components/record-timeline/record-timeline.component';
import { resolveTone } from '@app/shared/utils/tone-map/tone-map';

/** One booking. Nothing here touches stock: Confirm accepts it, Cancel records the advance owed back. */
@Component({
    selector: 'pre-order-detail',
    imports: [RecordTimelineComponent, FormsModule, RouterLink, NgIcon, NzButtonModule, NzCardModule, NzFormModule, NzInputModule, NzInputNumberModule, NzModalModule, NzSelectModule, NzSkeletonModule, NzTableModule, NzTypographyModule, TranslatePipe, PageHeaderComponent, ActionFooterComponent, StatusTagComponent, DigitsPipe, MoneyPipe, RecordDatePipe],
    providers: [MoneyPipe, provideIcons({ lucideArrowLeft, lucideBan, lucideCalendarCheck, lucideCheck, lucideShoppingBag, lucideHandCoins, lucideHistory, lucideInfo, lucidePackage, lucidePencil, lucideRotateCw, lucideX, lucideZap })],
    templateUrl: './pre-order-detail.component.html',
    styleUrl: './pre-order-detail.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PreOrderDetailComponent {
    private readonly _route = inject(ActivatedRoute);
    private readonly _router = inject(Router);
    private readonly _location = inject(Location);
    private readonly _bookings = inject(PreOrderService);
    private readonly _session = inject(SessionService);
    private readonly _translate = inject(TranslateService);
    private readonly _message = inject(NzMessageService);
    private readonly _modal = inject(NzModalService);
    private readonly _money = inject(MoneyPipe);

    readonly language = inject(LanguageService).current;
    readonly oid = this._route.snapshot.paramMap.get('oid') ?? '';
    readonly back: PageBack = { route: PRE_ORDER_ROUTES.list };
    readonly canViewOrders = this._session.can('sales.order.view');
    readonly orderRoute = ORDER_ROUTES.detail;
    readonly reasons = PRE_ORDER_CANCEL_REASONS;

    private readonly _seed = this.seedFromList();
    readonly record = signal<PreOrderDetails | null>(null);
    readonly failed = signal<RequestFailure | null>(null);
    readonly saving = this._bookings.saving;
    readonly booking = computed<Partial<PreOrderDetails> | null>(() => this.record() ?? this._seed);
    readonly statusTone = computed(() => {
        const status = this.booking()?.status;
        return status ? (resolveTone(PRE_ORDER_STATUS, status, undefined, 'the booking record')?.style ?? null) : null;
    });
    readonly units = computed(() => (this.record()?.lines ?? []).reduce((sum, line) => sum + line.quantity, 0));
    readonly refundOwed = computed(() => (this.record()?.advance_refund_due ?? 0) - (this.record()?.advance_refunded ?? 0));

    readonly actions = computed(() => {
        const status = this.record()?.status;
        const open = status === 'Pending' || status === 'Confirmed';
        return {
            convert: open && this._session.can('sales.pre-order.convert') && this._session.can('sales.online.create'),
            edit: open && this._session.can('sales.pre-order.edit'),
            confirm: status === 'Pending' && this._session.can('sales.pre-order.confirm'),
            cancel: open && this._session.can('sales.pre-order.cancel'),
            refund: status === 'Cancelled' && this.refundOwed() > 0 && this._session.can('sales.pre-order.cancel'),
        };
    });
    /** Products without enough sellable stock for their units: all go together, so none can go yet. */
    readonly notInStock = computed(() => (this.record()?.lines ?? []).filter((line) => line.sellable < line.quantity).map((line) => line.product_name));
    readonly anyAction = computed(() => Object.values(this.actions()).some(Boolean));

    readonly cancelling = signal(false);
    readonly cancelReason = signal<PreOrderCancelReason | null>(null);
    readonly cancelNote = signal('');
    readonly refundDue = signal(0);
    readonly cancelReady = computed(() => !!this.cancelReason() && (this.cancelReason() !== 'other' || !!this.cancelNote().trim()) && this.refundDue() >= 0 && this.refundDue() <= (this.record()?.advance_paid ?? 0));

    constructor() {
        this.load();
    }

    load(): void {
        this.failed.set(null);
        this._bookings.details(this.oid).subscribe({
            next: (details) => this.record.set(details),
            error: (error: unknown) => this.failed.set(failureOf(error)),
        });
    }

    goBack(): void {
        this._location.back();
    }

    backToList(): void {
        void this._router.navigateByUrl(PRE_ORDER_ROUTES.list);
    }

    /** Opens the online order page with the booking filled in; the order is made there (REQ-07). */
    convert(): void {
        void this._router.navigate(['/app/sales/online-order'], { queryParams: { convert: this.oid } });
    }

    edit(): void {
        void this._router.navigateByUrl(PRE_ORDER_ROUTES.edit(this.oid));
    }

    confirm(): void {
        const number = this.record()?.preorder_no ?? '';
        confirmAction(this._modal, {
            title: this._translate.instant('sales.preOrder.action.confirm.confirmTitle', { number }),
            body: this._translate.instant('sales.preOrder.action.confirm.confirmBody'),
            ok: this._translate.instant('sales.preOrder.action.confirm.button'),
            cancel: this._translate.instant('form.confirm.cancel'),
        }).subscribe((confirmed) => {
            if (confirmed) this.send(this._bookings.confirm(this.oid), 'confirm');
        });
    }

    openCancel(): void {
        this.cancelReason.set(null);
        this.cancelNote.set('');
        this.refundDue.set(this.record()?.advance_paid ?? 0);
        this.cancelling.set(true);
    }

    submitCancel(): void {
        const reason = this.cancelReason();
        if (!reason || !this.cancelReady() || this.saving()) return;
        this.send(this._bookings.cancel({ oid: this.oid, reason, note: this.cancelNote().trim() || null, refund_due: this.refundDue() }), 'cancel');
    }

    recordRefund(): void {
        confirmAction(this._modal, {
            title: this._translate.instant('sales.preOrder.action.refund.confirmTitle'),
            body: this._translate.instant('sales.preOrder.action.refund.confirmBody', { amount: this._money.transform(this.refundOwed()), name: this.record()?.customer_name ?? '' }),
            ok: this._translate.instant('sales.preOrder.action.refund.button'),
            cancel: this._translate.instant('form.confirm.cancel'),
        }).subscribe((confirmed) => {
            if (confirmed) this.send(this._bookings.recordRefund(this.oid), 'refund');
        });
    }

    private send(request: Observable<unknown>, action: 'confirm' | 'cancel' | 'refund'): void {
        request.subscribe({
            next: () => {
                this.cancelling.set(false);
                this._message.success(this._translate.instant('sales.preOrder.action.' + action + '.done'));
                this.load();
            },
            error: (error: unknown) => {
                if (error instanceof HttpErrorResponse && (error.status === 409 || error.status === 400)) {
                    this._message.error(error.error?.message ?? this._translate.instant('sales.order.movedOn'));
                    if (error.status === 409) {
                        this.cancelling.set(false);
                        this.load();
                    }
                    return;
                }
                this._message.error(this._translate.instant(failureKey(error, 'form.saveFailed')));
            },
        });
    }

    private seedFromList(): Partial<PreOrderDetails> | null {
        const row = this._router.currentNavigation()?.extras.state?.['row'] as Partial<PreOrderDetails> | undefined;
        return row?.oid === this.oid ? row : null;
    }
}
