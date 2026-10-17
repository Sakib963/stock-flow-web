import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCake, lucideFactory, lucidePackage, lucidePackageX, lucideRotateCw, lucideShoppingBasket, lucideUsers } from '@ng-icons/lucide';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzTableModule } from 'ng-zorro-antd/table';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { RequestFailure } from '@app/core/models/api.model';
import { Insight, ProductFigures, SalesAnalyticsQuery } from '@app/core/models/sales-analytics.model';
import { LanguageService } from '@app/core/services/language/language.service';
import { insightParams, rateOf } from '@app/modules/sales/analytics/utils/sales-analytics/sales-analytics';
import { SalesAnalyticsService } from '@app/modules/sales/analytics/services/sales-analytics.service';
import { PyramidChartComponent, PyramidRow } from '@app/shared/components/charts/pyramid-chart/pyramid-chart.component';
import { DigitsPipe } from '@app/shared/pipes/digits/digits.pipe';
import { MoneyPipe } from '@app/shared/pipes/money/money.pipe';
import { failureOf } from '@app/shared/utils/request-failure/request-failure';

const AGE_BANDS = ['under_18', '18_24', '25_34', '35_44', '45_plus'] as const;

/**
 * Products and suppliers (sales analytics REQ-100, 101, 154 to 157): best sellers against what was
 * asked for, who buys, what sells together, why goods come back, and whose goods they were.
 */
@Component({
    selector: 'products-section',
    imports: [NgIcon, NzButtonModule, NzCardModule, NzSkeletonModule, NzTableModule, TranslatePipe, DigitsPipe, MoneyPipe, PyramidChartComponent],
    providers: [provideIcons({ lucideCake, lucideFactory, lucidePackage, lucidePackageX, lucideRotateCw, lucideShoppingBasket, lucideUsers })],
    templateUrl: './products-section.component.html',
    styleUrl: './products-section.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductsSectionComponent {
    private readonly _analytics = inject(SalesAnalyticsService);
    private readonly _translate = inject(TranslateService);
    private readonly _money = new MoneyPipe();
    readonly language = inject(LanguageService).current;

    readonly query = input.required<SalesAnalyticsQuery>();

    readonly figures = signal<ProductFigures | null>(null);
    readonly failed = signal<RequestFailure | null>(null);
    private _load?: Subscription;

    readonly products = computed(() =>
        (this.figures()?.products ?? []).map((p) => ({
            ...p,
            margin: p.sales > 0 ? rateOf(p.profit, p.sales, (n) => this.number(n)).text : '-',
            kept: p.demand_units > 0 ? Math.min(100, (p.kept_units / p.demand_units) * 100) : 100,
            returns: rateOf(p.returned_units, p.sold_units, (n) => this.number(n)),
        }))
    );

    /** Women left, men right, youngest at the top; buyers with nothing recorded are counted beside it. */
    readonly pyramid = computed<PyramidRow[]>(() => {
        const buyers = this.figures()?.buyers ?? [];
        const count = (gender: string, band: string) => buyers.filter((b) => b.gender === gender && b.age_band === band).reduce((sum, b) => sum + b.customers, 0);
        return AGE_BANDS.map((band) => ({ key: band, label: `sales.customer.ageBand.${band}`, left: count('Female', band), right: count('Male', band) }));
    });

    readonly buyerCounts = computed(() => {
        const buyers = this.figures()?.buyers ?? [];
        const total = buyers.reduce((sum, b) => sum + b.customers, 0);
        const known = buyers.filter((b) => b.gender && b.age_band).reduce((sum, b) => sum + b.customers, 0);
        return { total, unknown: total - known };
    });

    /** Each age band with what it kept most of, youngest first; a band with no sales is left out. */
    readonly ageDemand = computed(() => {
        const rows = this.figures()?.age_demand ?? [];
        return AGE_BANDS.map((band) => {
            const products = rows.filter((r) => r.age_band === band);
            const widest = Math.max(1, ...products.map((p) => p.units));
            return { band, products: products.map((p) => ({ ...p, width: (p.units / widest) * 100 })) };
        }).filter((b) => b.products.length);
    });

    readonly together = computed(() => {
        const rows = this.figures()?.together ?? [];
        const widest = Math.max(1, ...rows.map((r) => r.orders));
        return rows.map((r) => ({ ...r, key: `${r.first_oid}-${r.second_oid}`, width: (r.orders / widest) * 100 }));
    });

    readonly reasons = computed(() => {
        const rows = this.figures()?.return_reasons ?? [];
        const widest = Math.max(1, ...rows.map((r) => r.units));
        return rows.map((r) => ({ ...r, width: (r.units / widest) * 100 }));
    });

    readonly suppliers = computed(() =>
        (this.figures()?.suppliers ?? []).map((s) => ({
            ...s,
            key: s.oid ?? 'none',
            margin: s.sales > 0 ? rateOf(s.profit, s.sales, (n) => this.number(n)).text : '-',
            sellThrough: s.received_all_time > 0 ? Math.min(100, Math.round((s.kept_all_time / s.received_all_time) * 100)) : null,
            returns: rateOf(s.returned_units, s.sold_units, (n) => this.number(n)),
            damaged: rateOf(s.damaged_units, s.sold_units, (n) => this.number(n)),
        }))
    );

    readonly insights = computed(() => {
        const figures = this.figures();
        const language = this.language();
        const said = (insight: Insight | null) => (insight ? { key: `sales.analytics.insight.products.${insight.key}`, params: insightParams(insight, language, this._translate, (n) => this.number(n)) } : null);
        return { products: said(figures?.insights.products ?? null), demand: said(figures?.insights.demand ?? null), suppliers: said(figures?.insights.suppliers ?? null), buyers: said(figures?.insights.buyers ?? null) };
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

    private load(query: SalesAnalyticsQuery): void {
        this._load?.unsubscribe();
        this.failed.set(null);
        this.figures.set(null);
        this._load = this._analytics.products(query).subscribe({
            next: (figures) => this.figures.set(figures),
            error: (error: unknown) => this.failed.set(failureOf(error)),
        });
    }

    private number(n: number): string {
        return this._money.transform(n, 'number');
    }
}
