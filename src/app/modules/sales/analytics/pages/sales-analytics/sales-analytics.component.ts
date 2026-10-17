import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, signal, untracked } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowDownRight, lucideArrowUpRight, lucideBadgePercent, lucideCalendarCheck, lucideChartPie, lucideSplit, lucideContact, lucideFunnel, lucidePackage, lucideStore, lucideUsers, lucideChartColumnDecreasing, lucideCoins, lucidePackageX, lucideReceipt, lucideRotateCw, lucideSparkles, lucideWallet } from '@ng-icons/lucide';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { TranslatePipe } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { RequestFailure } from '@app/core/models/api.model';
import { FilterConfig, FilterValues } from '@app/core/models/filter.model';
import { Compared, RefusalCount, SalesAnalyticsQuery, SalesChannel, SalesOverview } from '@app/core/models/sales-analytics.model';
import { OrdersSectionComponent } from '@app/modules/sales/analytics/components/orders-section/orders-section.component';
import { TeamSectionComponent } from '@app/modules/sales/analytics/components/team-section/team-section.component';
import { ProductsSectionComponent } from '@app/modules/sales/analytics/components/products-section/products-section.component';
import { CustomersSectionComponent } from '@app/modules/sales/analytics/components/customers-section/customers-section.component';
import { RATE_FLOOR } from '@app/modules/sales/analytics/constants/sales-analytics';
import { LanguageService } from '@app/core/services/language/language.service';
import { SessionService } from '@app/core/services/session/session.service';
import { SalesAnalyticsService } from '@app/modules/sales/analytics/services/sales-analytics.service';
import { SparklineComponent } from '@app/shared/components/charts/sparkline/sparkline.component';
import { WaterfallChartComponent, WaterfallStep } from '@app/shared/components/charts/waterfall-chart/waterfall-chart.component';
import { FilterComponent } from '@app/shared/components/filter/filter.component';
import { PageHeaderComponent } from '@app/shared/components/page-header/page-header.component';
import { DigitsPipe } from '@app/shared/pipes/digits/digits.pipe';
import { MoneyPipe } from '@app/shared/pipes/money/money.pipe';
import { RecordDatePipe } from '@app/shared/pipes/record-date/record-date.pipe';
import { addDays, businessToday } from '@app/shared/utils/business-time/business-time';
import { failureOf } from '@app/shared/utils/request-failure/request-failure';
import { isPhoneWidth, viewportWidth } from '@app/shared/utils/viewport/viewport';


interface Tile {
    key: 'sales' | 'profit' | 'margin' | 'orders' | 'refusal';
    icon: string;
    value: string;
    /** Under the floor a count reads "1 / 4": the 4 sits smaller beside the 1. */
    suffix?: string;
    /** The change against the previous period, as a copy key, with whether it is good news. */
    change: { key: string; params: Record<string, string>; up: boolean; good: boolean } | null;
    trend: number[] | null;
    note: { key: string; params: Record<string, string> } | null;
}

/**
 * What sold and what it earned. Every chart carries the one sentence that says what it means; the
 * overview is the first tab, and only the open tab asks for its figures.
 */
