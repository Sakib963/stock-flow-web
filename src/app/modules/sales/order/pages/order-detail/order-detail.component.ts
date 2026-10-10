import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideMessageSquareText, lucidePencil, lucideArrowLeft, lucideBan, lucideHandCoins, lucideCheck, lucideCircleCheck, lucideHistory, lucideInfo, lucideMapPin, lucidePackage, lucidePackageCheck, lucidePackageX, lucidePrinter, lucideReceipt, lucideRotateCw, lucideTruck, lucideUndo2, lucideUserRound, lucideWallet, lucideX, lucideZap } from '@ng-icons/lucide';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTimelineModule } from 'ng-zorro-antd/timeline';
import { NzTypographyModule } from 'ng-zorro-antd/typography';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Observable, finalize } from 'rxjs';
import { RequestFailure } from '@app/core/models/api.model';
import { CANCEL_REASONS, CONFIRMED_VIA, COURIERS, CancelReason, ConfirmedVia, Courier, NOT_DELIVERED_REASONS, NotDeliveredReason, OrderDetails, OrderScope, REFUND_METHODS, RefundMethod } from '@app/core/models/order.model';
import { PageBack } from '@app/core/models/page-header.model';
import { LanguageService } from '@app/core/services/language/language.service';
import { SessionService } from '@app/core/services/session/session.service';
import { CUSTOMER_ROUTES } from '@app/modules/sales/customer/constants/customer-routes';
import { DELIVERY_STATUS, ORDER_STATUS, PAYMENT_STATUS } from '@app/modules/sales/order/config/order-list.config';
import { ORDER_ROUTES } from '@app/modules/sales/order/constants/order-routes';
import { SalesSettingsService } from '@app/modules/sales/settings/services/sales-settings.service';
import { fillMessage, templatesFor } from '@app/modules/sales/settings/utils/fill-message';
import { MessageTemplate } from '@app/core/models/message-template.model';
import { OrderService } from '@app/modules/sales/order/services/order.service';
import { CreatedReturn, OrderReturn } from '@app/core/models/return.model';
import { RETURN_STATUS } from '@app/modules/sales/return/config/return-list.config';
import { ReturnCreateDialogComponent } from '@app/modules/sales/return/components/return-create-dialog/return-create-dialog.component';
import { RETURN_ROUTES } from '@app/modules/sales/return/constants/return-routes';
import { ReturnService } from '@app/modules/sales/return/services/return.service';
import { ActionFooterComponent } from '@app/shared/components/action-footer/action-footer.component';
import { PageHeaderComponent } from '@app/shared/components/page-header/page-header.component';
import { StatusTagComponent } from '@app/shared/components/status-tag/status-tag.component';
import { DigitsPipe } from '@app/shared/pipes/digits/digits.pipe';
import { MoneyPipe } from '@app/shared/pipes/money/money.pipe';
import { RecordDatePipe } from '@app/shared/pipes/record-date/record-date.pipe';
import { environment } from '@env/environment';
import { printInvoice } from '@app/shared/utils/invoice/invoice';
import { confirmAction } from '@app/shared/utils/confirm-action/confirm-action';
import { failureKey, failureOf } from '@app/shared/utils/request-failure/request-failure';
import { resolveTone } from '@app/shared/utils/tone-map/tone-map';

const TIMELINE_STEP = 5;
const RETURNABLE = ['Purchased', 'Delivered', 'PartiallyReturned'];

/** The server writes these few reasons as fixed English sentences; each has a label in both languages. */
const FIXED_REASONS: Record<string, string> = {
    'Online order placed': 'placed',
    'Online draft placed': 'draftPlaced',
    'Online draft saved': 'draftSaved',
    'POS checkout': 'checkout',
    'Parked cart checked out': 'parkedCheckout',
    'Collected by the courier': 'collected',
    'Online order edited': 'edited',
};

/** The actions that open a dialog for their details; Packed and Deliver only ask. */
type Dialog = 'confirm' | 'cancel' | 'dispatch' | 'notDelivered' | 'refund';

