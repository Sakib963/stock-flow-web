import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCircleX, lucideClock, lucideFunnel, lucideHandCoins, lucideMapPinned, lucidePhoneCall, lucideRotateCw, lucideShieldAlert, lucideTriangleAlert } from '@ng-icons/lucide';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzSegmentedModule } from 'ng-zorro-antd/segmented';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { RequestFailure } from '@app/core/models/api.model';
import { FlowCounts, Insight, OrderFlow, PlaceName, SalesAnalyticsQuery } from '@app/core/models/sales-analytics.model';
import { LanguageService } from '@app/core/services/language/language.service';
import { RATE_FLOOR } from '@app/modules/sales/analytics/constants/sales-analytics';
import { Rate, insightParams, rateOf } from '@app/modules/sales/analytics/utils/sales-analytics/sales-analytics';
import { SalesAnalyticsService } from '@app/modules/sales/analytics/services/sales-analytics.service';
import { DumbbellChartComponent, DumbbellRow } from '@app/shared/components/charts/dumbbell-chart/dumbbell-chart.component';
import { FunnelChartComponent, FunnelStep } from '@app/shared/components/charts/funnel-chart/funnel-chart.component';
import { DigitsPipe } from '@app/shared/pipes/digits/digits.pipe';
import { MoneyPipe } from '@app/shared/pipes/money/money.pipe';
import { failureOf } from '@app/shared/utils/request-failure/request-failure';

const RISK_ORDER = ['blocked', 'watch', 'under_80', 'from_80', 'no_history'] as const;

type Grouping = 'places' | 'products' | 'sources' | 'customers';

interface LossRow {
    key: string;
    name: string;
    placed: number;
    cancel: Rate;
    refusal: Rate | null;
    business: number;
}

/**
 * Where online orders leak (sales analytics REQ-130 to REQ-133, REQ-148 to REQ-151): the funnel, who
 * and what they fall through on, whether confirming and an advance help, whether the warning at
 * intake was right, and how long each step takes. Absent for someone who does not sell online.
 */
