import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject, input, signal, untracked } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideHandshake, lucideRotateCw, lucideShapes } from '@ng-icons/lucide';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzTableModule } from 'ng-zorro-antd/table';
import { TranslatePipe } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { RequestFailure } from '@app/core/models/api.model';
import { MarketingComparisons } from '@app/core/models/marketing-analytics.model';
import { SalesAnalyticsQuery } from '@app/core/models/sales-analytics.model';
import { MarketingAnalyticsService } from '@app/modules/marketing/analytics/services/marketing-analytics.service';
import { DigitsPipe } from '@app/shared/pipes/digits/digits.pipe';
import { MoneyPipe } from '@app/shared/pipes/money/money.pipe';
import { failureOf } from '@app/shared/utils/request-failure/request-failure';

/** Which kind of promotion, and which partner, returned the most for what they cost (REQ-10, REQ-11). */
@Component({
    selector: 'comparisons-section',
    imports: [NgIcon, NzButtonModule, NzCardModule, NzSkeletonModule, NzTableModule, TranslatePipe, DigitsPipe, MoneyPipe],
    providers: [provideIcons({ lucideHandshake, lucideRotateCw, lucideShapes })],
    templateUrl: './comparisons-section.component.html',
    styleUrl: './comparisons-section.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComparisonsSectionComponent {
    private readonly _analytics = inject(MarketingAnalyticsService);
    readonly query = input.required<SalesAnalyticsQuery>();

    readonly data = signal<MarketingComparisons | null>(null);
    readonly failed = signal<RequestFailure | null>(null);
    private _load?: Subscription;

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
        this._load = this._analytics.comparisons(query).subscribe({ next: (data) => this.data.set(data), error: (error: unknown) => this.failed.set(failureOf(error)) });
    }
}
