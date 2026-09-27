import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideBellOff, lucideCircleCheck, lucideEyeOff, lucideFactory, lucideFolder, lucideFolderTree, lucideGauge, lucideHistory, lucideImageOff, lucideListChecks, lucidePackage, lucideRotateCw, lucideRows3, lucideChartBar, lucideTag, lucideWarehouse } from '@ng-icons/lucide';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzCollapseModule } from 'ng-zorro-antd/collapse';
import { NzProgressModule } from 'ng-zorro-antd/progress';
import { NzSegmentedModule } from 'ng-zorro-antd/segmented';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzTimelineModule } from 'ng-zorro-antd/timeline';
import { TranslatePipe } from '@ngx-translate/core';
import { RequestFailure } from '@app/core/models/api.model';
import { AttentionCheck, ConfigurationAnalytics, ConfigurationChange, SpreadGroup } from '@app/core/models/configuration-analytics.model';
import { LanguageService } from '@app/core/services/language/language.service';
import { ANALYTICS_TILES, ATTENTION_CHECKS, CHANGE_ROUTES, CONCENTRATED_SHARE, SPREAD_GROUPS, SPREAD_ROUTES } from '@app/modules/configuration/analytics/constants/analytics-routes';
import { WAREHOUSE_ROUTES } from '@app/modules/configuration/warehouse/constants/warehouse-routes';
import { ConfigurationAnalyticsService } from '@app/modules/configuration/analytics/services/configuration-analytics.service';
import { PageHeaderComponent } from '@app/shared/components/page-header/page-header.component';
import { DigitsPipe } from '@app/shared/pipes/digits/digits.pipe';
import { MoneyPipe } from '@app/shared/pipes/money/money.pipe';
import { RecordDatePipe } from '@app/shared/pipes/record-date/record-date.pipe';
import { failureOf } from '@app/shared/utils/request-failure/request-failure';

/**
 * How the catalogue is set up, never how it sells. Every block leads to something the owner can fix
 * or decide; a number that leads nowhere is not on this page.
 */
@Component({
    selector: 'configuration-analytics',
    imports: [FormsModule, RouterLink, NgIcon, NzButtonModule, NzCardModule, NzCollapseModule, NzProgressModule, NzSegmentedModule, NzSkeletonModule, NzTimelineModule, TranslatePipe, PageHeaderComponent, DigitsPipe, MoneyPipe, RecordDatePipe],
    providers: [provideIcons({ lucideBellOff, lucideCircleCheck, lucideEyeOff, lucideFactory, lucideFolder, lucideFolderTree, lucideGauge, lucideHistory, lucideImageOff, lucideListChecks, lucidePackage, lucideRotateCw, lucideRows3, lucideChartBar, lucideTag, lucideWarehouse })],
    templateUrl: './configuration-analytics.component.html',
    styleUrl: './configuration-analytics.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfigurationAnalyticsComponent {
    private readonly _analytics = inject(ConfigurationAnalyticsService);

    readonly language = inject(LanguageService).current;
    readonly checks = ATTENTION_CHECKS;
    readonly spreadRoutes = SPREAD_ROUTES;
    readonly warehouseRoute = WAREHOUSE_ROUTES.detail;

    readonly data = signal<ConfigurationAnalytics | null>(null);
    readonly loading = signal(true);
    readonly failed = signal<RequestFailure | null>(null);

    readonly tiles = computed(() => {
        const counts = this.data()?.counts;
        if (!counts) return [];
        return ANALYTICS_TILES.filter((tile) => counts[tile.feature]).map((tile) => ({
            ...tile,
            count: counts[tile.feature]!,
            childCount: tile.child ? (counts[tile.child] ?? null) : null,
        }));
    });

    /** What needs fixing, biggest first, then what is already fine. */
    readonly toFix = computed(() => (this.data()?.attention ?? []).filter((c) => c.total > 0).sort((a, b) => b.total - a.total));
    readonly clear = computed(() => (this.data()?.attention ?? []).filter((c) => c.total === 0));

    readonly groups = computed(() => SPREAD_GROUPS.filter((g) => this.data()?.spread[g]));
    private readonly _picked = signal<SpreadGroup | null>(null);
    readonly group = computed(() => {
        const picked = this._picked();
        return picked && this.groups().includes(picked) ? picked : (this.groups()[0] ?? null);
    });

    readonly spread = computed(() => {
        const group = this.group();
        const spread = group ? this.data()?.spread[group] : null;
        if (!group || !spread || !spread.total) return null;
        const share = (products: number) => Math.round((products / spread.total) * 100);
        const top = spread.rows[0];
        return {
            group,
            rows: spread.rows.map((row) => ({ ...row, share: share(row.products) })),
            other: spread.other ? { ...spread.other, share: share(spread.other.products) } : null,
            // The biggest bar sets the scale, so a catalogue of evenly sized groups does not draw as a row of stubs.
            widest: Math.max(...spread.rows.map((r) => r.products), spread.other?.products ?? 0),
            headline: { key: `configuration.analytics.spread.${share(top.products) < CONCENTRATED_SHARE ? 'even' : top.oid ? 'concentrated' : 'unbranded'}.${group}`, name: top.name, share: share(top.products) },
        };
    });

    constructor() {
        this.load();
    }

    load(): void {
        this.loading.set(true);
        this.failed.set(null);
        this._analytics.read().subscribe({
            next: (data) => {
                this.data.set(data);
                this.loading.set(false);
            },
            error: (error: unknown) => {
                this.loading.set(false);
                this.failed.set(failureOf(error));
            },
        });
    }

    pick(group: SpreadGroup): void {
        this._picked.set(group);
    }

    width(products: number, widest: number): number {
        return widest ? Math.max((products / widest) * 100, 2) : 0;
    }

    /** Past three quarters full is worth a glance, past nine tenths is a problem. */
    fullnessTone(rate: number): 'danger' | 'warning' | 'primary' {
        if (rate >= 90) return 'danger';
        if (rate >= 75) return 'warning';
        return 'primary';
    }

    more(check: AttentionCheck): number {
        return check.total - check.items.length;
    }

    changeRoute(change: ConfigurationChange): string | null {
        return CHANGE_ROUTES[change.type]?.detail(change.recordOid) ?? null;
    }
}
