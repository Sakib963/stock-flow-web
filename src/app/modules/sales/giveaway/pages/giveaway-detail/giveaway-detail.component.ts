import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft, lucideBan, lucideCheck, lucideGift, lucideHistory, lucideInfo, lucidePackage, lucideRotateCw, lucideX, lucideZap } from '@ng-icons/lucide';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTimelineModule } from 'ng-zorro-antd/timeline';
import { NzTypographyModule } from 'ng-zorro-antd/typography';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { RequestFailure } from '@app/core/models/api.model';
import { GiveawayDetails } from '@app/core/models/giveaway.model';
import { PageBack } from '@app/core/models/page-header.model';
import { LanguageService } from '@app/core/services/language/language.service';
import { SessionService } from '@app/core/services/session/session.service';
import { GIVEAWAY_STATUS } from '@app/modules/sales/giveaway/config/giveaway-list.config';
import { GIVEAWAY_ROUTES } from '@app/modules/sales/giveaway/constants/giveaway-routes';
import { GiveawayService } from '@app/modules/sales/giveaway/services/giveaway.service';
import { ActionFooterComponent } from '@app/shared/components/action-footer/action-footer.component';
import { PageHeaderComponent } from '@app/shared/components/page-header/page-header.component';
import { StatusTagComponent } from '@app/shared/components/status-tag/status-tag.component';
import { DigitsPipe } from '@app/shared/pipes/digits/digits.pipe';
import { MoneyPipe } from '@app/shared/pipes/money/money.pipe';
import { RecordDatePipe } from '@app/shared/pipes/record-date/record-date.pipe';
import { confirmAction } from '@app/shared/utils/confirm-action/confirm-action';
import { failureKey, failureOf } from '@app/shared/utils/request-failure/request-failure';
import { resolveTone } from '@app/shared/utils/tone-map/tone-map';

/** One giveaway. A Draft moves nothing; Give takes every line from free stock at once, and is never undone. */
@Component({
    selector: 'giveaway-detail',
    imports: [FormsModule, NgIcon, NzButtonModule, NzCardModule, NzFormModule, NzInputModule, NzModalModule, NzSkeletonModule, NzTableModule, NzTimelineModule, NzTypographyModule, TranslatePipe, PageHeaderComponent, ActionFooterComponent, StatusTagComponent, DigitsPipe, MoneyPipe, RecordDatePipe],
    providers: [provideIcons({ lucideArrowLeft, lucideBan, lucideCheck, lucideGift, lucideHistory, lucideInfo, lucidePackage, lucideRotateCw, lucideX, lucideZap })],
    templateUrl: './giveaway-detail.component.html',
    styleUrl: './giveaway-detail.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GiveawayDetailComponent {
    private readonly _route = inject(ActivatedRoute);
    private readonly _router = inject(Router);
    private readonly _giveaways = inject(GiveawayService);
    private readonly _session = inject(SessionService);
    private readonly _translate = inject(TranslateService);
    private readonly _message = inject(NzMessageService);
    private readonly _modal = inject(NzModalService);

    readonly language = inject(LanguageService).current;
    readonly oid = this._route.snapshot.paramMap.get('oid') ?? '';
    readonly back: PageBack = { route: GIVEAWAY_ROUTES.list };
    readonly seesMoney = this._session.can('inventory.stock-value.view');

    private readonly _seed = this.seedFromList();
    readonly record = signal<GiveawayDetails | null>(null);
    readonly failed = signal<RequestFailure | null>(null);
    readonly saving = this._giveaways.saving;
    readonly gift = computed<Partial<GiveawayDetails> | null>(() => this.record() ?? this._seed);
    readonly statusTone = computed(() => {
        const status = this.gift()?.status;
        return status ? (resolveTone(GIVEAWAY_STATUS, status, undefined, 'the giveaway record')?.style ?? null) : null;
    });
    readonly units = computed(() => (this.record()?.lines ?? []).reduce((sum, line) => sum + line.quantity, 0));
    readonly cost = computed(() => (this.record()?.lines ?? []).reduce((sum, line) => sum + line.quantity * (line.cost_price ?? 0), 0));

    readonly actions = computed(() => {
        const draft = this.record()?.status === 'Draft';
        return { give: draft && this._session.can('sales.giveaway.confirm'), cancel: draft && this._session.can('sales.giveaway.cancel') };
    });

    readonly cancelling = signal(false);
    readonly cancelReason = signal('');

    constructor() {
        this.load();
    }

    load(): void {
        this.failed.set(null);
        this._giveaways.details(this.oid).subscribe({
            next: (details) => this.record.set(details),
            error: (error: unknown) => this.failed.set(failureOf(error)),
        });
    }

    backToList(): void {
        void this._router.navigateByUrl(GIVEAWAY_ROUTES.list);
    }

    give(): void {
        const number = this.record()?.giveaway_no ?? '';
        confirmAction(this._modal, {
            title: this._translate.instant('sales.giveaway.action.give.confirmTitle', { number }),
            body: this._translate.instant('sales.giveaway.action.give.confirmBody'),
            ok: this._translate.instant('sales.giveaway.action.give.button'),
            cancel: this._translate.instant('form.confirm.cancel'),
        }).subscribe((confirmed) => {
            if (confirmed) this.send(this._giveaways.give(this.oid), 'give');
        });
    }

    openCancel(): void {
        this.cancelReason.set('');
        this.cancelling.set(true);
    }

    submitCancel(): void {
        if (!this.cancelReason().trim() || this.saving()) return;
        this.send(this._giveaways.cancel(this.oid, this.cancelReason().trim()), 'cancel');
    }

    private send(request: ReturnType<GiveawayService['give']>, action: 'give' | 'cancel'): void {
        request.subscribe({
            next: () => {
                this.cancelling.set(false);
                this._message.success(this._translate.instant('sales.giveaway.action.' + action + '.done'));
                this.load();
            },
            error: (error: unknown) => {
                if (error instanceof HttpErrorResponse && error.status === 409) {
                    this._message.error(error.error?.message ?? this._translate.instant('sales.order.movedOn'));
                    this.cancelling.set(false);
                    this.load();
                    return;
                }
                this._message.error(this._translate.instant(failureKey(error, 'form.saveFailed')));
            },
        });
    }

    private seedFromList(): Partial<GiveawayDetails> | null {
        const row = this._router.currentNavigation()?.extras.state?.['row'] as Partial<GiveawayDetails> | undefined;
        return row?.oid === this.oid ? row : null;
    }
}
