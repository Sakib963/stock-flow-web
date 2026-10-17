import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCircleHelp, lucideTriangleAlert, lucideUsers } from '@ng-icons/lucide';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzCollapseModule } from 'ng-zorro-antd/collapse';
import { TranslatePipe } from '@ngx-translate/core';
import { CUSTOMER_AGE_BANDS } from '@app/core/models/customer.model';
import { AudienceGroup, CampaignResult, CampaignVerdict } from '@app/core/models/marketing-analytics.model';
import { ToneStyle } from '@app/core/models/config.model';
import { LanguageService } from '@app/core/services/language/language.service';
import { CAMPAIGN_ROUTES } from '@app/modules/marketing/campaign/constants/campaign-routes';
import { PyramidChartComponent, PyramidRow } from '@app/shared/components/charts/pyramid-chart/pyramid-chart.component';
import { StatusTagComponent } from '@app/shared/components/status-tag/status-tag.component';
import { DigitsPipe } from '@app/shared/pipes/digits/digits.pipe';
import { MoneyPipe } from '@app/shared/pipes/money/money.pipe';
import { RecordDatePipe } from '@app/shared/pipes/record-date/record-date.pipe';

const VERDICT: Record<CampaignVerdict, ToneStyle> = {
    paid: { label: 'marketing.analytics.verdict.paid', tone: 'success', icon: 'lucideCheck' },
    rose_not_paid: { label: 'marketing.analytics.verdict.rose_not_paid', tone: 'warning', icon: 'lucideTrendingUp' },
    no_rise: { label: 'marketing.analytics.verdict.no_rise', tone: 'neutral', icon: 'lucideMinus' },
    too_little: { label: 'marketing.analytics.verdict.too_little', tone: 'neutral', icon: 'lucideCircleDashed' },
};

/**
 * One campaign's result: the verdict first, then the figures it rests on, and "How this is worked
 * out" in the campaign's own numbers (REQ-16), so the owner can check it and explain it to anyone.
 */
@Component({
    selector: 'campaign-result-card',
    imports: [RouterLink, NgIcon, NzCardModule, NzCollapseModule, TranslatePipe, PyramidChartComponent, StatusTagComponent, DigitsPipe, MoneyPipe, RecordDatePipe],
    providers: [provideIcons({ lucideCircleHelp, lucideTriangleAlert, lucideUsers })],
    templateUrl: './campaign-result-card.component.html',
    styleUrl: './campaign-result-card.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CampaignResultCardComponent {
    private readonly _money = new MoneyPipe();
    private readonly _date = new RecordDatePipe();
    readonly language = inject(LanguageService).current;

    readonly result = input.required<CampaignResult>();
    readonly canOpen = input(false);
    readonly campaignRoute = CAMPAIGN_ROUTES.detail;

    readonly verdict = computed(() => VERDICT[this.result().verdict]);

    /** Women left, men right, by age band, for the first-time customers with both recorded. */
    readonly brought = computed<PyramidRow[]>(() => {
        const rows = this.result().brought ?? [];
        const count = (gender: string, band: string) => rows.filter((r) => r.gender === gender && r.age_band === band).reduce((sum, r) => sum + r.customers, 0);
        return CUSTOMER_AGE_BANDS.map((band) => ({ key: band, label: `sales.customer.ageBand.${band}`, left: count('Female', band), right: count('Male', band) }));
    });
    readonly broughtKnown = computed(() => (this.result().brought ?? []).filter((r) => r.gender && r.age_band).reduce((sum, r) => sum + r.customers, 0));
    /** The largest group among the buyers before the campaign, to set the newcomers against. */
    readonly usualTop = computed(() => this.largest(this.result().usual ?? []));

    private largest(groups: AudienceGroup[]): { gender: string; age_band: string; share: number } | null {
        const known = groups.filter((g) => g.gender && g.age_band);
        const total = known.reduce((sum, g) => sum + g.customers, 0);
        const top = known.reduce<AudienceGroup | null>((best, g) => (!best || g.customers > best.customers ? g : best), null);
        return top && total ? { gender: top.gender!, age_band: top.age_band!, share: Math.round((top.customers / total) * 100) } : null;
    }
    readonly judged = computed(() => this.result().verdict !== 'too_little');
    readonly bars = computed(() => {
        const { promoted_before, promoted_window } = this.result();
        const widest = Math.max(1, promoted_before, promoted_window);
        return { before: (promoted_before / widest) * 100, window: (promoted_window / widest) * 100 };
    });

    /** The working, step by step, with this campaign's numbers (marketing analytics, How a campaign's result is worked out). */
    readonly steps = computed(() => {
        const r = this.result();
        const money = (n: number | null | undefined) => this._money.transform(n ?? 0);
        const day = (value: string) => this._date.transform(value, this.language());
        const trend = r.trend_percent ?? 0;
        const trendKey = trend > 0 ? 'more' : trend < 0 ? 'less' : 'same';
        const steps: { key: string; params: Record<string, string | number> }[] = [
            { key: 'periods', params: { from: day(r.window_from), to: day(r.window_to), days: r.days, beforeFrom: day(r.before_from), beforeTo: day(r.before_to) } },
            { key: `rest.${r.rest_before ? trendKey : 'none'}`, params: { before: r.rest_before, window: r.rest_window, percent: Math.abs(trend) } },
        ];
        if (!this.judged()) return steps;
        steps.push({ key: 'expected', params: { before: r.promoted_before, expected: r.expected ?? 0 } });
        steps.push({ key: (r.extra ?? 0) > 0 ? 'actual.rise' : 'actual.none', params: { window: r.promoted_window, extra: r.extra ?? 0 } });
        if ((r.extra ?? 0) > 0 && !r.money_hidden) steps.push({ key: 'earned', params: { perUnit: money(r.profit_per_unit), extra: r.extra ?? 0, profit: money(r.extra_profit) } });
        steps.push({ key: 'cost', params: { cost: money(r.cost) } });
        steps.push({ key: r.money_hidden ? `verdict.hidden.${r.verdict}` : `verdict.${r.verdict}`, params: { profit: money(r.extra_profit), cost: money(r.cost), ratio: r.return_per_taka ?? 0 } });
        return steps;
    });
}
