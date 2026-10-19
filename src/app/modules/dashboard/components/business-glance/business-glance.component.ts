import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowDownRight, lucideArrowRight, lucideArrowUpRight, lucideChartColumn, lucideCoins, lucideReceipt, lucideTrophy, lucideWallet } from '@ng-icons/lucide';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { TranslatePipe } from '@ngx-translate/core';
import { Business, BusinessFigures, DashboardPeriod } from '@app/core/models/dashboard.model';
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

/** Every day from the first to the last, so a day without sales still has its place on the chart. */
const daysBetween = (from: string, to: string): string[] => {
    const days: string[] = [];
    for (let t = Date.parse(`${from}T00:00:00Z`); t <= Date.parse(`${to}T00:00:00Z`); t += DAY_MS) days.push(new Date(t).toISOString().slice(0, 10));
    return days;
};

@Component({
    selector: 'business-glance',
    imports: [RouterLink, NgIcon, NzButtonModule, NzCardModule, NzTooltipModule, TranslatePipe, DigitsPipe, MoneyPipe, RecordDatePipe],
    providers: [provideIcons({ lucideArrowDownRight, lucideArrowRight, lucideArrowUpRight, lucideChartColumn, lucideCoins, lucideReceipt, lucideTrophy, lucideWallet })],
    templateUrl: './business-glance.component.html',
    styleUrl: './business-glance.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BusinessGlanceComponent {
    readonly language = inject(LanguageService).current;

    readonly data = input.required<Business>();
    readonly period = input.required<DashboardPeriod>();
    readonly from = input.required<string>();
    readonly to = input.required<string>();

    readonly tiles = computed(() => TILES.map((tile) => ({ ...tile, value: this.data().current[tile.key], change: changeOf(this.data().current[tile.key], this.data().previous[tile.key]) })));

    readonly bars = computed(() => {
        const daily = this.data().daily;
        if (!daily.length && this.from() === this.to()) return [];
        const byDay = new Map(daily.map((d) => [d.day, d.sales]));
        const days = daysBetween(this.from(), this.to()).map((day) => ({ day, sales: byDay.get(day) ?? 0 }));
        const peak = Math.max(...days.map((d) => d.sales), 0);
        return days.map((d) => ({ ...d, height: peak ? Math.max(Math.round((d.sales / peak) * 100), d.sales ? 3 : 0) : 0 }));
    });
    readonly hasChart = computed(() => this.bars().length > 0);
}
