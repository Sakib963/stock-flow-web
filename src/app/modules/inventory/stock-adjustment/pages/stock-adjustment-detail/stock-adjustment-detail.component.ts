import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft, lucideBadgeCheck, lucideBan, lucideCircleX, lucideFilePen, lucideFileSpreadsheet, lucideHistory, lucideInfo, lucideListOrdered, lucidePackageMinus, lucidePackagePlus, lucidePencil, lucideRotateCw, lucideWallet, lucideZap } from '@ng-icons/lucide';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTimelineModule } from 'ng-zorro-antd/timeline';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { RequestFailure } from '@app/core/models/api.model';
import { PageBack } from '@app/core/models/page-header.model';
import { StockAdjustmentRecord, StockAdjustmentRow } from '@app/core/models/stock-adjustment.model';
import { LanguageService } from '@app/core/services/language/language.service';
import { SessionService } from '@app/core/services/session/session.service';
import { STOCK_ADJUSTMENT_REASON, STOCK_ADJUSTMENT_STATUS } from '@app/modules/inventory/stock-adjustment/config/stock-adjustment-list.config';
import { STOCK_ADJUSTMENT_ROUTES } from '@app/modules/inventory/stock-adjustment/constants/stock-adjustment-routes';
import { StockAdjustmentService } from '@app/modules/inventory/stock-adjustment/services/stock-adjustment.service';
import { adjustmentFailure } from '@app/modules/inventory/stock-adjustment/utils/adjustment-failure/adjustment-failure';
import { STOCK_OVERVIEW_ROUTES } from '@app/modules/inventory/stock-overview/constants/stock-overview-routes';
import { ActionFooterComponent } from '@app/shared/components/action-footer/action-footer.component';
import { PageHeaderComponent } from '@app/shared/components/page-header/page-header.component';
import { StatusTagComponent } from '@app/shared/components/status-tag/status-tag.component';
import { NzTypographyModule } from 'ng-zorro-antd/typography';
import { DigitsPipe } from '@app/shared/pipes/digits/digits.pipe';
import { MoneyPipe } from '@app/shared/pipes/money/money.pipe';
import { RecordDatePipe } from '@app/shared/pipes/record-date/record-date.pipe';
import { confirmAction } from '@app/shared/utils/confirm-action/confirm-action';
import { saveDownload } from '@app/shared/utils/download-file/download-file';
import { failureKey, failureOf } from '@app/shared/utils/request-failure/request-failure';
import { revealErrors } from '@app/shared/utils/reveal-errors/reveal-errors';
import { resolveTone } from '@app/shared/utils/tone-map/tone-map';

type Closing = 'reject' | 'cancel';

/**
 * One adjustment. A Submitted one can be verified, which is the only step that moves stock, or
 * rejected; a Draft or Submitted one can be edited or cancelled; the rest are final.
 */
