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
import { DisposalRecord, DisposalRow } from '@app/core/models/disposal.model';
import { LanguageService } from '@app/core/services/language/language.service';
import { SessionService } from '@app/core/services/session/session.service';
import { DISPOSAL_STATUS } from '@app/modules/inventory/disposal/config/disposal-list.config';
import { DISPOSAL_ROUTES } from '@app/modules/inventory/disposal/constants/disposal-routes';
import { DisposalService } from '@app/modules/inventory/disposal/services/disposal.service';
import { disposalFailure } from '@app/modules/inventory/disposal/utils/disposal-failure/disposal-failure';
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
 * One disposal. A Submitted one can be approved, which is the only step that moves stock, or
 * rejected; a Draft or Submitted one can be edited or cancelled; the rest are final.
 */
@Component({
    selector: 'disposal-detail',
    imports: [NgIcon, ReactiveFormsModule, RouterLink, NzButtonModule, NzCardModule, NzFormModule, NzInputModule, NzModalModule, NzSkeletonModule, NzTableModule, NzTimelineModule, TranslatePipe, PageHeaderComponent, StatusTagComponent, ActionFooterComponent, NzTypographyModule, DigitsPipe, MoneyPipe, RecordDatePipe],
    providers: [MoneyPipe, DigitsPipe, provideIcons({ lucideArrowLeft, lucideBadgeCheck, lucideBan, lucideCircleX, lucideFilePen, lucideFileSpreadsheet, lucideHistory, lucideInfo, lucideListOrdered, lucidePackageMinus, lucidePackagePlus, lucidePencil, lucideRotateCw, lucideWallet, lucideZap })],
    templateUrl: './disposal-detail.component.html',
    styleUrl: './disposal-detail.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DisposalDetailComponent {
    private readonly _route = inject(ActivatedRoute);
    private readonly _router = inject(Router);
    private readonly _disposals = inject(DisposalService);
    private readonly _session = inject(SessionService);
    private readonly _translate = inject(TranslateService);
    private readonly _message = inject(NzMessageService);
    private readonly _modal = inject(NzModalService);
    private readonly _money = inject(MoneyPipe);
    private readonly _digits = inject(DigitsPipe);

    readonly language = inject(LanguageService).current;
    readonly oid = this._route.snapshot.paramMap.get('oid') ?? '';
    readonly back: PageBack = { route: DISPOSAL_ROUTES.list };
    readonly productStockRoute = STOCK_OVERVIEW_ROUTES.product;
    private readonly _seed = this.seedFromList();

    readonly record = signal<DisposalRecord | null>(null);
    readonly loading = signal(true);
    readonly failed = signal<RequestFailure | null>(null);

    readonly disposal = computed<Partial<DisposalRow> | null>(() => this.record()?.details ?? this._seed);
    readonly status = computed(() => this.disposal()?.status ?? null);
    readonly statusTone = computed(() => (this.status() ? resolveTone(DISPOSAL_STATUS, this.status()!, undefined, 'the disposal status')?.style : null));
    readonly seesMoney = computed(() => this.record()?.sees_money ?? false);

    readonly draft = computed(() => this.status() === 'Draft');
    readonly submitted = computed(() => this.status() === 'Submitted');
    readonly open = computed(() => this.draft() || this.submitted());

    readonly canApprove = computed(() => this.submitted() && this._session.can('inventory.product-dispose.approve'));
    readonly canReject = computed(() => this.submitted() && this._session.can('inventory.product-dispose.reject'));
    readonly canEdit = computed(() => this.open() && this._session.can('inventory.product-dispose.edit'));
    readonly canCancel = computed(() => this.open() && this._session.can('inventory.product-dispose.cancel'));
    readonly canExport = computed(() => this._session.can('inventory.product-dispose.export'));
    readonly canOpenStock = computed(() => this._session.can('inventory.overview.view'));

    readonly saving = this._disposals.saving;
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
        this._disposals.details(this.oid).subscribe({
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

    /** Asks first with what will move, since approving is the one step that changes stock. */
    approve(): void {
        const d = this.record()?.details;
        if (!d || this.saving()) return;
        const value = this.seesMoney() ? this._translate.instant('inventory.disposal.confirmApprove.value', { value: this._money.transform(Number(d.value ?? 0)) }) : '';
        confirmAction(this._modal, {
            title: this._translate.instant('inventory.disposal.confirmApprove.title', { number: d.dispose_no }),
            body: `${this._translate.instant('inventory.disposal.confirmApprove.body', { units: this._digits.transform(d.units) })} ${value}`.trim(),
            ok: this._translate.instant('inventory.disposal.approve'),
            cancel: this._translate.instant('form.confirm.cancel'),
        }).subscribe((confirmed) => {
            if (!confirmed) return;
            this._disposals.approve(this.oid).subscribe({
                next: () => {
                    this._message.success(this._translate.instant('inventory.disposal.approvedMessage', { number: d.dispose_no }));
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
        (kind === 'reject' ? this._disposals.reject(this.oid, reason) : this._disposals.cancel(this.oid, reason)).subscribe({
            next: () => {
                this.closing.set(null);
                this._message.success(this._translate.instant(kind === 'reject' ? 'inventory.disposal.rejectedMessage' : 'inventory.disposal.cancelledMessage'));
                this.load();
            },
            error: (error: unknown) => this.fail(error),
        });
    }

    edit(): void {
        if (this.saving()) return;
        void this._router.navigateByUrl(DISPOSAL_ROUTES.edit(this.oid));
    }

    download(): void {
        if (this.downloading()) return;
        this.downloading.set(true);
        this._disposals.report(this.oid).subscribe({
            next: (response) => {
                this.downloading.set(false);
                saveDownload(response, `${this.disposal()?.dispose_no ?? 'disposal'}.xlsx`);
            },
            error: (error: unknown) => {
                this.downloading.set(false);
                this._message.error(this._translate.instant(failureKey(error, 'inventory.disposal.reportFailed')));
            },
        });
    }

    backToList(): void {
        void this._router.navigateByUrl(DISPOSAL_ROUTES.list);
    }

    private fail(error: unknown): void {
        const { key, params } = disposalFailure(error, 'form.saveFailed');
        this._message.error(this._translate.instant(key, Object.fromEntries(Object.entries(params).map(([name, value]) => [name, typeof value === 'number' ? this._digits.transform(value) : value]))));
    }

    private seedFromList(): Partial<DisposalRow> | null {
        const row = this._router.currentNavigation()?.extras.state?.['row'] as Partial<DisposalRow> | undefined;
        return row?.oid === this.oid ? row : null;
    }
}
