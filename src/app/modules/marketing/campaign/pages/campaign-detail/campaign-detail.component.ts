import { Location } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft, lucideBan, lucideBanknote, lucideCheck, lucideClock, lucideExternalLink, lucideGift, lucideMegaphone, lucideTrash2, lucideTriangleAlert, lucideCircleCheck, lucideHandshake, lucideHistory, lucideInfo, lucidePackage, lucidePencil, lucidePlay, lucideRotateCw, lucideWallet, lucideX, lucideZap } from '@ng-icons/lucide';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzTableModule } from 'ng-zorro-antd/table';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { finalize } from 'rxjs';
import { RequestFailure } from '@app/core/models/api.model';
import { BUDGET_KINDS, Campaign, CampaignDetails, CampaignMove, CampaignPartner, DELIVERABLE_KINDS, DELIVERABLE_STATUSES, Deliverable, DeliverableKind, DeliverableStatus, budgetPerUnit } from '@app/core/models/campaign.model';
import { PARTNER_PAYMENT_METHODS, PartnerPaymentMethod } from '@app/core/models/partner.model';
import { PageBack } from '@app/core/models/page-header.model';
import { LanguageService } from '@app/core/services/language/language.service';
import { SessionService } from '@app/core/services/session/session.service';
import { CAMPAIGN_STATUS, DELIVERABLE_STATUS, PROMOTION_TYPE_TAG } from '@app/modules/marketing/campaign/config/campaign-list.config';
import { CAMPAIGN_ROUTES } from '@app/modules/marketing/campaign/constants/campaign-routes';
import { CampaignService } from '@app/modules/marketing/campaign/services/campaign.service';
import { STOCK_OVERVIEW_ROUTES } from '@app/modules/inventory/stock-overview/constants/stock-overview-routes';
import { GIVEAWAY_ROUTES } from '@app/modules/sales/giveaway/constants/giveaway-routes';
import { ActionFooterComponent } from '@app/shared/components/action-footer/action-footer.component';
import { PageHeaderComponent } from '@app/shared/components/page-header/page-header.component';
import { RecordTimelineComponent } from '@app/shared/components/record-timeline/record-timeline.component';
import { StatusTagComponent } from '@app/shared/components/status-tag/status-tag.component';
import { DigitsPipe } from '@app/shared/pipes/digits/digits.pipe';
import { MoneyPipe } from '@app/shared/pipes/money/money.pipe';
import { RecordDatePipe } from '@app/shared/pipes/record-date/record-date.pipe';
import { fromDay, toDay } from '@app/shared/utils/calendar-day/calendar-day';
import { confirmAction } from '@app/shared/utils/confirm-action/confirm-action';
import { failureKey, failureOf } from '@app/shared/utils/request-failure/request-failure';

