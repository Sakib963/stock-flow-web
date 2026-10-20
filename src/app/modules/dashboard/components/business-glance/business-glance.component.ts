import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowDownRight, lucideArrowRight, lucideArrowUpRight, lucideChartColumn, lucideCoins, lucidePackage, lucideReceipt, lucideTrophy, lucideWallet } from '@ng-icons/lucide';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { TranslatePipe } from '@ngx-translate/core';
import { Business, BusinessFigures, Dashboard, DashboardPeriod } from '@app/core/models/dashboard.model';
import { LanguageService } from '@app/core/services/language/language.service';
import { changeOf } from '@app/modules/dashboard/utils/change';
import { DigitsPipe } from '@app/shared/pipes/digits/digits.pipe';
import { MoneyPipe } from '@app/shared/pipes/money/money.pipe';
import { RecordDatePipe } from '@app/shared/pipes/record-date/record-date.pipe';

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
    imports: [RouterLink, NgIcon, NzButtonModule, NzCardModule, NzTooltipModule, TranslatePipe, DigitsPipe, MoneyPipe, RecordDatePipe],
    providers: [provideIcons({ lucideArrowDownRight, lucideArrowRight, lucideArrowUpRight, lucideChartColumn, lucideCoins, lucidePackage, lucideReceipt, lucideTrophy, lucideWallet })],
    templateUrl: './business-glance.component.html',
    styleUrl: './business-glance.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BusinessGlanceComponent {
    readonly language = inject(LanguageService).current;

    readonly data = input.required<Business>();
    readonly period = input.required<DashboardPeriod>();
    readonly range = input.required<Dashboard['period']>();

    readonly hovered = signal<number | null>(null);

    readonly tiles = computed(() => TILES.map((tile) => ({ ...tile, value: this.data().current[tile.key], change: changeOf(this.data().current[tile.key], this.data().previous[tile.key]) })));

    readonly bars = computed(() => {
        const { daily, previous_daily } = this.data();
        const { date_from, date_to, previous_from, previous_to } = this.range();
        if (date_from === date_to) return [];
        const now = new Map(daily.map((d) => [d.day, d]));
        const before = new Map(previous_daily.map((d) => [d.day, d.sales]));
        const beforeDays = daysBetween(previous_from, previous_to);
        const days = daysBetween(date_from, date_to).map((day, i) => ({ day, sales: now.get(day)?.sales ?? 0, profit: now.get(day)?.profit ?? 0, beforeDay: beforeDays[i] ?? null, before: before.get(beforeDays[i]) ?? 0 }));
        const peak = Math.max(1, ...days.map((d) => Math.max(d.sales, d.before)));
        return days.map((d) => ({ ...d, height: d.sales ? Math.max((d.sales / peak) * 100, 2) : 0, beforeHeight: (d.before / peak) * 100, profitShare: percentOf(d.profit, d.sales) }));
    });
    readonly hasChart = computed(() => this.bars().length > 0);

    readonly readout = computed(() => {
        const bar = this.hovered() === null ? null : this.bars()[this.hovered()!];
        if (bar) return { day: bar.day, sales: bar.sales, profit: bar.profit, beforeDay: bar.beforeDay, before: bar.before };
        const { current, previous } = this.data();
        return { day: null, sales: current.sales, profit: current.profit, beforeDay: null, before: previous.sales };
    });

    readonly top = computed(() => this.data().top.map((product) => ({ ...product, share: percentOf(product.sales, this.data().current.sales) })));

    readonly channels = computed(() => {
        const rows = this.data().by_channel;
        const total = rows.reduce((sum, row) => sum + row.sales, 0);
        if (rows.length < 2 || total <= 0) return [];
        const [first, second] = [...rows].sort((a, b) => Number(b.channel === 'POS') - Number(a.channel === 'POS'));
        const share = percentOf(first.sales, total);
        return [
            { ...first, share },
            { ...second, share: 100 - share },
        ];
    });
}
