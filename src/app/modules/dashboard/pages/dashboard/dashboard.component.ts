import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideRefreshCw, lucideRotateCw, lucideSparkles } from '@ng-icons/lucide';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzSegmentedModule } from 'ng-zorro-antd/segmented';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { RequestFailure } from '@app/core/models/api.model';
import { AttentionRow, Business, Dashboard, DashboardPeriod, FailedSection, ForYou, StockGlance } from '@app/core/models/dashboard.model';
import { LanguageService } from '@app/core/services/language/language.service';
import { SessionService } from '@app/core/services/session/session.service';
import { BusinessGlanceComponent } from '@app/modules/dashboard/components/business-glance/business-glance.component';
import { StockGlanceComponent } from '@app/modules/dashboard/components/stock-glance/stock-glance.component';
import { ForYouComponent } from '@app/modules/dashboard/components/for-you/for-you.component';
import { NeedsAttentionComponent } from '@app/modules/dashboard/components/needs-attention/needs-attention.component';
import { PERIOD_STORAGE_KEY, QUICK_ACTIONS } from '@app/modules/dashboard/constants/dashboard';
import { DashboardService } from '@app/modules/dashboard/services/dashboard.service';
import { PageHeaderComponent } from '@app/shared/components/page-header/page-header.component';
import { RecordDatePipe } from '@app/shared/pipes/record-date/record-date.pipe';
import { failureOf } from '@app/shared/utils/request-failure/request-failure';

const PERIODS: readonly DashboardPeriod[] = ['today', 'week', 'month'];
/** Coming back to the tab after this long reloads, since the figures carry orders and stock. */
const STALE_AFTER_MS = 60_000;

const isFailed = (section: unknown): section is FailedSection => !!section && typeof section === 'object' && (section as FailedSection).failed === true;

const storedPeriod = (): DashboardPeriod => {
    try {
        const stored = localStorage.getItem(PERIOD_STORAGE_KEY) as DashboardPeriod | null;
        return stored && PERIODS.includes(stored) ? stored : 'today';
    } catch {
        return 'today';
    }
};

/**
 * The first page anyone sees. Every section is decided by the features the person holds, on the
 * server: the page draws what arrives and leaves out what does not.
 */
@Component({
    selector: 'dashboard',
    imports: [NgTemplateOutlet, FormsModule, NgIcon, NzButtonModule, NzCardModule, NzSegmentedModule, NzSkeletonModule, NzTooltipModule, TranslatePipe, PageHeaderComponent, ForYouComponent, NeedsAttentionComponent, BusinessGlanceComponent, StockGlanceComponent],
    providers: [RecordDatePipe, provideIcons({ lucideRefreshCw, lucideRotateCw, lucideSparkles })],
    templateUrl: './dashboard.component.html',
    styleUrl: './dashboard.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent {
    private readonly _dashboard = inject(DashboardService);
    private readonly _translate = inject(TranslateService);
    private readonly _dates = inject(RecordDatePipe);
    readonly session = inject(SessionService);
    readonly language = inject(LanguageService).current;

    readonly periods = PERIODS;
    readonly period = signal<DashboardPeriod>(storedPeriod());
    readonly data = signal<Dashboard | null>(null);
    readonly loading = signal(false);
    readonly failed = signal<RequestFailure | null>(null);
    private _loadedAt = 0;

    readonly greeting = computed(() => {
        this.language();
        const hour = new Date().getHours();
        const part = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
        const first = (this.session.user()?.name ?? '').trim().split(/\s+/)[0] ?? '';
        return this._translate.instant(`dashboard.greeting.${part}`, { name: first });
    });
    readonly lead = computed(() => {
        const today = this._dates.transform(new Date().toISOString(), this.language(), 'date');
        const business = this.session.business()?.name;
        return business ? `${today} · ${business}` : today;
    });

    readonly forYou = computed<ForYou | null>(() => {
        const section = this.data()?.for_you;
        return section && !isFailed(section) ? section : null;
    });
    readonly forYouFailed = computed(() => isFailed(this.data()?.for_you));
    readonly attention = computed<AttentionRow[] | null>(() => {
        const section = this.data()?.attention;
        return section && !isFailed(section) ? section : null;
    });
    readonly attentionFailed = computed(() => isFailed(this.data()?.attention));
    readonly business = computed<Business | null>(() => {
        const section = this.data()?.business;
        return section && !isFailed(section) ? section : null;
    });
    readonly businessFailed = computed(() => isFailed(this.data()?.business));
    readonly stock = computed<StockGlance | null>(() => {
        const section = this.data()?.stock;
        return section && !isFailed(section) ? section : null;
    });
    readonly stockFailed = computed(() => isFailed(this.data()?.stock));

    readonly hasActions = computed(() => QUICK_ACTIONS.some((action) => this.session.can(action.permission)));
    readonly hasLeft = computed(() => !!this.forYou() || this.forYouFailed() || this.hasActions());
    readonly showPeriod = computed(() => !!this.forYou() || !!this.business());
    readonly nothing = computed(() => !!this.data() && !this.hasLeft() && this.attention() === null && !this.attentionFailed() && !this.business() && !this.businessFailed() && !this.stock() && !this.stockFailed());

    constructor() {
        this.load();
        const onVisible = () => {
            if (document.visibilityState === 'visible' && Date.now() - this._loadedAt > STALE_AFTER_MS) this.load();
        };
        document.addEventListener('visibilitychange', onVisible);
        inject(DestroyRef).onDestroy(() => document.removeEventListener('visibilitychange', onVisible));
    }

    pick(period: DashboardPeriod): void {
        if (period === this.period()) return;
        this.period.set(period);
        try {
            localStorage.setItem(PERIOD_STORAGE_KEY, period);
        } catch {
            // Storage blocked: the switch still works for this visit.
        }
        this.load();
    }

    /** Keeps what is on screen while the new figures load, so changing the period never blanks the page. */
    load(): void {
        this.loading.set(true);
        this.failed.set(null);
        this._dashboard.load(this.period()).subscribe({
            next: (data) => {
                this.data.set(data);
                this.loading.set(false);
                this._loadedAt = Date.now();
            },
            error: (error: unknown) => {
                this.loading.set(false);
                this.failed.set(failureOf(error));
            },
        });
    }
}
