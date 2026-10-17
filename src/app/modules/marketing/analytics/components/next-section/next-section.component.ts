import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject, input, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideClock, lucideHandshake, lucideLightbulb, lucideRotateCw, lucideShapes, lucideTrendingUp, lucideUsers } from '@ng-icons/lucide';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { TranslatePipe } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { RequestFailure } from '@app/core/models/api.model';
import { MarketingNext } from '@app/core/models/marketing-analytics.model';
import { SalesAnalyticsQuery } from '@app/core/models/sales-analytics.model';
import { LanguageService } from '@app/core/services/language/language.service';
import { SessionService } from '@app/core/services/session/session.service';
import { MarketingAnalyticsService } from '@app/modules/marketing/analytics/services/marketing-analytics.service';
import { PRODUCT_ROUTES } from '@app/modules/configuration/product/constants/product-routes';
import { PARTNER_ROUTES } from '@app/modules/marketing/partner/constants/partner-routes';
import { DigitsPipe } from '@app/shared/pipes/digits/digits.pipe';
import { MoneyPipe } from '@app/shared/pipes/money/money.pipe';
import { failureOf } from '@app/shared/utils/request-failure/request-failure';

@Component({
    selector: 'next-section',
    imports: [RouterLink, NgIcon, NzButtonModule, NzCardModule, NzSkeletonModule, TranslatePipe, DigitsPipe, MoneyPipe],
    providers: [provideIcons({ lucideClock, lucideHandshake, lucideLightbulb, lucideRotateCw, lucideShapes, lucideTrendingUp, lucideUsers })],
    templateUrl: './next-section.component.html',
    styleUrl: './next-section.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NextSectionComponent {
    private readonly _analytics = inject(MarketingAnalyticsService);
    private readonly _session = inject(SessionService);
    readonly language = inject(LanguageService).current;
    readonly query = input.required<SalesAnalyticsQuery>();
    readonly canOpenProduct = this._session.can('configuration.product.view');
    readonly canOpenPartner = this._session.can('marketing.partner.view');
    readonly productRoute = PRODUCT_ROUTES.detail;
    readonly partnerRoute = PARTNER_ROUTES.detail;
    readonly icons = { rising: 'lucideTrendingUp', type: 'lucideShapes', partner: 'lucideHandshake', audience: 'lucideUsers', arrivals: 'lucideClock' } as const;

    readonly data = signal<MarketingNext | null>(null);
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
        this._load = this._analytics.next(query).subscribe({ next: (data) => this.data.set(data), error: (error: unknown) => this.failed.set(failureOf(error)) });
    }

    /** The server counts weekdays from Sunday 0; 4 January 2026 was a Sunday. */
    weekday(day: number): string {
        return new Intl.DateTimeFormat(this.language() === 'bn' ? 'bn-BD' : 'en-GB', { weekday: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(2026, 0, 4 + day)));
    }

    hour(hour: number): string {
        return new Intl.DateTimeFormat(this.language() === 'bn' ? 'bn-BD' : 'en-GB', { hour: 'numeric', hour12: true, timeZone: 'UTC' }).format(new Date(Date.UTC(2026, 0, 4, hour)));
    }

    districts(list: { name_en: string; name_bn: string }[]): string {
        return list.map((d) => (this.language() === 'bn' ? d.name_bn : d.name_en)).join(', ');
    }
}
