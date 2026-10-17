import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCalendarClock, lucideRotateCw, lucideTicketPercent, lucideUsers } from '@ng-icons/lucide';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzSegmentedModule } from 'ng-zorro-antd/segmented';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzTableModule } from 'ng-zorro-antd/table';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { RequestFailure } from '@app/core/models/api.model';
import { Insight, SalesAnalyticsQuery, SalesChannel, TeamFigures } from '@app/core/models/sales-analytics.model';
import { LanguageService } from '@app/core/services/language/language.service';
import { insightParams, rateOf } from '@app/modules/sales/analytics/utils/sales-analytics/sales-analytics';
import { SalesAnalyticsService } from '@app/modules/sales/analytics/services/sales-analytics.service';
import { WeekCell, WeekHeatmapComponent } from '@app/shared/components/charts/week-heatmap/week-heatmap.component';
import { DigitsPipe } from '@app/shared/pipes/digits/digits.pipe';
import { MoneyPipe } from '@app/shared/pipes/money/money.pipe';
import { hourLabel } from '@app/shared/utils/hour-label/hour-label';
import { failureOf } from '@app/shared/utils/request-failure/request-failure';

type ArrivalChannel = 'ALL' | SalesChannel;

/**
 * When orders come in, what was given away in discounts, and each person's figures (sales analytics
 * REQ-105, REQ-152, REQ-153). Whoever holds the page sees everyone: the owner decides who holds it.
 */
@Component({
    selector: 'team-section',
    imports: [FormsModule, NgIcon, NzButtonModule, NzCardModule, NzSegmentedModule, NzSkeletonModule, NzTableModule, TranslatePipe, DigitsPipe, MoneyPipe, WeekHeatmapComponent],
    providers: [provideIcons({ lucideCalendarClock, lucideRotateCw, lucideTicketPercent, lucideUsers })],
    templateUrl: './team-section.component.html',
    styleUrl: './team-section.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeamSectionComponent {
    private readonly _analytics = inject(SalesAnalyticsService);
    private readonly _translate = inject(TranslateService);
    private readonly _money = new MoneyPipe();
    readonly language = inject(LanguageService).current;

    readonly query = input.required<SalesAnalyticsQuery>();

    readonly team = signal<TeamFigures | null>(null);
    readonly failed = signal<RequestFailure | null>(null);
    readonly arrivalChannel = signal<ArrivalChannel>('ALL');
    private _load?: Subscription;

    /** The channel switch only when both channels are in the figures. */
    readonly arrivalChoices = computed<ArrivalChannel[]>(() => ((this.team()?.channels.length ?? 0) > 1 ? ['ALL', 'POS', 'ONLINE'] : []));

    readonly cells = computed<WeekCell[]>(() => {
        const channel = this.arrivalChannel();
        const sums = new Map<string, WeekCell>();
        for (const a of this.team()?.arrivals ?? []) {
            if (channel !== 'ALL' && a.channel !== channel) continue;
            // The server counts Sunday as 0; the heatmap takes ISO weekdays, Sunday 7.
            const day = a.weekday === 0 ? 7 : a.weekday;
            const cell = sums.get(`${day}-${a.hour}`) ?? { day, hour: a.hour, count: 0 };
            cell.count += a.orders;
            sums.set(`${day}-${a.hour}`, cell);
        }
        return [...sums.values()];
    });

    /** The busiest hour of the week, said in a sentence above the heatmap. */
    readonly busiest = computed(() => {
        const language = this.language();
        const top = this.cells().reduce<WeekCell | null>((best, cell) => (!best || cell.count > best.count ? cell : best), null);
        if (!top) return null;
        const locale = language === 'bn' ? 'bn-BD' : 'en-GB';
        const clock = (hour: number) => hourLabel(hour, language);
        const day = new Intl.DateTimeFormat(locale, { weekday: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(2026, 0, 4 + top.day)));
        return { key: 'sales.analytics.insight.team.busiest', params: { day, from: clock(top.hour), to: clock((top.hour + 1) % 24), count: this.number(top.count) } };
    });

    readonly discountShare = computed(() => {
        const d = this.team()?.discount;
        return d && d.list_price > 0 ? Math.round((d.discount / d.list_price) * 1000) / 10 : null;
    });

    readonly discountProducts = computed(() => {
        const rows = this.team()?.discount_by_product ?? [];
        const widest = Math.max(1, ...rows.map((r) => r.discount));
        return rows.map((r) => ({ ...r, width: (r.discount / widest) * 100, share: r.list_price > 0 ? Math.round((r.discount / r.list_price) * 100) : 0 }));
    });

    readonly people = computed(() =>
        (this.team()?.people ?? []).map((p) => ({
            ...p,
            label: p.name || p.email,
            discountShare: p.list_price > 0 ? rateOf(p.discount, p.list_price, (n) => this.number(n)).text : '-',
            cancel: rateOf(p.cancelled, p.taken - p.business_cancelled, (n) => this.number(n)),
            refusal: rateOf(p.failed, p.dispatched, (n) => this.number(n)),
        }))
    );

    /** Online columns only when someone online is in the figures. */
    readonly showsOnline = computed(() => this.team()?.channels.includes('ONLINE') ?? false);

    readonly insights = computed(() => {
        const team = this.team();
        const language = this.language();
        const said = (insight: Insight | null) => (insight ? { key: `sales.analytics.insight.team.${insight.key}`, params: insightParams(insight, language, this._translate, (n) => this.number(n)) } : null);
        return { discount: said(team?.insights.discount ?? null), people: said(team?.insights.people ?? null) };
    });

    constructor() {
        inject(DestroyRef).onDestroy(() => this._load?.unsubscribe());
        effect(() => {
            const query = this.query();
            untracked(() => this.load(query));
        });
    }

    reload(): void {
        this.load(this.query());
    }

    pickChannel(channel: ArrivalChannel): void {
        this.arrivalChannel.set(channel);
    }

    private load(query: SalesAnalyticsQuery): void {
        this._load?.unsubscribe();
        this.failed.set(null);
        this.team.set(null);
        this._load = this._analytics.team(query).subscribe({
            next: (team) => this.team.set(team),
            error: (error: unknown) => this.failed.set(failureOf(error)),
        });
    }

    private number(n: number): string {
        return this._money.transform(n, 'number');
    }
}
