import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft, lucideCheck, lucideChevronDown, lucideChevronUp, lucideChevronsUpDown, lucideListChecks, lucidePackageCheck, lucidePencil, lucideRotateCw, lucideX } from '@ng-icons/lucide';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { NzProgressModule } from 'ng-zorro-antd/progress';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzTableModule } from 'ng-zorro-antd/table';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { RequestFailure } from '@app/core/models/api.model';
import { HasUnsavedChanges } from '@app/core/guards/unsaved-changes/unsaved-changes.guard';
import { PageBack } from '@app/core/models/page-header.model';
import { BUDGET_KEYS, PurchaseOrderDetails, PurchaseOrderLine, VerifyLinePayload } from '@app/core/models/purchase-order.model';
import { LanguageService } from '@app/core/services/language/language.service';
import { VerifyLineDrawerComponent } from '@app/modules/inventory/purchase-order/components/verify-line-drawer/verify-line-drawer.component';
import { PURCHASE_ORDER_ROUTES } from '@app/modules/inventory/purchase-order/constants/purchase-order-routes';
import { PurchaseOrderService } from '@app/modules/inventory/purchase-order/services/purchase-order.service';
import { orderFailureKey } from '@app/modules/inventory/purchase-order/utils/order-failure/order-failure';
import { allArrived, budgetPerUnit, lineReady, marginPerUnit } from '@app/modules/inventory/purchase-order/utils/verify-line/verify-line';
import { ActionFooterComponent } from '@app/shared/components/action-footer/action-footer.component';
import { PageHeaderComponent } from '@app/shared/components/page-header/page-header.component';
import { StatusTagComponent } from '@app/shared/components/status-tag/status-tag.component';
import { DigitsPipe } from '@app/shared/pipes/digits/digits.pipe';
import { MoneyPipe } from '@app/shared/pipes/money/money.pipe';
import { RecordDatePipe } from '@app/shared/pipes/record-date/record-date.pipe';
import { confirmAction } from '@app/shared/utils/confirm-action/confirm-action';
import { failureOf } from '@app/shared/utils/request-failure/request-failure';

/**
 * Receiving a delivery, counted by hand.
 *
 * Each line is ticked "All arrived" when it came as ordered, or opened with Edit when something
 * differs. An expanded row only shows what was recorded. Nothing moves until
 * Verify, which adds every batch in one step and cannot be undone.
 */