@Component({
    selector: 'orders-section',
    imports: [FormsModule, NgIcon, NzButtonModule, NzCardModule, NzSegmentedModule, NzSkeletonModule, NzTableModule, NzTooltipModule, TranslatePipe, DigitsPipe, MoneyPipe, FunnelChartComponent, DumbbellChartComponent],
    providers: [provideIcons({ lucideCircleX, lucideClock, lucideFunnel, lucideHandCoins, lucideMapPinned, lucidePhoneCall, lucideRotateCw, lucideShieldAlert, lucideTriangleAlert })],
    templateUrl: './orders-section.component.html',
    styleUrl: './orders-section.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrdersSectionComponent {
    private readonly _analytics = inject(SalesAnalyticsService);
    private readonly _translate = inject(TranslateService);
    private readonly _money = new MoneyPipe();
    readonly language = inject(LanguageService).current;

    readonly query = input.required<SalesAnalyticsQuery>();

    readonly flow = signal<OrderFlow | null>(null);
    /** False once the server says the section does not apply; the section is then not drawn at all. */
    readonly applies = signal(true);
    readonly loading = signal(true);
    readonly failed = signal<RequestFailure | null>(null);
    readonly grouping = signal<Grouping>('places');
    readonly groupings: Grouping[] = ['places', 'products', 'sources', 'customers'];
    readonly speedSteps = ['toConfirm', 'toDispatch', 'toDeliver'] as const;
    private _load?: Subscription;

    readonly steps = computed<FunnelStep[]>(() => {
        const f = this.flow()?.funnel;
        if (!f) return [];
        const reasons = this.flow()!.cancel_reasons;
        const count = (n: number) => this._money.transform(n, 'number');
        const before = reasons.reduce((sum, r) => sum + r.before_confirm, 0);
        const after = reasons.reduce((sum, r) => sum + r.after_confirm, 0);
        const failed = f.dispatched - f.delivered - f.with_courier;
        const note = (key: string, n: number, tone: 'lost' | 'open') => (n > 0 ? [{ key: `sales.analytics.orders.funnel.${key}`, params: { count: count(n) }, tone }] : []);
        return [
            { key: 'placed', label: 'sales.analytics.orders.funnel.placed', count: f.placed, value: f.placed_value, notes: [...note('cancelledBefore', before, 'lost'), ...note('waitingConfirm', f.waiting_confirm, 'open')] },
            { key: 'confirmed', label: 'sales.analytics.orders.funnel.confirmed', count: f.confirmed, value: f.confirmed_value, notes: [...note('cancelledAfter', after, 'lost'), ...note('waitingDispatch', f.waiting_dispatch, 'open')] },
            { key: 'dispatched', label: 'sales.analytics.orders.funnel.dispatched', count: f.dispatched, value: f.dispatched_value, notes: [...note('failed', failed, 'lost'), ...note('withCourier', f.with_courier, 'open')] },
            { key: 'delivered', label: 'sales.analytics.orders.funnel.delivered', count: f.delivered, value: f.delivered_value, notes: note('returned', f.returned, 'lost') },
            { key: 'kept', label: 'sales.analytics.orders.funnel.kept', count: f.kept, value: f.kept_value },
        ];
    });

    /** Why orders were called off, customer's side first, then the business's own. */
    readonly reasons = computed(() => {
        const flow = this.flow();
        if (!flow) return { cancelled: [], failed: [], widest: 1 };
        // An order cancelled before reasons were asked for has none.
        const cancelled = flow.cancel_reasons.map((r) => ({ key: r.reason ?? 'none', label: r.reason ? `sales.order.cancelReason.${r.reason}` : 'sales.analytics.orders.reasons.noReason', count: r.before_confirm + r.after_confirm, business: r.business }));
        cancelled.sort((a, b) => Number(a.business) - Number(b.business) || b.count - a.count);
        const failed = flow.failed_reasons.map((r) => ({ key: r.reason, label: `sales.order.notDeliveredReason.${r.reason}`, count: r.parcels }));
        return { cancelled, failed, widest: Math.max(1, ...cancelled.map((r) => r.count), ...failed.map((r) => r.count)) };
    });

    readonly losses = computed<LossRow[]>(() => {
        const flow = this.flow();
        if (!flow) return [];
        const counts = (c: FlowCounts) => ({ placed: c.placed, cancel: this.rate(c.cancelled, c.placed - c.business_cancelled), refusal: this.rate(c.failed, c.dispatched), business: c.business_cancelled });
        switch (this.grouping()) {
            case 'places':
                return flow.places.map((p) => ({ key: p.oid, name: this.placeName({ en: p.name_en, bn: p.name_bn }), ...counts(p) }));
            case 'sources':
                return flow.sources.map((s) => ({ key: s.oid, name: s.name, ...counts(s) }));
            case 'products':
                return flow.products.map((p) => ({ key: p.oid, name: p.name, placed: p.units, cancel: this.rate(p.cancelled_units, p.units - p.business_cancelled_units), refusal: null, business: p.business_cancelled_units }));
            case 'customers':
                return flow.customers.map((c) => ({ key: c.oid, name: c.name, placed: c.placed, cancel: this.rate(c.cancelled, c.placed), refusal: null, business: 0 }));
        }
    });

    readonly confirming = computed(() =>
        (this.flow()?.confirming ?? []).map((c) => ({ key: c.method, label: `sales.order.confirmedVia.${c.method}`, dispatched: c.dispatched, refusal: this.rate(c.failed, c.dispatched) }))
    );

    readonly terms = computed(() => (this.flow()?.terms ?? []).map((t) => ({ key: t.terms, label: `sales.online.terms.${t.terms}`, dispatched: t.dispatched, refusal: this.rate(t.failed, t.dispatched) })));

    /** COD against an advance per district; a rate only over enough parcels, so a dot can be missing. */
    readonly termsByPlace = computed<DumbbellRow[]>(() => {
        const of = (part: number, whole: number) => this._translate.instant('sales.analytics.orders.ofParcels', { part: this._money.transform(part, 'number'), whole: this._money.transform(whole, 'number') });
        const rated = (part: number, whole: number) => (whole >= RATE_FLOOR ? Math.round((part / whole) * 100) : null);
        return (this.flow()?.terms_by_place ?? [])
            .map((p) => ({ key: p.oid, label: this.placeName({ en: p.name_en, bn: p.name_bn }), first: rated(p.cod_failed, p.cod_dispatched), second: rated(p.advance_failed, p.advance_dispatched), firstNote: of(p.cod_failed, p.cod_dispatched), secondNote: of(p.advance_failed, p.advance_dispatched) }))
            .filter((row) => row.first !== null || row.second !== null);
    });

    readonly risk = computed(() => {
        const rows = this.flow()?.risk ?? [];
        return RISK_ORDER.map((shown) => rows.find((r) => r.shown === shown))
            .filter((r) => !!r)
            .map((r) => ({ ...r, refusal: this.rate(r.failed, r.kept + r.failed), warned: r.shown === 'blocked' || r.shown === 'watch' || r.shown === 'under_80' }));
    });

    readonly speed = computed(() => {
        const s = this.flow()?.speed;
        if (!s) return [];
        return [
            { key: 'toConfirm', hours: s.to_confirm },
            { key: 'toDispatch', hours: s.to_dispatch },
            { key: 'toDeliver', hours: s.to_deliver },
        ];
    });

    readonly slowest = computed(() => {
        const rows = this.flow()?.speed_by_place ?? [];
        const widest = Math.max(1, ...rows.map((r) => r.to_deliver));
        return rows.map((r) => ({ key: r.oid, name: this.placeName({ en: r.name_en, bn: r.name_bn }), hours: r.to_deliver, delivered: r.delivered, width: (r.to_deliver / widest) * 100 }));
    });

    /** Each sentence's params made readable: a place in the language on screen, a key translated. */
    readonly insights = computed(() => {
        const flow = this.flow();
        this.language();
        if (!flow) return {} as Record<keyof OrderFlow['insights'], { key: string; params: Record<string, string | number> } | null>;
        const said = (insight: Insight | null) => (insight ? { key: `sales.analytics.insight.orders.${insight.key}`, params: this.params(insight) } : null);
        return { funnel: said(flow.insights.funnel), confirming: said(flow.insights.confirming), terms: said(flow.insights.terms), places: said(flow.insights.places), risk: said(flow.insights.risk) };
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

    pick(grouping: Grouping): void {
        this.grouping.set(grouping);
    }

    hours(value: number | null): string {
        if (value === null) return '-';
        const number = (n: number) => this._money.transform(n, 'number');
        return value >= 48 ? this._translate.instant('sales.analytics.orders.speed.days', { days: number(Math.round((value / 24) * 10) / 10) }) : this._translate.instant('sales.analytics.orders.speed.hours', { hours: number(value) });
    }

    private load(query: SalesAnalyticsQuery): void {
        this._load?.unsubscribe();
        this.loading.set(true);
        this.failed.set(null);
        // Old figures never stand under new filters: every card goes back to its skeleton.
        this.flow.set(null);
        this._load = this._analytics.orders(query).subscribe({
            next: (flow) => {
                this.applies.set(flow !== null);
                this.flow.set(flow);
                this.loading.set(false);
            },
            error: (error: unknown) => {
                this.loading.set(false);
                this.failed.set(failureOf(error));
            },
        });
    }

    private rate(part: number, whole: number): Rate {
        return rateOf(part, whole, (n) => this._money.transform(n, 'number'));
    }

    private placeName(name: PlaceName): string {
        return this.language() === 'bn' ? name.bn : name.en;
    }

    private params(insight: Insight): Record<string, string | number> {
        return insightParams(insight, this.language(), this._translate, (n) => this._money.transform(n, 'number'));
    }
}
