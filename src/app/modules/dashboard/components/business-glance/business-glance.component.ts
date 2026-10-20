import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowDownRight, lucideArrowRight, lucideArrowUpRight, lucideChartColumn, lucideCoins, lucidePackage, lucideReceipt, lucideTrophy, lucideWallet } from '@ng-icons/lucide';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import type { EChartsCoreOption } from 'echarts/core';
import { Business, BusinessFigures, Dashboard, DashboardPeriod } from '@app/core/models/dashboard.model';
import { LanguageService } from '@app/core/services/language/language.service';
import { changeOf } from '@app/modules/dashboard/utils/change';
import { ChartComponent, token } from '@app/shared/components/charts/chart/chart.component';
import { DigitsPipe } from '@app/shared/pipes/digits/digits.pipe';
import { MoneyPipe } from '@app/shared/pipes/money/money.pipe';
import { localDigits } from '@app/shared/utils/local-digits/local-digits';

const TILES: readonly { key: keyof BusinessFigures; icon: string; money: boolean }[] = [
    { key: 'sales', icon: 'lucideWallet', money: true },
    { key: 'profit', icon: 'lucideCoins', money: true },
    { key: 'orders', icon: 'lucideReceipt', money: false },
    { key: 'average', icon: 'lucideChartColumn', money: true },
];

const DAY_MS = 86_400_000;

const daysBetween = (from: string, to: string): string[] => {
    const days: string[] = [];
    for (let t = Date.parse(`${from}T00:00:00Z`); t <= Date.parse(`${to}T00:00:00Z`); t += DAY_MS) days.push(new Date(t).toISOString().slice(0, 10));
    return days;
};

const percentOf = (part: number, whole: number) => (whole > 0 ? Math.round((Math.max(0, part) / whole) * 100) : 0);