@Component({
    selector: 'stock-adjustment-detail',
    imports: [NgIcon, ReactiveFormsModule, RouterLink, NzButtonModule, NzCardModule, NzFormModule, NzInputModule, NzModalModule, NzSkeletonModule, NzTableModule, NzTimelineModule, TranslatePipe, PageHeaderComponent, StatusTagComponent, ActionFooterComponent, NzTypographyModule, DigitsPipe, MoneyPipe, RecordDatePipe],
    providers: [MoneyPipe, DigitsPipe, provideIcons({ lucideArrowLeft, lucideBadgeCheck, lucideBan, lucideCircleX, lucideFilePen, lucideFileSpreadsheet, lucideHistory, lucideInfo, lucideListOrdered, lucidePackageMinus, lucidePackagePlus, lucidePencil, lucideRotateCw, lucideWallet, lucideZap })],
    templateUrl: './stock-adjustment-detail.component.html',
    styleUrl: './stock-adjustment-detail.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StockAdjustmentDetailComponent {
    private readonly _route = inject(ActivatedRoute);
    private readonly _router = inject(Router);
    private readonly _adjustments = inject(StockAdjustmentService);
    private readonly _session = inject(SessionService);
    private readonly _translate = inject(TranslateService);
    private readonly _message = inject(NzMessageService);
    private readonly _modal = inject(NzModalService);
    private readonly _money = inject(MoneyPipe);
    private readonly _digits = inject(DigitsPipe);

    readonly language = inject(LanguageService).current;
    readonly oid = this._route.snapshot.paramMap.get('oid') ?? '';
    readonly back: PageBack = { route: STOCK_ADJUSTMENT_ROUTES.list };
    readonly productStockRoute = STOCK_OVERVIEW_ROUTES.product;
    private readonly _seed = this.seedFromList();

    readonly record = signal<StockAdjustmentRecord | null>(null);
    readonly loading = signal(true);
    readonly failed = signal<RequestFailure | null>(null);

    readonly adjustment = computed<Partial<StockAdjustmentRow> | null>(() => this.record()?.details ?? this._seed);
    readonly status = computed(() => this.adjustment()?.status ?? null);
    readonly statusTone = computed(() => (this.status() ? resolveTone(STOCK_ADJUSTMENT_STATUS, this.status()!, undefined, 'the adjustment status')?.style : null));
    readonly reasonTone = computed(() => (this.adjustment()?.reason ? resolveTone(STOCK_ADJUSTMENT_REASON, this.adjustment()!.reason!, undefined, 'the adjustment reason')?.style : null));
    readonly seesMoney = computed(() => this.record()?.sees_money ?? false);

    readonly draft = computed(() => this.status() === 'Draft');
    readonly submitted = computed(() => this.status() === 'Submitted');
    readonly open = computed(() => this.draft() || this.submitted());

    readonly canVerify = computed(() => this.submitted() && this._session.can('inventory.stock-adjustment.approve'));
    readonly canReject = computed(() => this.submitted() && this._session.can('inventory.stock-adjustment.reject'));
    readonly canEdit = computed(() => this.open() && this._session.can('inventory.stock-adjustment.edit'));
    readonly canCancel = computed(() => this.open() && this._session.can('inventory.stock-adjustment.cancel'));
    readonly canExport = computed(() => this._session.can('inventory.stock-adjustment.export'));
    readonly canOpenStock = computed(() => this._session.can('inventory.overview.view'));

    readonly saving = this._adjustments.saving;
    readonly downloading = signal(false);

    /** Reject and cancel share one dialog: both say why, and neither moves stock. */
    readonly closing = signal<Closing | null>(null);
    readonly closeForm = inject(FormBuilder).nonNullable.group({ reason: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(500)]] });

    constructor() {
        this.load();
    }

    load(): void {
        this.loading.set(true);
        this.failed.set(null);
        this._adjustments.details(this.oid).subscribe({
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

    /** Asks first with what will move, since verifying is the one step that changes stock. */
    verify(): void {
        const d = this.record()?.details;
        if (!d || this.saving()) return;
        const value = this.seesMoney() ? this._translate.instant('inventory.stockAdjustment.confirmVerify.value', { in: this._money.transform(Number(d.value_in ?? 0)), out: this._money.transform(Number(d.value_out ?? 0)) }) : '';
        confirmAction(this._modal, {
            title: this._translate.instant('inventory.stockAdjustment.confirmVerify.title', { number: d.adjustment_number }),
            body: `${this._translate.instant('inventory.stockAdjustment.confirmVerify.body', { in: this._digits.transform(d.units_in), out: this._digits.transform(d.units_out) })} ${value}`.trim(),
            ok: this._translate.instant('inventory.stockAdjustment.verify'),
            cancel: this._translate.instant('form.confirm.cancel'),
        }).subscribe((confirmed) => {
            if (!confirmed) return;
            this._adjustments.verify(this.oid).subscribe({
                next: () => {
                    this._message.success(this._translate.instant('inventory.stockAdjustment.verifiedMessage', { number: d.adjustment_number }));
                    this.load();
                },
                error: (error: unknown) => {
                    this.fail(error);
                    this.load();
                },
            });
        });
    }

    openClosing(kind: Closing): void {
        if (this.saving()) return;
        this.closeForm.reset({ reason: '' });
        this.closing.set(kind);
    }

    confirmClosing(): void {
        const kind = this.closing();
        if (!kind || this.saving()) return;
        if (this.closeForm.invalid) {
            revealErrors(this.closeForm);
            return;
        }
        const reason = this.closeForm.getRawValue().reason.trim();
        (kind === 'reject' ? this._adjustments.reject(this.oid, reason) : this._adjustments.cancel(this.oid, reason)).subscribe({
            next: () => {
                this.closing.set(null);
                this._message.success(this._translate.instant(kind === 'reject' ? 'inventory.stockAdjustment.rejectedMessage' : 'inventory.stockAdjustment.cancelledMessage'));
                this.load();
            },
            error: (error: unknown) => this.fail(error),
        });
    }

    edit(): void {
        if (this.saving()) return;
        void this._router.navigateByUrl(STOCK_ADJUSTMENT_ROUTES.edit(this.oid));
    }

    download(): void {
        if (this.downloading()) return;
        this.downloading.set(true);
        this._adjustments.report(this.oid).subscribe({
            next: (response) => {
                this.downloading.set(false);
                saveDownload(response, `${this.adjustment()?.adjustment_number ?? 'adjustment'}.xlsx`);
            },
            error: (error: unknown) => {
                this.downloading.set(false);
                this._message.error(this._translate.instant(failureKey(error, 'inventory.stockAdjustment.reportFailed')));
            },
        });
    }

    backToList(): void {
        void this._router.navigateByUrl(STOCK_ADJUSTMENT_ROUTES.list);
    }

    private fail(error: unknown): void {
        const { key, params } = adjustmentFailure(error, 'form.saveFailed');
        this._message.error(this._translate.instant(key, Object.fromEntries(Object.entries(params).map(([name, value]) => [name, typeof value === 'number' ? this._digits.transform(value) : value]))));
    }

    private seedFromList(): Partial<StockAdjustmentRow> | null {
        const row = this._router.currentNavigation()?.extras.state?.['row'] as Partial<StockAdjustmentRow> | undefined;
        return row?.oid === this.oid ? row : null;
    }
}