/** One campaign: what it promotes, with whom, planned against agreed, and Start, Complete or Cancel. */
@Component({
    selector: 'campaign-detail',
    imports: [RecordTimelineComponent, RouterLink, FormsModule, NgIcon, NzButtonModule, NzCardModule, NzDatePickerModule, NzFormModule, NzInputModule, NzInputNumberModule, NzModalModule, NzSelectModule, NzSkeletonModule, NzTableModule, TranslatePipe, PageHeaderComponent, StatusTagComponent, ActionFooterComponent, DigitsPipe, MoneyPipe, RecordDatePipe],
    providers: [provideIcons({ lucideArrowLeft, lucideBan, lucideBanknote, lucideCheck, lucideClock, lucideExternalLink, lucideGift, lucideMegaphone, lucideTrash2, lucideTriangleAlert, lucideCircleCheck, lucideHandshake, lucideHistory, lucideInfo, lucidePackage, lucidePencil, lucidePlay, lucideRotateCw, lucideWallet, lucideX, lucideZap })],
    templateUrl: './campaign-detail.component.html',
    styleUrl: './campaign-detail.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CampaignDetailComponent {
    private readonly _route = inject(ActivatedRoute);
    private readonly _router = inject(Router);
    private readonly _location = inject(Location);
    private readonly _campaigns = inject(CampaignService);
    private readonly _session = inject(SessionService);
    private readonly _message = inject(NzMessageService);
    private readonly _modal = inject(NzModalService);
    private readonly _translate = inject(TranslateService);
    private readonly _money = new MoneyPipe();

    readonly language = inject(LanguageService).current;
    readonly oid = this._route.snapshot.paramMap.get('oid') ?? '';
    private readonly _seed = this.seedFromList();
    readonly budgetKinds = BUDGET_KINDS;

    readonly back: PageBack = { route: CAMPAIGN_ROUTES.list };
    readonly record = signal<CampaignDetails | null>(null);
    readonly loading = signal(true);
    readonly failed = signal<RequestFailure | null>(null);
    readonly acting = signal<CampaignMove | null>(null);
    readonly cancelling = signal(false);
    readonly cancelNote = signal('');

    readonly productStock = STOCK_OVERVIEW_ROUTES.product;
    readonly giveawayRoute = GIVEAWAY_ROUTES.detail;
    readonly canGive = this._session.can('sales.giveaway.create');
    readonly canOpenGift = this._session.can('sales.giveaway.view');
    readonly canOpenStock = this._session.can('inventory.overview.view');
    readonly paymentMethods = PARTNER_PAYMENT_METHODS;

    readonly deliverableKinds = DELIVERABLE_KINDS;
    readonly deliverableStatuses = DELIVERABLE_STATUSES;
    readonly deliverableTone = DELIVERABLE_STATUS;
    /** The promise being added (no deliverable) or changed, with the partner line it is for. */
    readonly promising = signal<{ line: CampaignPartner; deliverable: Deliverable | null } | null>(null);
    private _deliverableOid = '';
    readonly dKind = signal<DeliverableKind | null>(null);
    readonly dQuantity = signal<number | null>(1);
    readonly dDue = signal<Date | null>(null);
    readonly dStatus = signal<DeliverableStatus>('Pending');
    readonly dLink = signal('');
    readonly dPosted = signal<Date | null>(null);
    readonly dNote = signal('');
    readonly savingDeliverable = signal(false);
    readonly dPostedShown = computed(() => this.dStatus() === 'Posted' || this.dStatus() === 'Late');
    readonly dReady = computed(() => !!this.dKind() && !!this.dQuantity() && this.dQuantity()! >= 1 && !!this.dDue());
    readonly canPay = this._session.can('marketing.partner-payment.create');
    /** The partner the payment dialog is for; its oid is made when it opens, so a repeated save records once. */
    readonly paying = signal<CampaignPartner | null>(null);
    private _paymentOid = '';
    readonly payAmount = signal<number | null>(null);
    readonly payDate = signal<Date | null>(new Date());
    readonly payMethod = signal<PartnerPaymentMethod | null>(null);
    readonly payReference = signal('');
    readonly payNote = signal('');
    readonly recording = signal(false);
    readonly payReady = computed(() => !!this.payAmount() && this.payAmount()! > 0 && !!this.payDate() && !!this.payMethod());

    readonly campaign = computed<Partial<Campaign> | null>(() => this.record()?.details ?? this._seed);
    readonly statusTone = computed(() => (this.campaign()?.status ? CAMPAIGN_STATUS[this.campaign()!.status!] : null));
    readonly typeTone = computed(() => (this.campaign()?.promotion_type ? PROMOTION_TYPE_TAG[this.campaign()!.promotion_type!] : null));
    readonly batchRows = computed(() => (this.record()?.batches ?? []).map((b) => ({ ...b, perUnit: budgetPerUnit(b), total: budgetPerUnit(b) * b.units })));

    /** Absent without the permission, and only in the status each button starts from. */
    readonly actions = computed(() => {
        const status = this.record()?.details.status;
        const can = (action: string) => this._session.can('marketing.campaign.' + action);
        return {
            edit: (status === 'Planned' || status === 'Live') && can('edit'),
            start: status === 'Planned' && can('edit'),
            complete: status === 'Live' && can('edit'),
            cancel: (status === 'Planned' || status === 'Live') && can('cancel'),
        };
    });
    /** Promised posts change while the campaign is open or just done; a cancelled one is a record. */
    readonly canPromise = computed(() => this._session.can('marketing.campaign.edit') && !!this.record() && this.record()!.details.status !== 'Cancelled');

    readonly anyAction = computed(() => {
        const { start, complete, cancel } = this.actions();
        return start || complete || cancel;
    });

    constructor() {
        this.load();
    }

    load(): void {
        this.loading.set(true);
        this.failed.set(null);
        this._campaigns.details(this.oid).subscribe({
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

    edit(): void {
        void this._router.navigateByUrl(CAMPAIGN_ROUTES.edit(this.oid));
    }

    /** Start and Complete ask first, naming what changes. */
    press(move: 'start' | 'complete'): void {
        const name = this.record()?.details.name ?? '';
        const t = (key: string, params?: object) => this._translate.instant(key, params);
        confirmAction(this._modal, { title: t(`marketing.campaign.action.${move}.title`, { name }), body: t(`marketing.campaign.action.${move}.body`), ok: t(`marketing.campaign.action.${move}.button`), cancel: t('form.confirm.cancel'), icon: move === 'start' ? 'lucidePlay' : 'lucideCircleCheck' }).subscribe((confirmed) => {
            if (confirmed) this.send(move);
        });
    }

    openCancel(): void {
        this.cancelNote.set('');
        this.cancelling.set(true);
    }

    submitCancel(): void {
        const note = this.cancelNote().trim();
        if (note.length < 3 || this.acting()) return;
        this.send('cancel', note);
    }

    /** Opens the giveaway form for this partner; the stock leaves when that giveaway is given. */
    giveProducts(partner: CampaignPartner): void {
        const campaign = this.record()?.details;
        if (!partner.oid || !campaign) return;
        void this._router.navigate([GIVEAWAY_ROUTES.create], { queryParams: { campaign_partner: partner.oid, campaign: campaign.campaign_no, partner: partner.name } });
    }

    openDeliverable(line: CampaignPartner, deliverable: Deliverable | null = null): void {
        this._deliverableOid = deliverable?.oid ?? crypto.randomUUID();
        this.promising.set({ line, deliverable });
        this.dKind.set(deliverable?.kind ?? null);
        this.dQuantity.set(deliverable?.quantity ?? 1);
        this.dDue.set(fromDay(deliverable?.due_on ?? this.record()?.details.posting_end ?? null));
        this.dStatus.set(deliverable?.status ?? 'Pending');
        this.dLink.set(deliverable?.link ?? '');
        this.dPosted.set(fromDay(deliverable?.posted_on ?? null));
        this.dNote.set(deliverable?.note ?? '');
    }

    submitDeliverable(): void {
        const promise = this.promising();
        if (!promise?.line.oid || !this.dReady() || this.savingDeliverable()) return;
        this.savingDeliverable.set(true);
        this._campaigns
            .saveDeliverable({
                oid: this._deliverableOid,
                ...(promise.deliverable ? {} : { campaign_partner_oid: promise.line.oid }),
                kind: this.dKind()!,
                quantity: this.dQuantity()!,
                due_on: toDay(this.dDue())!,
                status: this.dStatus(),
                link: this.dLink().trim() || null,
                posted_on: this.dPostedShown() ? toDay(this.dPosted()) : null,
                note: this.dNote().trim() || null,
            })
            .pipe(finalize(() => this.savingDeliverable.set(false)))
            .subscribe({
                next: () => {
                    this.promising.set(null);
                    this._message.success(this._translate.instant('marketing.campaign.deliverable.saved'));
                    this.load();
                },
                error: (error: unknown) => this.refused(error),
            });
    }

    removeDeliverable(deliverable: Deliverable): void {
        const t = (key: string, params?: object) => this._translate.instant(key, params);
        const what = t('marketing.campaign.deliverable.kind.' + deliverable.kind);
        confirmAction(this._modal, { title: t('marketing.campaign.deliverable.removeTitle', { what }), body: t('marketing.campaign.deliverable.removeBody'), ok: t('marketing.campaign.deliverable.remove'), cancel: t('form.confirm.cancel'), danger: true, icon: 'lucideTrash2' }).subscribe((confirmed) => {
            if (!confirmed) return;
            this._campaigns.removeDeliverable(deliverable.oid).subscribe({
                next: () => {
                    this._message.success(t('marketing.campaign.deliverable.removed'));
                    this.load();
                },
                error: (error: unknown) => this.refused(error),
            });
        });
    }

    /** A refusal the server explains (a cancelled campaign, a promise with an outcome) is shown in its words, then the page reloads. */
    private refused(error: unknown): void {
        if (error instanceof HttpErrorResponse && (error.status === 409 || error.status === 404 || error.status === 400)) {
            this._message.error(error.error?.message ?? this._translate.instant('form.saveFailed'));
            // Only a promise or partner that is gone closes the dialog; otherwise what was typed stays.
            if (error.status === 404) {
                this.promising.set(null);
                this.load();
            }
            return;
        }
        this._message.error(this._translate.instant(failureKey(error, 'form.saveFailed')));
    }

    openPayment(partner: CampaignPartner): void {
        this._paymentOid = crypto.randomUUID();
        this.paying.set(partner);
        this.payAmount.set(partner.owed || null);
        this.payDate.set(new Date());
        this.payMethod.set(partner.payment_method ?? null);
        this.payReference.set('');
        this.payNote.set('');
    }

    submitPayment(): void {
        const partner = this.paying();
        if (!partner?.oid || !this.payReady() || this.recording()) return;
        const t = (key: string, params?: object) => this._translate.instant(key, params);
        // A payment is never edited or deleted, so it is asked once more, naming what is recorded.
        confirmAction(this._modal, { title: t('marketing.campaign.payment.confirmTitle'), body: t('marketing.campaign.payment.confirmBody', { amount: this._money.transform(this.payAmount()!), name: partner.name }), ok: t('marketing.campaign.payment.save'), cancel: t('form.confirm.cancel') }).subscribe((confirmed) => {
            if (confirmed) this.sendPayment(partner.oid!);
        });
    }

    private sendPayment(campaign_partner_oid: string): void {
        this.recording.set(true);
        this._campaigns
            .recordPayment({ oid: this._paymentOid, campaign_partner_oid, amount: this.payAmount()!, paid_on: toDay(this.payDate())!, payment_method: this.payMethod()!, reference: this.payReference().trim() || null, note: this.payNote().trim() || null })
            .pipe(finalize(() => this.recording.set(false)))
            .subscribe({
                next: () => {
                    this.paying.set(null);
                    this._message.success(this._translate.instant('marketing.campaign.payment.done'));
                    this.load();
                },
                error: (error: unknown) => {
                    if (error instanceof HttpErrorResponse && error.status === 404) {
                        this._message.error(error.error?.message ?? this._translate.instant('form.saveFailed'));
                        this.paying.set(null);
                        this.load();
                        return;
                    }
                    this._message.error(this._translate.instant(failureKey(error, 'form.saveFailed')));
                },
            });
    }

    goBack(): void {
        this._location.back();
    }

    backToList(): void {
        void this._router.navigateByUrl(CAMPAIGN_ROUTES.list);
    }

    private send(move: CampaignMove, note?: string): void {
        this.acting.set(move);
        this._campaigns
            .move(move, this.oid, note)
            .pipe(finalize(() => this.acting.set(null)))
            .subscribe({
                next: () => {
                    this.cancelling.set(false);
                    this._message.success(this._translate.instant(`marketing.campaign.action.${move}.done`));
                    this.load();
                },
                error: (error: unknown) => {
                    if (error instanceof HttpErrorResponse && error.status === 409) {
                        this._message.error(error.error?.message ?? this._translate.instant('form.saveFailed'));
                        this.cancelling.set(false);
                        this.load();
                        return;
                    }
                    this._message.error(this._translate.instant(failureKey(error, 'form.saveFailed')));
                },
            });
    }

    /** Only a row for this very campaign counts: navigation state survives a reload and a Back. */
    private seedFromList(): Partial<Campaign> | null {
        const row = this._router.currentNavigation()?.extras.state?.['row'] as Partial<Campaign> | undefined;
        return row?.oid === this.oid ? row : null;
    }
}