@Component({
    selector: 'business-glance',
    imports: [RouterLink, NgIcon, NzButtonModule, NzCardModule, NzTooltipModule, TranslatePipe, DigitsPipe, MoneyPipe, ChartComponent],
    providers: [MoneyPipe, provideIcons({ lucideArrowDownRight, lucideArrowRight, lucideArrowUpRight, lucideChartColumn, lucideCoins, lucidePackage, lucideReceipt, lucideTrophy, lucideWallet })],
    templateUrl: './business-glance.component.html',
    styleUrl: './business-glance.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BusinessGlanceComponent {
    private readonly _translate = inject(TranslateService);
    private readonly _money = inject(MoneyPipe);
    readonly language = inject(LanguageService).current;

    readonly data = input.required<Business>();
    readonly period = input.required<DashboardPeriod>();
    readonly range = input.required<Dashboard['period']>();

    readonly hoveredChannel = signal<string | null>(null);
    readonly hoveredProduct = signal<string | null>(null);

    readonly tiles = computed(() => TILES.map((tile) => ({ ...tile, value: this.data().current[tile.key], change: changeOf(this.data().current[tile.key], this.data().previous[tile.key]) })));

    readonly bars = computed(() => {
        const { daily, previous_daily } = this.data();
        const { date_from, date_to, previous_from, previous_to } = this.range();
        if (date_from === date_to) return [];
        const now = new Map(daily.map((d) => [d.day, d]));
        const before = new Map(previous_daily.map((d) => [d.day, d.sales]));
        const beforeDays = daysBetween(previous_from, previous_to);
        return daysBetween(date_from, date_to).map((day, i) => ({ day, sales: now.get(day)?.sales ?? 0, profit: now.get(day)?.profit ?? 0, beforeDay: beforeDays[i] ?? null, before: before.get(beforeDays[i]) ?? 0 }));
    });
    readonly hasChart = computed(() => this.bars().length > 0);

    readonly chart = computed<EChartsCoreOption>(() => {
        const bars = this.bars();
        const locale = this.language() === 'bn' ? 'bn-BD' : 'en-GB';
        const label = (key: string) => this._translate.instant(`dashboard.business.${key}`);
        const day = (value: string | null, month: 'short' | 'long' = 'short') => (value ? new Intl.DateTimeFormat(locale, { day: 'numeric', month, timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`)) : '');
        const compact = new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 });
        const [sales, profit, before] = [label('sales'), label('profit'), label('before')];
        const primary = token('primary');
        const faint = token('ink-faint');
        const row = (color: string, name: string, value: number) => `<div style="display:flex;gap:16px;justify-content:space-between;align-items:center"><span><span style="display:inline-block;width:8px;height:8px;border-radius:2px;margin-right:6px;background:${color}"></span>${name}</span><b style="font-variant-numeric:tabular-nums">${this._money.transform(value)}</b></div>`;
        return {
            grid: { left: 4, right: 8, top: 32, bottom: 4, containLabel: true },
            legend: { top: 0, right: 0, data: [sales, profit, before] },
            tooltip: {
                trigger: 'axis',
                axisPointer: { type: 'shadow', shadowStyle: { color: token('ink'), opacity: 0.05 } },
                formatter: (params: { dataIndex: number }[]) => {
                    const bar = bars[params[0].dataIndex];
                    return `<div style="font-weight:700;margin-bottom:4px">${day(bar.day, 'long')}</div>${row(`color-mix(in srgb, ${primary} 30%, transparent)`, sales, bar.sales)}${row(primary, profit, bar.profit)}${row(faint, `${before}, ${day(bar.beforeDay, 'long')}`, bar.before)}`;
                },
            },
            xAxis: { type: 'category', data: bars.map((bar) => day(bar.day)) },
            yAxis: { type: 'value', axisLabel: { formatter: (value: number) => compact.format(value) } },
            series: [
                { name: sales, type: 'bar', data: bars.map((bar) => bar.sales), barMaxWidth: 32, itemStyle: { color: primary, opacity: 0.3, borderRadius: [4, 4, 0, 0] }, emphasis: { itemStyle: { opacity: 0.45 } } },
                { name: profit, type: 'bar', data: bars.map((bar) => bar.profit), barGap: '-100%', barMaxWidth: 32, itemStyle: { color: primary, borderRadius: [4, 4, 0, 0] } },
                { name: before, type: 'line', data: bars.map((bar) => bar.before), smooth: true, symbol: 'circle', symbolSize: 5, showSymbol: false, lineStyle: { color: faint, width: 1.5, type: 'dashed' }, itemStyle: { color: faint } },
            ],
        };
    });

    readonly chartLabel = computed(() => {
        this.language();
        const { sales, profit } = this.data().current;
        return `${this._translate.instant('dashboard.business.byDay')}: ${this._translate.instant('dashboard.business.sales')} ${this._money.transform(sales)}, ${this._translate.instant('dashboard.business.profit')} ${this._money.transform(profit)}`;
    });

    readonly top = computed(() => {
        const language = this.language();
        return this.data().top.map((product) => {
            const share = percentOf(product.sales, this.data().current.sales);
            const figures = `${this._money.transform(product.sales)} · ${this._translate.instant('dashboard.business.units', { count: product.units })} · ${this._translate.instant('dashboard.business.share', { percent: share })}`;
            return { ...product, share, tip: `${product.name}: ${localDigits(figures, language)}` };
        });
    });

    readonly channels = computed(() => {
        const rows = this.data().by_channel;
        const total = rows.reduce((sum, row) => sum + row.sales, 0);
        if (rows.length < 2 || total <= 0) return [];
        const [first, second] = [...rows].sort((a, b) => Number(b.channel === 'POS') - Number(a.channel === 'POS'));
        const share = percentOf(first.sales, total);
        const language = this.language();
        const tip = (channel: string, sales: number, percent: number) => localDigits(`${this._translate.instant(`dashboard.business.channel.${channel}`)}: ${this._money.transform(sales)} · ${this._translate.instant('dashboard.business.share', { percent })}`, language);
        return [
            { ...first, share, tip: tip(first.channel, first.sales, share) },
            { ...second, share: 100 - share, tip: tip(second.channel, second.sales, 100 - share) },
        ];
    });
}
