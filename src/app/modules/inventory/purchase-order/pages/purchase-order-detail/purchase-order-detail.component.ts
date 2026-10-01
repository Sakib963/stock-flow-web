import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft, lucideBadgeCheck, lucideBan, lucideBanknote, lucideBoxes, lucideChevronDown, lucideChevronUp, lucideChevronsUpDown, lucideCircleAlert, lucideClock, lucideFilePen, lucideFileSpreadsheet, lucideHandCoins, lucideHistory, lucideInfo, lucideListOrdered, lucidePackage, lucidePackageCheck, lucidePencil, lucideRotateCw, lucideWallet, lucideX, lucideZap } from '@ng-icons/lucide';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTimelineModule } from 'ng-zorro-antd/timeline';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { RequestFailure } from '@app/core/models/api.model';
import { PageBack } from '@app/core/models/page-header.model';
import { BUDGET_KEYS, PAYMENT_STATUSES, PaymentStatus, PurchaseOrderDetails, PurchaseOrderLine, PurchaseOrderReport, PurchaseOrderRow } from '@app/core/models/purchase-order.model';
import { LanguageService } from '@app/core/services/language/language.service';
import { SessionService } from '@app/core/services/session/session.service';
import { PAYMENT_STATUS, PURCHASE_ORDER_STATUS } from '@app/modules/inventory/purchase-order/config/purchase-order-list.config';
import { PURCHASE_ORDER_ROUTES } from '@app/modules/inventory/purchase-order/constants/purchase-order-routes';
import { PurchaseOrderService } from '@app/modules/inventory/purchase-order/services/purchase-order.service';
import { orderFailureKey } from '@app/modules/inventory/purchase-order/utils/order-failure/order-failure';
import { BatchExpiryComponent } from '@app/shared/components/batch-expiry/batch-expiry.component';
import { budgetPerUnit, marginPerUnit } from '@app/modules/inventory/purchase-order/utils/verify-line/verify-line';
import { ActionFooterComponent } from '@app/shared/components/action-footer/action-footer.component';
import { PageHeaderComponent } from '@app/shared/components/page-header/page-header.component';
import { StatusTagComponent } from '@app/shared/components/status-tag/status-tag.component';
import { CopyableDirective } from '@app/shared/directives/copyable/copyable.directive';
import { DigitsPipe } from '@app/shared/pipes/digits/digits.pipe';
import { MoneyPipe } from '@app/shared/pipes/money/money.pipe';
import { RecordDatePipe } from '@app/shared/pipes/record-date/record-date.pipe';
import { saveDownload } from '@app/shared/utils/download-file/download-file';
import { failureKey, failureOf } from '@app/shared/utils/request-failure/request-failure';
import { resolveTone } from '@app/shared/utils/tone-map/tone-map';
import { revealErrors } from '@app/shared/utils/reveal-errors/reveal-errors';
import { businessToday } from '@app/shared/utils/business-time/business-time';

/** One figure in the strip under the details. `note` is a line of context under it. */
interface OrderStat {
    key: string;
    label: string;
    value: number | string;
    icon: string;
    format: 'money' | 'number' | 'text';
    tone?: 'danger' | 'warning' | 'success';
    note?: { key: string; params?: Record<string, unknown> } | null;
}

/**
 * One purchase order. Its state decides what it offers: a Submitted order can be verified, edited
 * or cancelled; payment can be recorded until it is cancelled; a Verified or Cancelled order is final.
 */
