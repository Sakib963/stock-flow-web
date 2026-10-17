import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, signal, untracked } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideChartLine, lucideChartPie, lucideGift, lucideHandshake, lucideLightbulb, lucideMegaphone, lucideRocket, lucideRotateCw } from '@ng-icons/lucide';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Subscription, forkJoin } from 'rxjs';
import { RequestFailure } from '@app/core/models/api.model';
import { FilterConfig, FilterValues } from '@app/core/models/filter.model';
import { CampaignResult, MarketingOverview } from '@app/core/models/marketing-analytics.model';
import { SalesAnalyticsQuery, SalesChannel } from '@app/core/models/sales-analytics.model';
import { LanguageService } from '@app/core/services/language/language.service';
import { SessionService } from '@app/core/services/session/session.service';
import { CampaignResultCardComponent } from '@app/modules/marketing/analytics/components/campaign-result-card/campaign-result-card.component';
import { ComparisonsSectionComponent } from '@app/modules/marketing/analytics/components/comparisons-section/comparisons-section.component';
import { SourcesSectionComponent } from '@app/modules/marketing/analytics/components/sources-section/sources-section.component';
import { NextSectionComponent } from '@app/modules/marketing/analytics/components/next-section/next-section.component';
import { MarketingAnalyticsService } from '@app/modules/marketing/analytics/services/marketing-analytics.service';
import { CampaignTimelineComponent, TimelineBand, TimelinePin } from '@app/shared/components/charts/campaign-timeline/campaign-timeline.component';
import { FilterComponent } from '@app/shared/components/filter/filter.component';
import { PageHeaderComponent } from '@app/shared/components/page-header/page-header.component';
import { DigitsPipe } from '@app/shared/pipes/digits/digits.pipe';
import { MoneyPipe } from '@app/shared/pipes/money/money.pipe';
import { RecordDatePipe } from '@app/shared/pipes/record-date/record-date.pipe';
import { addDays, businessToday } from '@app/shared/utils/business-time/business-time';
import { failureOf } from '@app/shared/utils/request-failure/request-failure';
import { isPhoneWidth, viewportWidth } from '@app/shared/utils/viewport/viewport';

/**
 * Whether each promotion paid for itself: the sales line with every campaign's window on it, then
 * each campaign judged against the rest of the business, with its working shown.
 */
@Component({
    selector: 'marketing-analytics',
    imports: [NgIcon, NzButtonModule, NzCardModule, NzSkeletonModule, NzTabsModule, TranslatePipe, DigitsPipe, MoneyPipe, FilterComponent, PageHeaderComponent, CampaignTimelineComponent, CampaignResultCardComponent, SourcesSectionComponent, ComparisonsSectionComponent, NextSectionComponent],
    providers: [provideIcons({ lucideChartLine, lucideChartPie, lucideGift, lucideHandshake, lucideLightbulb, lucideMegaphone, lucideRocket, lucideRotateCw })],
    templateUrl: './marketing-analytics.component.html',
    styleUrl: './marketing-analytics.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarketingAnalyticsComponent {
    private readonly _analytics = inject(MarketingAnalyticsService);
    private readonly _translate = inject(TranslateService);
    private readonly _date = new RecordDatePipe();
    readonly language = inject(LanguageService).current;
    readonly isPhone = isPhoneWidth(viewportWidth());
    private readonly _session = inject(SessionService);
    readonly canOpenCampaign = this._session.can('marketing.campaign.view');

    /** The last 30 days, long enough to hold a campaign and the days before it. */
    readonly filters = signal<FilterValues>({ date_from: addDays(businessToday(), -29), date_to: businessToday() });
    private readonly _channels = signal<SalesChannel[]>([]);
    readonly query = computed(() => this.filters() as SalesAnalyticsQuery);

    /** Sources are where online orders come in: the tab only for someone who sells online and has not narrowed the page to the counter. */
    readonly showsSources = computed(() => this._session.can('sales.online.view') && this.filters()['channel'] !== 'POS');
    readonly tabIcons = { overview: 'lucideChartPie', sources: 'lucideMegaphone', compare: 'lucideHandshake', next: 'lucideLightbulb' } as const;
    readonly tabs = computed(() => (this.showsSources() ? (['overview', 'sources', 'compare', 'next'] as const) : (['overview', 'compare', 'next'] as const)));
    readonly tab = signal<'overview' | 'sources' | 'compare' | 'next'>('overview');
    readonly tabIndex = computed(() => Math.max(0, (this.tabs() as readonly string[]).indexOf(this.tab())));

    readonly overview = signal<MarketingOverview | null>(null);
    readonly results = signal<CampaignResult[] | null>(null);
    readonly failed = signal<RequestFailure | null>(null);
    private _load?: Subscription;

    readonly filterConfig = computed<FilterConfig>(() => ({
        render: 'row',
        fields: [{ key: 'when', label: 'sales.analytics.filter.when', type: 'date-range', fromKey: 'date_from', toKey: 'date_to', presets: ['this-month', 'last-month', 'last-7-days', 'last-30-days'], max: 'today' }, ...(this._channels().length > 1 ? [{ key: 'channel', label: 'sales.analytics.filter.channel', type: 'select' as const, choices: this._channels().map((c) => ({ value: c, label: `sales.analytics.channel.${c}` })) }] : [])],
    }));

    readonly values = computed(() => (this.overview()?.daily ?? []).map((d) => ({ day: d.day, value: d.sales })));
    readonly bands = computed<TimelineBand[]>(() => (this.overview()?.campaigns ?? []).map((c) => ({ key: c.oid, from: c.posting_start, to: c.measure_end, label: c.name })));
    readonly pins = computed<TimelinePin[]>(() => (this.overview()?.campaigns ?? []).flatMap((c) => c.posted.map((p, i) => ({ key: `${c.oid}-${i}`, day: p.day, label: this._translate.instant('marketing.analytics.timeline.pin', { partner: p.partner, count: p.quantity, kind: this._translate.instant('marketing.campaign.deliverable.kind.' + p.kind) }) }))));
    readonly firstTime = computed(() => (this.overview()?.daily ?? []).reduce((sum, d) => sum + d.first_time, 0));
    readonly edges = computed(() => {
        const period = this.overview()?.period;
        return period ? { start: this._date.transform(period.date_from, this.language()), end: this._date.transform(period.date_to, this.language()) } : { start: '', end: '' };
    });
    readonly timelineLabel = computed(() =>
        this._translate.instant('marketing.analytics.timeline.label', {
            from: this.edges().start,
            to: this.edges().end,
            campaigns:
                this.bands()
                    .map((b) => b.label)
                    .join(', ') || '-',
            posts: this.pins().length,
        })
    );

    constructor() {
        inject(DestroyRef).onDestroy(() => this._load?.unsubscribe());
        effect(() => {
            const query = this.filters() as SalesAnalyticsQuery;
            untracked(() => this.load(query));
        });
    }

    pickTab(index: number): void {
        this.tab.set(this.tabs()[index] ?? 'overview');
    }

    reload(): void {
        this.load(this.filters() as SalesAnalyticsQuery);
    }

    private load(query: SalesAnalyticsQuery): void {
        this._load?.unsubscribe();
        this.failed.set(null);
        this.overview.set(null);
        this.results.set(null);
        this._load = forkJoin({ overview: this._analytics.overview(query), results: this._analytics.results(query) }).subscribe({
            next: ({ overview, results }) => {
                this._channels.set(overview.channels);
                this.overview.set(overview);
                this.results.set(results.results);
            },
            error: (error: unknown) => this.failed.set(failureOf(error)),
        });
    }
}