/**
 * One order (sales: order record page). The order leads, then its numbers, lines, where it goes and
 * its timeline beside quick actions. An action the person lacks, or one the order's state does not
 * allow, is absent; the server guards every one again on the state it leaves.
 */
@Component({
    selector: 'order-detail',
    imports: [FormsModule, RouterLink, NgIcon, NzButtonModule, NzCardModule, NzFormModule, NzInputModule, NzInputNumberModule, NzModalModule, NzRadioModule, NzSelectModule, NzSkeletonModule, NzTableModule, NzTimelineModule, NzTypographyModule, TranslatePipe, PageHeaderComponent, ActionFooterComponent, StatusTagComponent, ReturnCreateDialogComponent, DigitsPipe, MoneyPipe, RecordDatePipe],
    providers: [MoneyPipe, DigitsPipe, provideIcons({ lucideMessageSquareText, lucidePencil, lucideArrowLeft, lucideBan, lucideHandCoins, lucideCheck, lucideCircleCheck, lucideHistory, lucideInfo, lucideMapPin, lucidePackage, lucidePackageCheck, lucidePackageX, lucidePrinter, lucideReceipt, lucideRotateCw, lucideTruck, lucideUndo2, lucideUserRound, lucideWallet, lucideX, lucideZap })],
    templateUrl: './order-detail.component.html',
    styleUrl: './order-detail.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderDetailComponent {
    private readonly _route = inject(ActivatedRoute);
    private readonly _router = inject(Router);
    private readonly _orders = inject(OrderService);
    private readonly _session = inject(SessionService);
    private readonly _translate = inject(TranslateService);
    private readonly _message = inject(NzMessageService);
    private readonly _modal = inject(NzModalService);
    private readonly _money = inject(MoneyPipe);
    private readonly _digits = inject(DigitsPipe);

    readonly language = inject(LanguageService).current;
    readonly oid = this._route.snapshot.paramMap.get('oid') ?? '';
    /** Order history reaches only the person's own orders and offers Confirm and Cancel; Orders offers every action. */
    readonly scope: OrderScope = (this._route.snapshot.data['scope'] as OrderScope | undefined) ?? 'all';
    private readonly _listRoute = this.scope === 'history' ? ORDER_ROUTES.historyList : ORDER_ROUTES.list;
    readonly back: PageBack = { route: this._listRoute };
    readonly customerRoute = CUSTOMER_ROUTES;
    readonly canViewCustomers = this._session.can('sales.customer.view');

    private readonly _seed = this.seedFromList();
    readonly record = signal<OrderDetails | null>(null);
    readonly loading = signal(true);
    readonly failed = signal<RequestFailure | null>(null);
    readonly saving = this._orders.saving;
    readonly order = computed<Partial<OrderDetails> | null>(() => this.record() ?? this._seed);

    readonly statusTone = computed(() => this.toneOf(ORDER_STATUS, this.order()?.status));
    readonly deliveryTone = computed(() => this.toneOf(DELIVERY_STATUS, this.record()?.online?.delivery_status));
    readonly paymentTone = computed(() => this.toneOf(PAYMENT_STATUS, this.order()?.payment_status));

    /**
     * What the courier collects, or what is still owed at the counter: what the customer keeps, less the
     * money the business keeps of what they paid, as the customer record counts it. A parcel that came
     * back was never sold, so nothing is owed on it.
     */
    readonly due = computed(() => {
        const o = this.record();
        if (!o || o.payment_status === 'paid' || o.status === 'Cancelled' || (o.status === 'Returned' && !o.sold_on)) return 0;
        const kept = o.items.reduce((sum, line) => sum + (line.quantity - line.returned_qty) * (line.unit_price - line.discount), 0) + o.delivery_charge;
        const held = (o.payment_status === 'unpaid' ? 0 : o.amount_paid) - o.amount_refunded - o.refund_due;
        return Math.max(0, kept - held);
    });
    readonly units = computed(() => (this.record()?.items ?? []).reduce((sum, line) => sum + line.quantity, 0));

    readonly timelineShown = signal(TIMELINE_STEP);
    readonly timelineMore = signal(false);
    readonly timeline = computed(() => [...(this.record()?.status_history ?? [])].reverse());
    readonly timelineVisible = computed(() => this.timeline().slice(0, this.timelineShown()));
    private _timelineTimer?: ReturnType<typeof setTimeout>;

    /** Each action appears only when the person holds it and the order is in the state it leaves. */
    readonly actions = computed(() => {
        const o = this.record();
        const online = o?.channel === 'ONLINE';
        const delivery = o?.online?.delivery_status ?? null;
        const open = !!o && !o.dispatched_on && (o.status === 'Pending' || o.status === 'Confirmed');
        const all = this.scope === 'all';
        const can = (action: string) => this._session.can((all ? 'sales.order.' : 'sales.order-history.') + action);
        return {
            confirm: online && o.status === 'Pending' && can('confirm'),
            // The edit opens the online order page, which needs the online channel as well.
            edit: all && online && o.status === 'Pending' && can('edit') && this._session.can('sales.online.view'),
            packed: all && online && o.status === 'Confirmed' && delivery === 'Preparing' && can('dispatch'),
            dispatch: all && online && o.status === 'Confirmed' && !o.dispatched_on && (delivery === 'Preparing' || delivery === 'Packed') && can('dispatch'),
            deliver: all && online && o.status === 'Confirmed' && delivery === 'WithCourier' && can('deliver'),
            notDelivered: all && online && o.status === 'Confirmed' && delivery === 'WithCourier' && can('deliver'),
            cancel: online && open && can('cancel'),
            refund: all && online && o.refund_status === 'ToRefund' && can('refund'),
            return: all && !!o && RETURNABLE.includes(o.status) && this._session.can('sales.return.create') && Object.values(this.returnable()).some((left) => left > 0),
        };
    });
    readonly anyAction = computed(() => Object.values(this.actions()).some(Boolean));

    private readonly _returns = inject(ReturnService);
    readonly canViewReturns = this.scope === 'all' && this._session.can('sales.return.view');
    readonly returnRoute = RETURN_ROUTES.detail;
    readonly returns = signal<OrderReturn[]>([]);
    private readonly _returnable = signal<Record<string, number> | null>(null);
    /** Without the returns read, a line can take back what was sold less what was returned; the server checks Pending ones. */
    readonly returnable = computed(() => this._returnable() ?? Object.fromEntries((this.record()?.items ?? []).map((line) => [line.oid, line.quantity - line.returned_qty])));
    readonly returning = signal(false);

    // The action dialog and what it holds.
    readonly dialog = signal<Dialog | null>(null);
    readonly confirming = signal(false);
    readonly acting = signal<Dialog | 'packed' | 'deliver' | null>(null);
    readonly confirmedVias = CONFIRMED_VIA;
    readonly reasonGroups = Object.entries(CANCEL_REASONS);
    readonly couriers = COURIERS;
    readonly notDeliveredReasons = NOT_DELIVERED_REASONS;
    readonly confirmedVia = signal<ConfirmedVia>('PhoneCall');
    readonly cancelReason = signal<CancelReason | null>(null);
    readonly courier = signal<Courier | null>(null);
    readonly consignment = signal('');
    readonly notDeliveredReason = signal<NotDeliveredReason | null>(null);
    readonly refundMethods = REFUND_METHODS;
    readonly refundAmount = signal<number | null>(null);
    readonly refundMethod = signal<RefundMethod | null>(null);
    readonly note = signal('');
    /** Other needs a note, and every dialog but Confirm needs its choice. */
    readonly dialogIncomplete = computed(() => {
        switch (this.dialog()) {
            case 'cancel':
                return !this.cancelReason() || (this.cancelReason() === 'other' && !this.note().trim());
            case 'dispatch':
                return !this.courier();
            case 'refund': {
                const amount = this.refundAmount() ?? 0;
                return amount < 1 || amount > (this.record()?.refund_due ?? 0) || !this.refundMethod() || (this.refundMethod() === 'other' && !this.note().trim());
            }
            case 'notDelivered':
                return !this.notDeliveredReason() || (this.notDeliveredReason() === 'other' && !this.note().trim());
            default:
                return false;
        }
    });

    constructor() {
        this.load();
        this.loadTemplates();
        inject(DestroyRef).onDestroy(() => clearTimeout(this._timelineTimer));
    }

    /** The entries are already loaded; the short pause tells the person something was added below. */
    showMoreTimeline(): void {
        this.timelineMore.set(true);
        this._timelineTimer = setTimeout(() => {
            this.timelineShown.update((shown) => shown + TIMELINE_STEP);
            this.timelineMore.set(false);
        }, 400);
    }

    load(): void {
        this.loading.set(true);
        this.failed.set(null);
        this._orders.details(this.oid, this.scope).subscribe({
            next: (details) => {
                this.record.set(details);
                this.timelineShown.set(TIMELINE_STEP);
                this.loadReturns();
                this.loading.set(false);
            },
            error: (error: unknown) => {
                this.loading.set(false);
                this.failed.set(failureOf(error));
            },
        });
    }

    private loadReturns(): void {
        if (!this.canViewReturns) return;
        this._returns.forOrder(this.oid).subscribe({
            next: ({ returns, returnable }) => {
                this.returns.set(returns);
                this._returnable.set(Object.fromEntries(returnable.map((line) => [line.order_item_oid, line.returnable])));
            },
            error: () => this._message.warning(this._translate.instant('sales.return.forOrderFailed')),
        });
    }

    returnRaised(created: CreatedReturn): void {
        if (this.canViewReturns) void this._router.navigateByUrl(RETURN_ROUTES.detail(created.return_oid));
        else this.load();
    }

    returnStatusTone(value: string) {
        return this.toneOf(RETURN_STATUS, value);
    }

    backToList(): void {
        void this._router.navigateByUrl(this._listRoute);
    }

    placeOf(o: OrderDetails): string {
        const online = o.online;
        if (!online) return '';
        const bn = this.language() === 'bn';
        return [online.address_line, bn ? online.thana_name_bn : online.thana_name_en, bn ? online.district_name_bn : online.district_name_en, online.postal_code].filter(Boolean).join(', ');
    }

    /** The same A4 invoice the online order prints at Create, drawn from the order as it stands now (sales REQ-57). */
    print(): void {
        const o = this.record();
        if (!o?.online) return;
        const t = (key: string, params?: Record<string, unknown>) => this._translate.instant('sales.online.invoice.' + key, params);
        const money = (value: number) => this._money.transform(value);
        const business = this._session.business();
        const paid = o.payment_status === 'paid' ? o.total_amount : o.payment_status === 'partially_paid' ? o.amount_paid : 0;
        const rows = (...pairs: ([string, string] | null)[]) => pairs.filter((pair): pair is [string, string] => !!pair);
        printInvoice({
            business: business?.name ?? '',
            logoUrl: business?.logoUrl ?? null,
            track: o.tracking_token ? { url: `${environment.trackerUrl}/${o.tracking_token}`, label: t('track') } : null,
            contact: [business?.address, business?.phone].filter((line): line is string => !!line),
            title: t('title'),
            meta: [
                [t('number'), o.invoice_no],
                [t('date'), new RecordDatePipe().transform(o.created_on, this.language(), 'date-time-12')],
            ],
            billedTo: { label: t('billedTo'), lines: [o.customer_name ?? '', o.customer_phone ?? ''] },
            shipTo: { label: t('shipTo'), lines: [o.online.recipient_name ?? '', o.online.recipient_phone ?? o.customer_phone ?? '', this.placeOf(o)] },
            columns: { item: t('item'), quantity: t('quantity'), price: t('price'), amount: t('amount') },
            lines: o.items.map((line) => ({ name: line.product_name, quantity: this._digits.transform(line.quantity), price: money(line.unit_price), amount: money(line.unit_price * line.quantity) })),
            totals: rows([t('subtotal'), money(o.subtotal)], o.discount_total ? [t('discount'), '-' + money(o.discount_total)] : null, [t('delivery'), money(o.delivery_charge)], [t('total'), money(o.total_amount)], paid ? [t('paid'), '-' + money(paid)] : null, [t('collect'), t('withCurrency', { amount: money(this.due()) })]),
            notes: rows(o.payment_type ? [t('payment'), this._translate.instant('sales.online.terms.' + o.payment_type)] : null, o.notes ? [t('note'), o.notes] : null),
            thanks: t('thanks'),
            poweredBy: t('poweredBy'),
        });
    }

    /** The timeline stores codes and the server's own wording; this says them in the reader's language. */
    reasonOf(entry: OrderDetails['status_history'][number]): string {
        const raw = entry.reason ?? '';
        const t = (key: string, params?: object) => this._translate.instant(key, params);
        const known = FIXED_REASONS[raw];
        if (known) return t('sales.order.reason.' + known);
        const cut = raw.indexOf(': ');
        const [code, note] = cut < 0 ? [raw, ''] : [raw.slice(0, cut), raw.slice(cut + 2)];
        const withNote = (label: string) => (note ? label + ': ' + note : label);
        if (entry.kind === 'Order' && entry.to_status === 'Cancelled') return withNote(t('sales.order.cancelReason.' + code));
        if (entry.kind === 'Order' && entry.to_status === 'Confirmed') return withNote(t('sales.order.confirmedVia.' + code));
        if (entry.kind === 'Delivery' && entry.to_status === 'Failed') return withNote(t('sales.order.notDeliveredReason.' + code));
        if (entry.kind === 'Delivery' && entry.from_status === 'Failed' && entry.to_status === 'WithCourier') return t('sales.order.reason.parcelUndone', { number: raw });
        if ((entry.kind === 'Order' && /Returned$/.test(entry.to_status)) || entry.to_status === 'BackInShop') return t('sales.order.reason.returnConfirmed', { number: raw });
        if (entry.kind === 'Delivery' && entry.to_status === 'WithCourier') {
            const [courier, ...consignment] = raw.split(' ');
            return [t('sales.order.couriers.' + courier), ...consignment].join(' ');
        }
        if (entry.kind === 'Refund' && /^\d+$/.test(raw)) return t('sales.order.reason.owed', { amount: this._money.transform(Number(raw)) });
        const refund = entry.kind === 'Refund' ? /^(\d+) by (\w+)$/.exec(code) : null;
        if (refund) return withNote(t('sales.order.reason.refunded', { amount: this._money.transform(Number(refund[1])), method: t('sales.pos.method.' + refund[2]) }));
        return raw;
    }

    readonly editRoute = ORDER_ROUTES.edit;

    private readonly _settings = inject(SalesSettingsService);
    private readonly _templates = signal<MessageTemplate[]>([]);
    readonly templatesFailed = signal(false);
    /** The business's templates that fit the order's stage now, filled in with this order (sales REQ-51, REQ-91). */
    readonly messages = computed(() => {
        const o = this.record();
        if (!o?.online) return [];
        const bn = this.language() === 'bn';
        const money = (value: number) => this._money.transform(value);
        const business = this._session.business();
        const place = [o.online.address_line, bn ? o.online.thana_name_bn : o.online.thana_name_en, bn ? o.online.district_name_bn : o.online.district_name_en].filter(Boolean).join(', ');
        const values = {
            customer_name: o.online.recipient_name ?? o.customer_name ?? '',
            invoice_no: o.invoice_no,
            items: o.items.map((line) => `${line.product_name} x${line.quantity}`).join(', '),
            total: money(o.total_amount),
            due: money(this.due()),
            delivery_charge: money(o.delivery_charge),
            address: place,
            tracking_link: o.tracking_token ? `${environment.trackerUrl}/${o.tracking_token}` : '',
            business_name: business?.name ?? '',
            business_phone: business?.phone ?? '',
        };
        return templatesFor(this._templates(), [o.status, o.online.delivery_status, o.refund_status]).map((template) => ({ template, text: fillMessage(template.body, values) }));
    });

    private loadTemplates(): void {
        this._settings.templates().subscribe({
            next: (templates) => this._templates.set(templates),
            error: () => this.templatesFailed.set(true),
        });
    }

    /** Logged on the order, so the record shows the customer was told. */
    copied(template: MessageTemplate): void {
        this._settings.recordCopied(this.oid, template.oid).subscribe({ error: () => this._message.warning(this._translate.instant('sales.order.messages.notLogged')) });
    }

    open(dialog: Dialog): void {
        this.note.set('');
        this.cancelReason.set(null);
        this.notDeliveredReason.set(null);
        this.courier.set(this.record()?.online?.courier ?? null);
        this.consignment.set('');
        this.confirmedVia.set('PhoneCall');
        this.refundAmount.set(this.record()?.refund_due ?? null);
        this.refundMethod.set(null);
        this.confirming.set(false);
        this.dialog.set(dialog);
    }

    markPacked(): void {
        this.ask('packed', () => this._orders.markPacked(this.oid));
    }

    deliver(): void {
        this.ask('deliver', () => this._orders.deliver(this.oid));
    }

    /** A dialog asks inside itself: the first press turns the body into the confirmation, never a second modal on top. */
    submitDialog(): void {
        const dialog = this.dialog();
        if (!dialog || this.dialogIncomplete() || this.saving()) return;
        if (!this.confirming()) {
            this.confirming.set(true);
            return;
        }
        const note = this.note().trim() || null;
        const send: Record<Dialog, () => Observable<unknown>> = {
            confirm: () => this._orders.confirm(this.oid, this.confirmedVia(), note, this.scope),
            cancel: () => this._orders.cancel(this.oid, this.cancelReason()!, note, this.scope),
            dispatch: () => this._orders.dispatch(this.oid, this.courier()!, this.consignment().trim() || null),
            notDelivered: () => this._orders.notDelivered(this.oid, this.notDeliveredReason()!, note),
            refund: () => this._orders.recordRefund(this.oid, this.refundAmount()!, this.refundMethod()!, note),
        };
        this.run(dialog, send[dialog]);
    }

    private ask(action: 'packed' | 'deliver', send: () => Observable<unknown>): void {
        const key = 'sales.order.action.' + action;
        confirmAction(this._modal, {
            title: this._translate.instant(key + '.confirmTitle', { number: this.record()?.invoice_no ?? '' }),
            body: this._translate.instant(key + '.confirmBody'),
            ok: this._translate.instant(key + '.button'),
            cancel: this._translate.instant('form.confirm.cancel'),
        }).subscribe((confirmed) => {
            if (confirmed) this.run(action, send);
        });
    }

    /** Reloads the order after every action, so the page shows what the server now holds. */
    private run(action: Dialog | 'packed' | 'deliver', send: () => Observable<unknown>): void {
        this.acting.set(action);
        send()
            .pipe(finalize(() => this.acting.set(null)))
            .subscribe({
                next: () => {
                    this.dialog.set(null);
                    this._message.success(this._translate.instant('sales.order.action.' + action + '.done'));
                    this.load();
                },
                error: (error: unknown) => this.writeFailed(error),
            });
    }

    /** A 409 says what state the order is in now: show it and reload, so the page catches up. */
    private writeFailed(error: unknown): void {
        if (error instanceof HttpErrorResponse && error.status === 409) {
            this._message.error(error.error?.message ?? this._translate.instant('sales.order.movedOn'));
            this.dialog.set(null);
            this.load();
            return;
        }
        this._message.error(this._translate.instant(failureKey(error, 'form.saveFailed')));
    }

    private toneOf(map: typeof ORDER_STATUS, value: string | null | undefined) {
        return value ? (resolveTone(map, value, undefined, 'the order record')?.style ?? null) : null;
    }

    private seedFromList(): Partial<OrderDetails> | null {
        const row = this._router.currentNavigation()?.extras.state?.['row'] as Partial<OrderDetails> | undefined;
        return row?.oid === this.oid ? row : null;
    }
}
