import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideMegaphone, lucideRotateCw } from '@ng-icons/lucide';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzTableModule } from 'ng-zorro-antd/table';
import { TranslatePipe } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { RequestFailure } from '@app/core/models/api.model';
import { MarketingSources } from '@app/core/models/marketing-analytics.model';
import { SalesAnalyticsQuery } from '@app/core/models/sales-analytics.model';
import { MarketingAnalyticsService } from '@app/modules/marketing/analytics/services/marketing-analytics.service';
import { RATE_FLOOR } from '@app/modules/sales/analytics/constants/sales-analytics';
import { DigitsPipe } from '@app/shared/pipes/digits/digits.pipe';
import { MoneyPipe } from '@app/shared/pipes/money/money.pipe';
import { failureOf } from '@app/shared/utils/request-failure/request-failure';

/** Which page brought orders that stuck, and which brought orders that fell through (REQ-02). */
@Component({
    selector: 'sources-section',
    imports: [NgIcon, NzButtonModule, NzCardModule, NzSkeletonModule, NzTableModule, TranslatePipe, DigitsPipe, MoneyPipe],
    providers: [provideIcons({ lucideMegaphone, lucideRotateCw })],
    templateUrl: './sources-section.component.html',
    styleUrl: './sources-section.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SourcesSectionComponent {
    private readonly _analytics = inject(MarketingAnalyticsService);
    readonly query = input.required<SalesAnalyticsQuery>();
    readonly floor = RATE_FLOOR;

    readonly data = signal<MarketingSources | null>(null);
    readonly failed = signal<RequestFailure | null>(null);
    private _load?: Subscription;

    /** A rate only over enough orders to mean something (REQ-01); under that, the count. */
    readonly rows = computed(() => {
        const sources = this.data()?.sources ?? [];
        const widest = Math.max(1, ...sources.map((s) => s.sales));
        const rate = (part: number, of: number) => (of >= RATE_FLOOR ? { percent: Math.round((part / of) * 100), count: part, of } : { percent: null, count: part, of });
        return sources.map((s) => ({ ...s, width: (s.sales / widest) * 100, cancelRate: rate(s.cancelled, s.placed), refusalRate: rate(s.refused, s.placed - s.cancelled), average: s.sold ? Math.round(s.sales / s.sold) : null }));
    });

    constructor() {
        inject(DestroyRef).onDestroy(() => this._load?.unsubscribe());
        effect(() => {
            const query = this.query();
            untracked(() => this.load(query));
        });
    }

    load(query: SalesAnalyticsQuery = this.query()): void {
        this._load?.unsubscribe();
        this.failed.set(null);
        this.data.set(null);
        this._load = this._analytics.sources(query).subscribe({ next: (data) => this.data.set(data), error: (error: unknown) => this.failed.set(failureOf(error)) });
    }
}