@Component({
    selector: 'purchase-order-detail',
    imports: [NgIcon, ReactiveFormsModule, NzButtonModule, NzCardModule, NzFormModule, NzInputModule, NzInputNumberModule, NzModalModule, NzRadioModule, NzSkeletonModule, NzTableModule, NzTimelineModule, TranslatePipe, PageHeaderComponent, StatusTagComponent, ActionFooterComponent, CopyableDirective, MoneyPipe, RecordDatePipe, DigitsPipe, BatchExpiryComponent],
    providers: [
        MoneyPipe,
        provideIcons({
            lucideArrowLeft,
            lucideBadgeCheck,
            lucideBan,
            lucideBanknote,
            lucideBoxes,
            lucideChevronDown,
            lucideChevronUp,
            lucideChevronsUpDown,
            lucideCircleAlert,
            lucideClock,
            lucideFilePen,
            lucideFileSpreadsheet,
            lucideHandCoins,
            lucideHistory,
            lucideInfo,
            lucideListOrdered,
            lucidePackage,
            lucidePackageCheck,
            lucidePencil,
            lucideRotateCw,
            lucideWallet,
            lucideX,
            lucideZap,
        }),
    ],
    templateUrl: './purchase-order-detail.component.html',
    styleUrl: './purchase-order-detail.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PurchaseOrderDetailComponent {
    private readonly _route = inject(ActivatedRoute);
    private readonly _router = inject(Router);
    private readonly _orders = inject(PurchaseOrderService);
    private readonly _session = inject(SessionService);
    private readonly _translate = inject(TranslateService);
    private readonly _message = inject(NzMessageService);
    private readonly _builder = inject(FormBuilder).nonNullable;
    private readonly _money = inject(MoneyPipe);

    readonly language = inject(LanguageService).current;
    readonly oid = this._route.snapshot.paramMap.get('oid') ?? '';
    readonly back: PageBack = { route: PURCHASE_ORDER_ROUTES.list };
    readonly budgetKeys = BUDGET_KEYS;
    readonly paymentStatuses = PAYMENT_STATUSES;

    /** The list's row for this order, when the page was opened from the list. */
    private readonly _seed = this.seedFromList();

    readonly record = signal<PurchaseOrderDetails | null>(null);
    readonly loading = signal(true);
    readonly failed = signal<RequestFailure | null>(null);
    readonly expanded = signal<ReadonlySet<string>>(new Set());

    /** What the header draws: the full record once it is here, the list's row until then. */
    readonly order = computed<Partial<PurchaseOrderRow> | null>(() => this.record()?.details ?? this._seed);
    readonly status = computed(() => this.order()?.status ?? null);
    readonly statusTone = computed(() => (this.status() ? resolveTone(PURCHASE_ORDER_STATUS, this.status()!, undefined, 'the purchase order status')?.style : null));
    readonly paymentTone = computed(() => (this.order()?.payment_status ? resolveTone(PAYMENT_STATUS, this.order()!.payment_status!, undefined, 'the payment status')?.style : null));

    readonly draft = computed(() => this.status() === 'Draft');
    readonly submitted = computed(() => this.status() === 'Submitted');
    /** A Draft or a Submitted order: nothing has arrived, so it can still change or be called off. */
    readonly open = computed(() => this.draft() || this.submitted());
    readonly verified = computed(() => this.status() === 'Verified');
    readonly cancelled = computed(() => this.status() === 'Cancelled');

    readonly canVerify = computed(() => this.submitted() && this._session.can('inventory.purchase-order.approve'));
    readonly canEdit = computed(() => this.open() && this._session.can('inventory.purchase-order.edit'));
    readonly canCancel = computed(() => this.open() && this._session.can('inventory.purchase-order.cancel'));
    /** A verified batch's expiry stays editable: a date missed or typed wrong at verify is fixed here. */
    readonly canEditExpiry = computed(() => this.verified() && this._session.can('inventory.purchase-order.edit'));
    // A draft's payment is part of its form until it is submitted.
    readonly canPay = computed(() => !!this.record() && (this.submitted() || this.verified()) && this._session.can('inventory.purchase-order.edit'));
    readonly canExport = computed(() => this._session.can('inventory.purchase-order.export'));

    readonly overdue = computed(() => {
        const expected = this.record()?.details.expected_delivery_date;
        return this.submitted() && !!expected && expected < businessToday();
    });

    readonly stats = computed<OrderStat[]>(() => {
        const loaded = this.record();
        if (!loaded) return [];
        const { stats: s, details: d } = loaded;
        const paid = Number(d.paid_amount);
        if (d.status === 'Verified') {
            const difference = s.ordered_total - (s.received_total ?? 0);
            return [
                { key: 'received', label: 'inventory.purchaseOrder.stat.receivedTotal', value: s.received_total ?? 0, icon: 'lucideBanknote', format: 'money', note: difference ? { key: difference > 0 ? 'inventory.purchaseOrder.stat.lessThanOrdered' : 'inventory.purchaseOrder.stat.moreThanOrdered', params: { amount: this._money.transform(Math.abs(difference)) } } : { key: 'inventory.purchaseOrder.stat.asOrdered' } },
                { key: 'units', label: 'inventory.purchaseOrder.stat.unitsReceived', value: `${s.received_units} / ${s.ordered_units}`, icon: 'lucidePackageCheck', format: 'text', tone: s.lines_short ? 'warning' : undefined, note: s.units_short ? { key: 'inventory.purchaseOrder.stat.unitsShort', params: { count: s.units_short } } : { key: 'inventory.purchaseOrder.stat.allArrived' } },
                { key: 'paid', label: 'inventory.purchaseOrder.paid', value: paid, icon: 'lucideWallet', format: 'money', note: d.payment_status ? { key: 'inventory.purchaseOrder.payment.' + d.payment_status } : null },
                { key: 'budgets', label: 'inventory.purchaseOrder.stat.budgets', value: s.budgets_total ?? 0, icon: 'lucideHandCoins', format: 'money', note: { key: 'inventory.purchaseOrder.stat.acrossBatches', params: { count: s.batches } } },
            ];
        }
        if (d.status === 'Cancelled') {
            return [
                { key: 'ordered', label: 'inventory.purchaseOrder.stat.orderedTotal', value: s.ordered_total, icon: 'lucideBanknote', format: 'money', note: { key: 'inventory.purchaseOrder.stat.productsUnits', params: { products: loaded.lines.length, units: s.ordered_units } } },
                { key: 'paid', label: 'inventory.purchaseOrder.stat.paidAdvance', value: paid, icon: 'lucideWallet', format: 'money', tone: paid > 0 ? 'danger' : undefined, note: paid > 0 ? { key: 'inventory.purchaseOrder.stat.toRecover' } : null },
                { key: 'received', label: 'inventory.purchaseOrder.stat.received', value: 0, icon: 'lucidePackage', format: 'number', note: { key: 'inventory.purchaseOrder.stat.nothingArrived' } },
            ];
        }
        return [
            { key: 'ordered', label: 'inventory.purchaseOrder.stat.orderedTotal', value: s.ordered_total, icon: 'lucideBanknote', format: 'money', note: { key: 'inventory.purchaseOrder.stat.productsUnits', params: { products: loaded.lines.length, units: s.ordered_units } } },
            { key: 'paid', label: 'inventory.purchaseOrder.paid', value: paid, icon: 'lucideWallet', format: 'money', note: d.payment_status ? { key: 'inventory.purchaseOrder.payment.' + d.payment_status } : null },
            { key: 'warehouses', label: 'inventory.purchaseOrder.stat.warehouses', value: s.warehouses, icon: 'lucideBoxes', format: 'number' },
        ];
    });

    // Record payment.
    readonly paymentOpen = signal(false);
    /** The confirmation, drawn in the same dialog so a second modal never opens over the first. */
    readonly paymentReview = signal<{ from: { status: PaymentStatus; amount: number }; to: { status: PaymentStatus; amount: number } } | null>(null);
    readonly paymentForm = this._builder.group({
        payment_status: ['unpaid' as PaymentStatus, [Validators.required]],
        paid_amount: [null as number | null],
    });

    // Cancel.
    readonly cancelOpen = signal(false);
    readonly cancelForm = this._builder.group({ reason: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(500)]] });

    readonly saving = this._orders.saving;
    readonly downloading = signal<PurchaseOrderReport | null>(null);
    readonly reports: readonly { kind: PurchaseOrderReport; label: string }[] = [
        { kind: 'summary', label: 'inventory.purchaseOrder.report.summary' },
        { kind: 'products', label: 'inventory.purchaseOrder.report.products' },
    ];

    constructor() {
        this.load();
        this.paymentForm.controls.payment_status.valueChanges.subscribe((status) => {
            const paid = this.paymentForm.controls.paid_amount;
            paid.setValidators(status === 'partially_paid' ? [Validators.required, Validators.min(1)] : []);
            paid.updateValueAndValidity();
        });
    }

    load(): void {
        this.loading.set(true);
        this.failed.set(null);
        this._orders.details(this.oid).subscribe({
            next: (record) => {
                this.record.set(record);
                this.loading.set(false);
            },
            error: (error: unknown) => {
                this.loading.set(false);
                this.failed.set(failureOf(error));
            },
        });
    }

    toggle(line: PurchaseOrderLine): void {
        this.expanded.update((set) => {
            const next = new Set(set);
            if (next.has(line.oid)) next.delete(line.oid);
            else next.add(line.oid);
            return next;
        });
    }

    toggleAll(): void {
        const lines = this.record()?.lines ?? [];
        this.expanded.update((set) => (set.size === lines.length ? new Set() : new Set(lines.map((line) => line.oid))));
    }

    budgetOf(line: PurchaseOrderLine): number {
        return budgetPerUnit(line);
    }

    /** The first batch's price: a line verified before the port can carry more than one batch, all at one price. */
    marginOf(line: PurchaseOrderLine): number | null {
        const batch = line.batches[0];
        return batch?.intended_use === 'for_sale' && batch.selling_price !== null ? marginPerUnit(Number(batch.selling_price), Number(line.received_unit_price ?? 0), this.budgetOf(line)) : null;
    }

    lineTotal(quantity: number | null, price: string | null): number {
        return Number(quantity ?? 0) * Number(price ?? 0);
    }

    verify(): void {
        void this._router.navigateByUrl(PURCHASE_ORDER_ROUTES.verify(this.oid));
    }

    edit(): void {
        void this._router.navigateByUrl(PURCHASE_ORDER_ROUTES.edit(this.oid));
    }

    openPayment(): void {
        const d = this.record()?.details;
        if (!d) return;
        this.paymentForm.reset({ payment_status: d.payment_status ?? 'unpaid', paid_amount: d.payment_status === 'partially_paid' ? Number(d.paid_amount) : null });
        this.paymentReview.set(null);
        this.paymentOpen.set(true);
    }

    /** Asks before recording; a payment that says what the order already says closes without asking or saving. */
    reviewPayment(): void {
        const d = this.record()?.details;
        if (!d) return;
        if (this.paymentForm.invalid) {
            revealErrors(this.paymentForm);
            return;
        }
        const { payment_status, paid_amount } = this.paymentForm.getRawValue();
        const total = Number(d.total_amount);
        const to = { status: payment_status, amount: payment_status === 'paid' ? total : payment_status === 'partially_paid' ? Number(paid_amount) : 0 };
        const from = { status: d.payment_status ?? 'unpaid', amount: Number(d.paid_amount) };
        if (from.status === to.status && from.amount === to.amount) {
            this.paymentOpen.set(false);
            this._message.info(this._translate.instant('form.nothingChanged'));
            return;
        }
        this.paymentReview.set({ from, to });
    }

    savePayment(): void {
        if (this.paymentForm.invalid || this.saving()) {
            revealErrors(this.paymentForm);
            return;
        }
        const { payment_status, paid_amount } = this.paymentForm.getRawValue();
        this._orders.recordPayment({ oid: this.oid, payment_status, paid_amount: payment_status === 'partially_paid' ? Number(paid_amount) : 0 }).subscribe({
            next: (changed) => {
                this.paymentOpen.set(false);
                this._message[changed ? 'success' : 'info'](this._translate.instant(changed ? 'inventory.purchaseOrder.paymentRecorded' : 'form.nothingChanged'));
                if (changed) this.load();
            },
            error: (error: unknown) => this._message.error(this._translate.instant(orderFailureKey(error, 'form.saveFailed'))),
        });
    }

    openCancel(): void {
        this.cancelForm.reset({ reason: '' });
        this.cancelOpen.set(true);
    }

    confirmCancel(): void {
        if (this.cancelForm.invalid || this.saving()) {
            revealErrors(this.cancelForm);
            return;
        }
        this._orders.cancel(this.oid, this.cancelForm.getRawValue().reason.trim()).subscribe({
            next: () => {
                this.cancelOpen.set(false);
                this._message.success(this._translate.instant('inventory.purchaseOrder.cancelledMessage'));
                this.load();
            },
            error: (error: unknown) => this._message.error(this._translate.instant(orderFailureKey(error, 'form.saveFailed'))),
        });
    }

    download(kind: PurchaseOrderReport): void {
        if (this.downloading()) return;
        this.downloading.set(kind);
        this._orders.report(kind, this.oid).subscribe({
            next: (response) => {
                this.downloading.set(null);
                saveDownload(response, `${this.order()?.po_number ?? 'purchase-order'}-${kind}.xlsx`);
            },
            error: (error: unknown) => {
                this.downloading.set(null);
                this._message.error(this._translate.instant(failureKey(error, 'inventory.purchaseOrder.report.failed')));
            },
        });
    }

    backToList(): void {
        void this._router.navigateByUrl(PURCHASE_ORDER_ROUTES.list);
    }

    /** Only a row for this very order counts: navigation state survives a reload and a Back. */
    private seedFromList(): Partial<PurchaseOrderRow> | null {
        const row = this._router.currentNavigation()?.extras.state?.['row'] as Partial<PurchaseOrderRow> | undefined;
        return row?.oid === this.oid ? row : null;
    }
}
