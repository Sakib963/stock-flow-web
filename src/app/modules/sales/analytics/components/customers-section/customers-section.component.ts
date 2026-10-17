import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCalendarRange, lucideCake, lucideMapPinned, lucideRepeat, lucideRotateCw, lucideUserRoundX } from '@ng-icons/lucide';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzSegmentedModule } from 'ng-zorro-antd/segmented';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzTableModule } from 'ng-zorro-antd/table';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { RequestFailure } from '@app/core/models/api.model';
import { CUSTOMER_AGE_BANDS } from '@app/core/models/customer.model';
import { CustomerFigures, Insight, SalesAnalyticsQuery } from '@app/core/models/sales-analytics.model';
import { LanguageService } from '@app/core/services/language/language.service';
import { SessionService } from '@app/core/services/session/session.service';
import { DISTRICT_COUNT, RATE_FLOOR } from '@app/modules/sales/analytics/constants/sales-analytics';
import { insightParams } from '@app/modules/sales/analytics/utils/sales-analytics/sales-analytics';
import { SalesAnalyticsService } from '@app/modules/sales/analytics/services/sales-analytics.service';
import { CUSTOMER_ROUTES } from '@app/modules/sales/customer/constants/customer-routes';
import { BdMapComponent, MapValue } from '@app/shared/components/charts/bd-map/bd-map.component';
import { DigitsPipe } from '@app/shared/pipes/digits/digits.pipe';
import { MoneyPipe } from '@app/shared/pipes/money/money.pipe';
import { RecordDatePipe } from '@app/shared/pipes/record-date/record-date.pipe';
import { failureOf } from '@app/shared/utils/request-failure/request-failure';

type Metric = 'customers' | 'sales' | 'failed';

/**
 * Customers and places (sales analytics REQ-100, 103, 104, 158, 159): where online buyers are, who
 * came back and when, and who stopped coming.
 */
@Component({
    selector: 'customers-section',
    imports: [FormsModule, RouterLink, NgIcon, NzButtonModule, NzCardModule, NzSegmentedModule, NzSkeletonModule, NzTableModule, TranslatePipe, DigitsPipe, MoneyPipe, RecordDatePipe, BdMapComponent],
    providers: [provideIcons({ lucideCalendarRange, lucideCake, lucideMapPinned, lucideRepeat, lucideRotateCw, lucideUserRoundX })],
    templateUrl: './customers-section.component.html',
    styleUrl: './customers-section.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomersSectionComponent {
    private readonly _analytics = inject(SalesAnalyticsService);
    private readonly _translate = inject(TranslateService);
    private readonly _session = inject(SessionService);
    private readonly _money = new MoneyPipe();
    readonly language = inject(LanguageService).current;
    readonly customerRoute = CUSTOMER_ROUTES.detail;
    readonly canOpenCustomer = this._session.can('sales.customer.view');

    readonly query = input.required<SalesAnalyticsQuery>();

    readonly figures = signal<CustomerFigures | null>(null);
    readonly failed = signal<RequestFailure | null>(null);
    readonly metric = signal<Metric>('customers');
    readonly metrics: Metric[] = ['customers', 'sales', 'failed'];
    readonly months = [1, 2, 3, 4, 5];
    readonly districtCount = DISTRICT_COUNT;
    private _load?: Subscription;

    /** Places are online only: a counter sale has no address. */
    readonly online = computed(() => this.figures()?.channels.includes('ONLINE') ?? false);

    /** Each district's figure for the chosen metric; a not delivered rate only over enough parcels. */
    readonly mapValues = computed<(MapValue & { shown: string })[]>(() => {
        const metric = this.metric();
        const language = this.language();
        return (this.figures()?.places ?? []).map((p) => {
            const name = language === 'bn' ? p.name_bn : p.name_en;
            const rate = p.dispatched >= RATE_FLOOR ? Math.round((p.failed / p.dispatched) * 100) : null;
            const value = metric === 'customers' ? p.customers : metric === 'sales' ? p.sales : (rate ?? 0);
            const shown = metric === 'failed' ? (rate === null ? `${this.number(p.failed)} / ${this.number(p.dispatched)}` : `${this.number(rate)}%`) : this.number(value);
            return { oid: p.oid, name, value, tip: `${name}: ${shown}`, shown };
        });
    });

    /** Every district with a figure, beside the map, largest first, with a bar each. */
    readonly ranking = computed(() => {
        const rows = [...this.mapValues()].filter((v) => v.value > 0 || this.metric() === 'failed').sort((a, b) => b.value - a.value);
        const widest = Math.max(1, ...rows.map((r) => r.value));
        return rows.map((r) => ({ ...r, width: (r.value / widest) * 100 }));
    });

    readonly coverage = computed(() => (this.figures()?.places ?? []).filter((p) => p.customers > 0).length);

    readonly repeat = computed(() => {
        const r = this.figures()?.repeat;
        if (!r) return null;
        return { ...r, returning: r.customers - r.new_customers };
    });

    /** Each month's first-time buyers, and the share who bought again one to five months later. */
    readonly cohorts = computed(() =>
        (this.figures()?.cohorts ?? []).map((c) => ({
            ...c,
            label: new Intl.DateTimeFormat(this.language() === 'bn' ? 'bn-BD' : 'en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${c.cohort}-01T00:00:00Z`)),
            cells: this.months.map((month) => {
                const back = c.returned.find((r) => r.month === month)?.customers ?? 0;
                const share = c.customers ? Math.round((back / c.customers) * 100) : 0;
                return { month, back, share, shade: back === 0 ? 'bg-surface-sunken' : share >= 40 ? 'bg-primary/60' : share >= 20 ? 'bg-primary/35' : 'bg-primary/15' };
            }),
        }))
    );

    /** Each age band's share of the buyers with an age recorded; the rest are counted apart. */
    readonly ages = computed(() => {
        const rows = this.figures()?.ages ?? [];
        const unknown = rows.find((r) => r.age_band === null)?.customers ?? 0;
        const known = rows.reduce((sum, r) => sum + r.customers, 0) - unknown;
        const widest = Math.max(1, ...rows.filter((r) => r.age_band !== null).map((r) => r.customers));
        const bands = CUSTOMER_AGE_BANDS.map((band) => {
            const customers = rows.find((r) => r.age_band === band)?.customers ?? 0;
            return { band, customers, share: known ? Math.round((customers / known) * 100) : 0, width: (customers / widest) * 100 };
        });
        return { bands, known, unknown };
    });

    readonly insights = computed(() => {
        const figures = this.figures();
        const language = this.language();
        const said = (insight: Insight | null) => (insight ? { key: `sales.analytics.insight.customers.${insight.key}`, params: insightParams(insight, language, this._translate, (n) => this.number(n)) } : null);
        return { places: said(figures?.insights.places ?? null), repeat: said(figures?.insights.repeat ?? null) };
    });

    constructor() {
        inject(DestroyRef).onDestroy(() => this._load?.unsubscribe());
        effect(() => {
            const query = this.query();
            untracked(() => this.load(query));
        });
    }

    pickMetric(metric: Metric): void {
        this.metric.set(metric);
    }

    reload(): void {
        this.load(this.query());
    }

    private load(query: SalesAnalyticsQuery): void {
        this._load?.unsubscribe();
        this.failed.set(null);
        this.figures.set(null);
        this._load = this._analytics.customers(query).subscribe({
            next: (figures) => this.figures.set(figures),
            error: (error: unknown) => this.failed.set(failureOf(error)),
        });
    }

    private number(n: number): string {
        return this._money.transform(n, 'number');
    }
}