@Component({
    selector: 'sales-analytics',
    imports: [NgIcon, NzButtonModule, NzCardModule, NzSkeletonModule, NzTabsModule, NzTooltipModule, TranslatePipe, DigitsPipe, MoneyPipe, RecordDatePipe, FilterComponent, PageHeaderComponent, SparklineComponent, WaterfallChartComponent, OrdersSectionComponent, TeamSectionComponent, ProductsSectionComponent, CustomersSectionComponent],
    providers: [provideIcons({ lucideArrowDownRight, lucideArrowUpRight, lucideBadgePercent, lucideCalendarCheck, lucideChartPie, lucideSplit, lucideContact, lucideFunnel, lucidePackage, lucideStore, lucideUsers, lucideChartColumnDecreasing, lucideCoins, lucidePackageX, lucideReceipt, lucideRotateCw, lucideSparkles, lucideWallet })],
    templateUrl: './sales-analytics.component.html',
    styleUrl: './sales-analytics.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SalesAnalyticsComponent {
    private readonly _analytics = inject(SalesAnalyticsService);
    private readonly _session = inject(SessionService);
    private readonly _money = new MoneyPipe();
    readonly language = inject(LanguageService).current;
    readonly isPhone = isPhoneWidth(viewportWidth());

    /** This month so far, the period an owner asks about first. */
    readonly filters = signal<FilterValues>({ date_from: addDays(businessToday(), 1 - Number(businessToday().slice(8))), date_to: businessToday() });

    /** What every section asks the server for: the filter values travel as they are. */
    readonly query = computed(() => this.filters() as SalesAnalyticsQuery);

    /** The online tab only for someone who sells online and has not narrowed the page to the counter. */
    readonly showsOnline = computed(() => this._session.can('sales.online.view') && this.filters()['channel'] !== 'POS');

    readonly tabIcons = { overview: 'lucideChartPie', orders: 'lucideFunnel', products: 'lucidePackage', customers: 'lucideContact', team: 'lucideUsers' } as const;
    readonly tabs = computed(() => (this.showsOnline() ? (['overview', 'orders', 'products', 'customers', 'team'] as const) : (['overview', 'products', 'customers', 'team'] as const)));
    readonly tab = signal<'overview' | 'orders' | 'products' | 'customers' | 'team'>('overview');
    /** A tab that went away (the counter chosen while on Online orders) falls back to the overview. */
    readonly tabIndex = computed(() => Math.max(0, (this.tabs() as readonly string[]).indexOf(this.tab())));

    readonly overview = signal<SalesOverview | null>(null);
    /** Kept between loads, so the filter row does not lose its fields while the figures reload. */
    private readonly _choices = signal<Pick<SalesOverview, 'channels' | 'sources'>>({ channels: [], sources: [] });
    readonly failed = signal<RequestFailure | null>(null);
    private _load?: Subscription;

    /** Channel only for someone who sells through both, source only for someone who sells online. */
    readonly filterConfig = computed<FilterConfig>(() => {
        const { channels, sources } = this._choices();
        return {
            render: 'row',
            fields: [
                { key: 'when', label: 'sales.analytics.filter.when', type: 'date-range', fromKey: 'date_from', toKey: 'date_to', presets: ['this-month', 'last-month', 'last-7-days', 'last-30-days'], max: 'today' },
                ...(channels.length > 1 ? [{ key: 'channel', label: 'sales.analytics.filter.channel', type: 'select' as const, choices: channels.map((c: SalesChannel) => ({ value: c, label: `sales.analytics.channel.${c}` })) }] : []),
                ...(sources.length ? [{ key: 'source_oid', label: 'sales.analytics.filter.source', type: 'select' as const, choices: sources.map((s) => ({ value: s.oid, label: s.name, sub: s.platform })) }] : []),
                { key: 'category_oid', label: 'sales.analytics.filter.category', type: 'select', permission: 'configuration.category.view', choices: { endpoint: APIEndpoint.GET_CATEGORY_LIST_FOR_DROPDOWN } },
            ],
        };
    });

    /** As many tile skeletons as tiles will come: the parcel tile only for someone who sells online. */
    readonly tileSkeletons = computed(() => (this.showsOnline() ? [1, 2, 3, 4, 5] : [1, 2, 3, 4]));

    readonly tiles = computed<Tile[]>(() => {
        const data = this.overview();
        if (!data) return [];
        // Every day of the period, a day with no sale drawn as zero rather than skipped.
        const series = (pick: (d: { sales: number; profit: number }) => number) => {
            const byDay = new Map(data.daily.map((d) => [d.day, d]));
            const last = data.period.date_to < businessToday() ? data.period.date_to : businessToday();
            const values: number[] = [];
            for (let day = data.period.date_from; day <= last; day = addDays(day, 1)) values.push(pick(byDay.get(day) ?? { sales: 0, profit: 0 }));
            return values;
        };
        const money = (value: number) => this._money.transform(value, 'number');
        const { tiles } = data;
        // A batch with no cost price counts as free, so profit reads high: say so on the tiles too.
        const withoutCost = data.waterfall.units_without_cost ? { key: 'sales.analytics.tile.withoutCost', params: { count: money(data.waterfall.units_without_cost) } } : null;
        const list: Tile[] = [
            { key: 'sales', icon: 'lucideWallet', value: money(tiles.sales.current), change: this.percentChange(tiles.sales, true), trend: series((d) => d.sales), note: null },
            { key: 'profit', icon: 'lucideCoins', value: money(tiles.profit.current), change: this.percentChange(tiles.profit, true), trend: series((d) => d.profit), note: withoutCost },
            { key: 'margin', icon: 'lucideBadgePercent', value: tiles.margin.current === null ? '-' : this.percent(tiles.margin.current), change: this.pointChange(tiles.margin, true), trend: null, note: withoutCost },
            { key: 'orders', icon: 'lucideReceipt', value: money(tiles.orders.current), change: this.percentChange(tiles.orders, true), trend: null, note: null },
        ];
        if (tiles.refusal) list.push(this.refusalTile(tiles.refusal));
        return list;
    });

    /** Counter against online, each as a share of sales, for a business that sells both ways. */
    readonly split = computed(() => {
        const rows = this.overview()?.by_channel;
        if (!rows?.length) return null;
        const total = rows.reduce((sum, r) => sum + r.sales, 0);
        return rows.map((r) => ({
            ...r,
            share: total > 0 ? Math.round((r.sales / total) * 100) : 0,
            margin: r.sales > 0 ? `${this._money.transform(Math.round((r.profit / r.sales) * 1000) / 10, 'number')}%` : '-',
        }));
    });

    /** Bookings taken in the period, as shares of those taken; converted of the ones already decided. */
    readonly preOrders = computed(() => {
        const p = this.overview()?.pre_orders;
        if (!p) return null;
        const decided = p.converted + p.cancelled;
        return { ...p, convertedShare: decided ? Math.round((p.converted / decided) * 100) : null };
    });

    readonly counter = computed(() => {
        const c = this.overview()?.counter;
        if (!c) return null;
        return { ...c, perSale: c.sales ? Math.round((c.units / c.sales) * 10) / 10 : null, average: c.sales ? Math.round(c.value / c.sales) : null, withoutShare: c.sales ? Math.round((c.without_customer / c.sales) * 100) : null };
    });

    readonly steps = computed<WaterfallStep[]>(() => {
        const w = this.overview()?.waterfall;
        if (!w) return [];
        return [
            { key: 'list', label: 'sales.analytics.waterfall.list', value: w.list_price, kind: 'start' },
            { key: 'discounts', label: 'sales.analytics.waterfall.discounts', value: w.discounts, kind: 'drop' },
            { key: 'returns', label: 'sales.analytics.waterfall.returns', value: w.returns, kind: 'drop' },
            { key: 'cost', label: 'sales.analytics.waterfall.cost', value: w.cost, kind: 'drop' },
            { key: 'profit', label: 'sales.analytics.waterfall.profit', value: w.profit, kind: 'end' },
        ];
    });

    constructor() {
        inject(DestroyRef).onDestroy(() => this._load?.unsubscribe());
        // The overview is asked for only while its tab is open.
        effect(() => {
            const filters = this.filters();
            if (this.tabs()[this.tabIndex()] !== 'overview') return;
            untracked(() => this.load(filters));
        });
    }

    pickTab(index: number): void {
        this.tab.set(this.tabs()[index] ?? 'overview');
    }

    reload(): void {
        this.load(this.filters());
    }

    private load(filters: FilterValues): void {
        this._load?.unsubscribe();
        this.failed.set(null);
        this.overview.set(null);
        this._load = this._analytics.overview(filters).subscribe({
            next: (overview) => {
                this.overview.set(overview);
                this._choices.set({ channels: overview.channels, sources: overview.sources });
            },
            error: (error: unknown) => this.failed.set(failureOf(error)),
        });
    }

    private percent(rate: number): string {
        return `${this._money.transform(Math.round(rate * 1000) / 10, 'number')}%`;
    }

    /** "12%" up or down; nothing when the previous period had nothing to compare with. */
    private percentChange(pair: Compared<number>, upIsGood: boolean): Tile['change'] {
        if (!pair.previous) return null;
        const change = (pair.current - pair.previous) / Math.abs(pair.previous);
        if (Math.round(change * 100) === 0) return { key: 'sales.analytics.tile.level', params: {}, up: true, good: true };
        return { key: 'sales.analytics.tile.percent', params: { value: this._money.transform(Math.abs(Math.round(change * 100)), 'number') }, up: change > 0, good: change > 0 === upIsGood };
    }

    /** A rate moves in points: a margin from 30% to 33% is 3 points, not 10%. */
    private pointChange(pair: Compared<number | null>, upIsGood: boolean): Tile['change'] {
        if (pair.current === null || pair.previous === null) return null;
        const points = Math.round((pair.current - pair.previous) * 1000) / 10;
        if (points === 0) return { key: 'sales.analytics.tile.level', params: {}, up: true, good: true };
        return { key: 'sales.analytics.tile.points', params: { points: this._money.transform(Math.abs(points), 'number') }, up: points > 0, good: points > 0 === upIsGood };
    }

    private refusalTile(refusal: Compared<RefusalCount>): Tile {
        const { dispatched, failed } = refusal.current;
        const count = (n: number) => this._money.transform(n, 'number');
        let value = '-';
        let suffix: string | undefined;
        if (dispatched >= RATE_FLOOR) value = this.percent(failed / dispatched);
        else if (dispatched) {
            value = count(failed);
            suffix = `/ ${count(dispatched)}`;
        }
        const note = dispatched ? { key: 'sales.analytics.tile.refusalNote', params: { count: count(dispatched) } } : null;
        const rate = (r: RefusalCount) => (r.dispatched >= RATE_FLOOR ? r.failed / r.dispatched : null);
        return { key: 'refusal', icon: 'lucidePackageX', value, suffix, change: this.pointChange({ current: rate(refusal.current), previous: rate(refusal.previous) }, false), trend: null, note };
    }
}