@Component({
    selector: 'purchase-order-verify',
    imports: [NgIcon, NzButtonModule, NzProgressModule, NzSkeletonModule, NzTableModule, TranslatePipe, PageHeaderComponent, ActionFooterComponent, StatusTagComponent, VerifyLineDrawerComponent, MoneyPipe, DigitsPipe, RecordDatePipe],
    providers: [MoneyPipe, provideIcons({ lucideArrowLeft, lucideCheck, lucideChevronDown, lucideChevronUp, lucideChevronsUpDown, lucideListChecks, lucidePackageCheck, lucidePencil, lucideRotateCw, lucideX })],
    templateUrl: './purchase-order-verify.component.html',
    styleUrl: './purchase-order-verify.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PurchaseOrderVerifyComponent implements HasUnsavedChanges {
    private readonly _route = inject(ActivatedRoute);
    private readonly _router = inject(Router);
    private readonly _orders = inject(PurchaseOrderService);
    private readonly _message = inject(NzMessageService);
    private readonly _translate = inject(TranslateService);
    private readonly _modal = inject(NzModalService);
    private readonly _money = inject(MoneyPipe);

    readonly language = inject(LanguageService).current;
    readonly budgetKeys = BUDGET_KEYS;
    readonly oid = this._route.snapshot.paramMap.get('oid') ?? '';
    readonly back: PageBack = { route: PURCHASE_ORDER_ROUTES.detail(this.oid) };

    readonly record = signal<PurchaseOrderDetails | null>(null);
    readonly loading = signal(true);
    readonly failed = signal<RequestFailure | null>(null);
    readonly verifying = signal(false);
    private _done = false;

    /** What has been recorded per line, by the line's oid. A line is checked once it is here and valid. */
    readonly counted = signal<Record<string, VerifyLinePayload>>({});
    readonly expanded = signal<ReadonlySet<string>>(new Set());
    /** The line open in the drawer. */
    readonly editing = signal<PurchaseOrderLine | null>(null);

    readonly lines = computed(() => this.record()?.lines ?? []);
    readonly closed = computed(() => {
        const status = this.record()?.details.status;
        return status && status !== 'Submitted' ? status.toLowerCase() : null;
    });

    readonly checked = computed(() => this.lines().filter((line) => lineReady(this.counted()[line.oid], line)).length);
    readonly progress = computed(() => (this.lines().length ? Math.round((this.checked() / this.lines().length) * 100) : 0));
    readonly unitsShort = computed(() => this.lines().reduce((sum, line) => sum + Math.max((line.ordered_quantity ?? 0) - (this.counted()[line.oid]?.received_quantity ?? line.ordered_quantity ?? 0), 0), 0));
    readonly priceChanged = computed(() => this.lines().filter((line) => this.counted()[line.oid] && this.counted()[line.oid].unit_price !== Number(line.ordered_unit_price)).length);
    readonly receivedTotal = computed(() => this.lines().reduce((sum, line) => sum + (this.counted()[line.oid] ? this.counted()[line.oid].received_quantity * this.counted()[line.oid].unit_price : 0), 0));
    readonly orderedTotal = computed(() => this.record()?.stats.ordered_total ?? 0);
    readonly ready = computed(() => this.lines().length > 0 && this.checked() === this.lines().length);

    readonly nextUnchecked = computed(() => {
        const current = this.editing();
        const lines = this.lines();
        const start = current ? lines.findIndex((line) => line.oid === current.oid) + 1 : 0;
        return [...lines.slice(start), ...lines.slice(0, start)].find((line) => line.oid !== current?.oid && !lineReady(this.counted()[line.oid], line)) ?? null;
    });

    constructor() {
        this.load();
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

    hasUnsavedChanges(): boolean {
        return !this._done && Object.keys(this.counted()).length > 0;
    }

    isChecked(line: PurchaseOrderLine): boolean {
        return lineReady(this.counted()[line.oid], line);
    }

    /** A checked line that came short or at another price than ordered. */
    differs(line: PurchaseOrderLine): boolean {
        const value = this.counted()[line.oid];
        return !!value && (value.received_quantity !== line.ordered_quantity || value.unit_price !== Number(line.ordered_unit_price));
    }

    valueOf(line: PurchaseOrderLine): VerifyLinePayload | null {
        return this.counted()[line.oid] ?? null;
    }

    margin(line: PurchaseOrderLine): number | null {
        const value = this.counted()[line.oid];
        return value && value.intended_use === 'for_sale' && value.selling_price !== undefined ? marginPerUnit(value.selling_price, value.unit_price, budgetPerUnit(value)) : null;
    }

    /** Ticks a line as it was ordered. A product that has never been priced opens instead, since it needs a price. */
    arrived(line: PurchaseOrderLine, event: Event): void {
        event.stopPropagation();
        const value = allArrived(line);
        if (!value) {
            this.editing.set(line);
            return;
        }
        this.counted.update((all) => ({ ...all, [line.oid]: value }));
    }

    open(line: PurchaseOrderLine, event?: Event): void {
        event?.stopPropagation();
        this.editing.set(line);
    }

    toggle(line: PurchaseOrderLine, event: Event): void {
        event.stopPropagation();
        this.expanded.update((set) => {
            const next = new Set(set);
            if (next.has(line.oid)) next.delete(line.oid);
            else next.add(line.oid);
            return next;
        });
    }

    toggleAll(): void {
        this.expanded.update((set) => (set.size === this.lines().length ? new Set() : new Set(this.lines().map((line) => line.oid))));
    }

    saved({ value, next }: { value: VerifyLinePayload; next: boolean }): void {
        this.counted.update((all) => ({ ...all, [value.oid]: value }));
        this.editing.set(next ? this.nextUnchecked() : null);
    }

    verify(): void {
        const record = this.record();
        if (!record || !this.ready() || this.verifying()) return;

        confirmAction(this._modal, {
            title: this._translate.instant('inventory.purchaseOrder.confirmVerify.title', { number: record.details.po_number }),
            body: this._translate.instant('inventory.purchaseOrder.confirmVerify.body', { number: record.details.po_number, total: this._money.transform(this.receivedTotal()) }),
            ok: this._translate.instant('inventory.purchaseOrder.verifyAndAdd'),
            cancel: this._translate.instant('form.confirm.cancel'),
        }).subscribe((confirmed) => {
            if (!confirmed) return;
            this.verifying.set(true);
            this._orders
                .verify(
                    this.oid,
                    this.lines().map((line) => this.counted()[line.oid])
                )
                .subscribe({
                    next: (result) => {
                        this._done = true;
                        this.verifying.set(false);
                        this._message.success(this._translate.instant('inventory.purchaseOrder.verifiedMessage', { units: result.units, batches: result.batches }));
                        void this._router.navigateByUrl(PURCHASE_ORDER_ROUTES.detail(this.oid));
                    },
                    error: (error: unknown) => {
                        this.verifying.set(false);
                        this._message.error(this._translate.instant(orderFailureKey(error, 'inventory.purchaseOrder.verifyFailed')));
                    },
                });
        });
    }

    backToOrder(): void {
        void this._router.navigateByUrl(PURCHASE_ORDER_ROUTES.detail(this.oid));
    }
}
