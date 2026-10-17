import { Location } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft, lucideHistory, lucideInfo, lucidePencil, lucideRocket, lucideRotateCw } from '@ng-icons/lucide';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { TranslatePipe } from '@ngx-translate/core';
import { RequestFailure } from '@app/core/models/api.model';
import { PageBack } from '@app/core/models/page-header.model';
import { Partner, PartnerDetails } from '@app/core/models/partner.model';
import { LanguageService } from '@app/core/services/language/language.service';
import { SessionService } from '@app/core/services/session/session.service';
import { CAMPAIGN_ROUTES } from '@app/modules/marketing/campaign/constants/campaign-routes';
import { PARTNER_PLATFORM_TAG, PARTNER_STATUS, PARTNER_TYPE_TAG } from '@app/modules/marketing/partner/config/partner-list.config';
import { PARTNER_ROUTES } from '@app/modules/marketing/partner/constants/partner-routes';
import { PartnerService } from '@app/modules/marketing/partner/services/partner.service';
import { ActionFooterComponent } from '@app/shared/components/action-footer/action-footer.component';
import { PageHeaderComponent } from '@app/shared/components/page-header/page-header.component';
import { RecordTimelineComponent } from '@app/shared/components/record-timeline/record-timeline.component';
import { StatusTagComponent } from '@app/shared/components/status-tag/status-tag.component';
import { DigitsPipe } from '@app/shared/pipes/digits/digits.pipe';
import { MoneyPipe } from '@app/shared/pipes/money/money.pipe';
import { RecordDatePipe } from '@app/shared/pipes/record-date/record-date.pipe';
import { failureOf } from '@app/shared/utils/request-failure/request-failure';

/** One partner, read only, drawn at once from the list's row when opened from the list. */
@Component({
    selector: 'partner-detail',
    imports: [RecordTimelineComponent, RouterLink, DigitsPipe, MoneyPipe, NgIcon, NzButtonModule, NzCardModule, NzSkeletonModule, TranslatePipe, PageHeaderComponent, StatusTagComponent, ActionFooterComponent, RecordDatePipe],
    providers: [provideIcons({ lucideArrowLeft, lucideHistory, lucideInfo, lucidePencil, lucideRocket, lucideRotateCw })],
    templateUrl: './partner-detail.component.html',
    styleUrl: './partner-detail.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PartnerDetailComponent {
    private readonly _route = inject(ActivatedRoute);
    private readonly _router = inject(Router);
    private readonly _location = inject(Location);
    private readonly _partners = inject(PartnerService);
    private readonly _session = inject(SessionService);

    readonly language = inject(LanguageService).current;
    readonly oid = this._route.snapshot.paramMap.get('oid') ?? '';
    private readonly _seed = this.seedFromList();

    readonly back: PageBack = { route: PARTNER_ROUTES.list };
    readonly record = signal<PartnerDetails | null>(null);
    readonly loading = signal(true);
    readonly failed = signal<RequestFailure | null>(null);

    readonly partner = computed<Partial<Partner> | null>(() => this.record()?.details ?? this._seed);
    readonly canEdit = computed(() => this._session.can('marketing.partner.edit'));

    readonly statusTone = computed(() => (this.partner()?.status ? PARTNER_STATUS[this.partner()!.status!] : null));
    readonly typeTone = computed(() => (this.partner()?.partner_type ? PARTNER_TYPE_TAG[this.partner()!.partner_type!] : null));
    readonly campaignRoute = CAMPAIGN_ROUTES.detail;
    /** Owed across the partner's campaigns, for someone who may see payments. */
    readonly owedTotal = computed(() => {
        const campaigns = this.record()?.campaigns ?? [];
        return campaigns.some((c) => c.owed !== undefined) ? campaigns.reduce((sum, c) => sum + (c.owed ?? 0), 0) : null;
    });
    readonly platforms = computed(() => (this.partner()?.platforms ?? []).map((platform) => ({ platform, style: PARTNER_PLATFORM_TAG[platform] })));

    constructor() {
        this.load();
    }

    load(): void {
        this.loading.set(true);
        this.failed.set(null);
        this._partners.details(this.oid).subscribe({
            next: (details) => {
                this.record.set(details);
                this.loading.set(false);
            },
            error: (error: unknown) => {
                this.loading.set(false);
                this.failed.set(failureOf(error));
            },
        });
    }

    edit(): void {
        void this._router.navigateByUrl(PARTNER_ROUTES.edit(this.oid));
    }

    goBack(): void {
        this._location.back();
    }

    backToList(): void {
        void this._router.navigateByUrl(PARTNER_ROUTES.list);
    }

    /** Only a row for this very partner counts: navigation state survives a reload and a Back. */
    private seedFromList(): Partial<Partner> | null {
        const row = this._router.currentNavigation()?.extras.state?.['row'] as Partial<Partner> | undefined;
        return row?.oid === this.oid ? row : null;
    }
}
