import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
    lucideActivity,
    lucideArrowUpRight,
    lucideCircleDot,
    lucideClock,
    lucideMapPin,
    lucideMonitor,
    lucideRotateCw,
    lucideSettings2,
    lucideShieldCheck,
    lucideShoppingBag,
    lucideSmartphone,
    lucideStore,
    lucideTablet,
    lucideTriangleAlert,
    lucideUsers,
    lucideWarehouse,
} from '@ng-icons/lucide';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { ActivityArea, ActivityEntry, ActivitySummary } from '@app/core/models/activity-log.model';
import { RequestFailure } from '@app/core/models/api.model';
import { FilterConfig, FilterValues } from '@app/core/models/filter.model';
import { LanguageService } from '@app/core/services/language/language.service';
import { SessionService } from '@app/core/services/session/session.service';
import { ActivityHeatmapComponent } from '@app/modules/activity-log/components/activity-heatmap/activity-heatmap.component';
import { AREAS, AREA_STYLE, RECORD_LINK } from '@app/modules/activity-log/constants/activity-kinds';
import { ActivityLogService } from '@app/modules/activity-log/services/activity-log.service';
import { FilterComponent } from '@app/shared/components/filter/filter.component';
import { PageHeaderComponent } from '@app/shared/components/page-header/page-header.component';
import { DigitsPipe } from '@app/shared/pipes/digits/digits.pipe';
import { RecordDatePipe } from '@app/shared/pipes/record-date/record-date.pipe';
import { addDays, businessDay, businessToday, toMoment } from '@app/shared/utils/business-time/business-time';
import { failureOf } from '@app/shared/utils/request-failure/request-failure';
import { isPhoneWidth, viewportWidth } from '@app/shared/utils/viewport/viewport';

const PAGE = 30;
const SEARCH_SETTLE_MS = 400;

/**
 * Everything the team did, as it happened: the owner's view of the business. The period at a glance
 * on top (how much, who, the busiest hour, what is worth a second look), the feed by day with who,
 * what, where it was done from and the record to open, and beside it when the team works, who did
 * how much and in which part of the business. Every number on the side is also a filter.
 */
@Component({
    selector: 'activity-log',
    imports: [RouterLink, NgIcon, NzAvatarModule, NzButtonModule, NzCardModule, NzPaginationModule, NzSkeletonModule, NzTagModule, NzTooltipModule, TranslatePipe, DigitsPipe, RecordDatePipe, ActivityHeatmapComponent, FilterComponent, PageHeaderComponent],
    providers: [
        provideIcons({
            lucideActivity,
            lucideArrowUpRight,
            lucideCircleDot,
            lucideClock,
            lucideMapPin,
            lucideMonitor,
            lucideRotateCw,
            lucideSettings2,
            lucideShieldCheck,
            lucideShoppingBag,
            lucideSmartphone,
            lucideStore,
            lucideTablet,
            lucideTriangleAlert,
            lucideUsers,
            lucideWarehouse,
        }),
    ],
    templateUrl: './activity-log.component.html',
    styleUrl: './activity-log.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActivityLogComponent {
    private readonly _activity = inject(ActivityLogService);
    private readonly _session = inject(SessionService);
    private readonly _translate = inject(TranslateService);
    readonly language = inject(LanguageService).current;

    readonly isPhone = isPhoneWidth(viewportWidth());
    readonly areaStyle = AREA_STYLE;

    /** The last seven days by default: enough to see a working week, small enough to read. */
    readonly filters = signal<FilterValues>({ date_from: addDays(businessToday(), -6), date_to: businessToday() });
    readonly search = signal('');
    private readonly _settledSearch = signal('');
    private readonly query = computed<FilterValues>(() => ({ ...this.filters(), search: this._settledSearch() || null }));

    readonly entries = signal<ActivityEntry[]>([]);
    readonly pageIndex = signal(1);
    readonly total = signal(0);
    readonly pageSize = PAGE;
    readonly loadingFeed = signal(true);
    readonly feedFailed = signal<RequestFailure | null>(null);
    readonly summary = signal<ActivitySummary | null>(null);
    readonly summaryFailed = signal<RequestFailure | null>(null);

    private _feed?: Subscription;
    private _sum?: Subscription;

    /** The filter's fields; the person choices are the people the period's summary found. */
    readonly filterConfig = computed<FilterConfig>(() => ({
        render: 'row',
        search: { placeholder: 'activityLog.searchPlaceholder' },
        fields: [
            { key: 'when', label: 'activityLog.when', type: 'date-range', fromKey: 'date_from', toKey: 'date_to', presets: ['today', 'yesterday', 'last-7-days', 'last-30-days', 'this-month', 'last-month'], max: 'today' },
            { key: 'person', label: 'activityLog.person', type: 'select', choices: (this.summary()?.people ?? []).map((person) => ({ value: person.email, label: person.name || person.email })) },
            { key: 'area', label: 'activityLog.area', type: 'multi-select', choices: AREAS.map((area) => ({ value: area, label: `activityLog.areas.${area}` })) },
            { key: 'attention', label: 'activityLog.onlyAttention', type: 'toggle' },
        ],
    }));

    /** The feed by business day, each day headed Today, Yesterday or its date. */
    readonly days = computed(() => {
        const today = businessToday();
        const groups: { day: string; label: string | null; labelKey: string | null; entries: ActivityEntry[] }[] = [];
        for (const entry of this.entries()) {
            const day = businessDay(toMoment(entry.performed_on));
            let group = groups.at(-1);
            if (group?.day !== day) {
                const labelKey = day === today ? 'activityLog.today' : day === addDays(today, -1) ? 'activityLog.yesterday' : null;
                group = { day, label: labelKey ? null : day, labelKey, entries: [] };
                groups.push(group);
            }
            group.entries.push(entry);
        }
        return groups;
    });

    readonly topPeople = computed(() => (this.summary()?.people ?? []).slice(0, 4));
    readonly mostActions = computed(() => Math.max(1, ...(this.summary()?.people ?? []).map((person) => person.actions)));
    readonly mostInArea = computed(() => Math.max(1, ...(this.summary()?.areas ?? []).map((area) => area.actions)));
    readonly onlyAttention = computed(() => this.filters()['attention'] === 'true');

    constructor() {
        const destroy = inject(DestroyRef);
        destroy.onDestroy(() => {
            this._feed?.unsubscribe();
            this._sum?.unsubscribe();
        });
        // Typing waits until the person pauses, so a search is one request, not one per key.
        let timer: ReturnType<typeof setTimeout> | undefined;
        effect(() => {
            const term = this.search();
            clearTimeout(timer);
            timer = setTimeout(() => this._settledSearch.set(term.trim()), SEARCH_SETTLE_MS);
        });
        destroy.onDestroy(() => clearTimeout(timer));
        effect(() => {
            const query = this.query();
            untracked(() => this.load(query));
        });
    }

    reload(): void {
        this.loadPage(this.query());
    }

    /** Another page of the same filters; the cards on top already count all of them. */
    goTo(index: number): void {
        this.pageIndex.set(index);
        this.loadPage(this.query());
        document.querySelector('[data-activity="feed"]')?.scrollIntoView({ block: 'start' });
    }

    /** A number on the side narrows the feed to it; pressing the one already chosen lets go. */
    filterBy(key: 'person' | 'area' | 'attention', value: string): void {
        const current = this.filters()[key];
        this.filters.update((filters) => ({ ...filters, [key]: current === value ? null : value }));
    }

    /** The record's page, when it still exists and the person may open it. */
    linkOf(entry: ActivityEntry): string | null {
        const link = RECORD_LINK[entry.reference_type];
        if (!link || !entry.record_exists || !this._session.can(link.permission)) return null;
        return link.route.replace(':oid', entry.reference_oid);
    }

    nameOf(entry: { performed_by_name?: string | null; name?: string | null; performed_by?: string; email?: string }): string {
        return entry.performed_by_name ?? entry.name ?? entry.performed_by ?? entry.email ?? '';
    }

    initialsOf(name: string): string {
        const parts = name.replace(/@.*/, '').trim().split(/[\s._-]+/).filter(Boolean);
        return ((parts[0]?.[0] ?? '?') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
    }

    deviceIcon(entry: ActivityEntry): string {
        const type = entry.device?.type;
        return type === 'phone' ? 'lucideSmartphone' : type === 'tablet' ? 'lucideTablet' : 'lucideMonitor';
    }

    deviceLabel(entry: ActivityEntry): string | null {
        const device = entry.device;
        if (!device?.browser && !device?.os) return null;
        if (!device.browser || !device.os) return device.browser || device.os || null;
        return this._translate.instant('activityLog.device', { browser: device.browser, os: device.os });
    }

    /** 5 pm to 6 pm, on the business's clock, in the reader's language. */
    hourSpan(hour: number): string {
        const clock = (h: number) => new Intl.DateTimeFormat(this.language() === 'bn' ? 'bn-BD' : 'en-GB', { hour: 'numeric', hour12: true, timeZone: 'UTC' }).format(new Date(Date.UTC(2026, 0, 1, h)));
        return this._translate.instant('activityLog.hourSpan', { from: clock(hour), to: clock((hour + 1) % 24) });
    }

    areaLabel(area: ActivityArea): string {
        return 'activityLog.areas.' + area;
    }

    reloadSummary(): void {
        this.loadSummary(this.query());
    }

    private load(query: FilterValues): void {
        this.pageIndex.set(1);
        this.loadPage(query);
        this.loadSummary(query);
    }

    private loadSummary(query: FilterValues): void {
        this._sum?.unsubscribe();
        this.summary.set(null);
        this.summaryFailed.set(null);
        this._sum = this._activity.summary(query).subscribe({
            next: (summary) => this.summary.set(summary),
            error: (error: unknown) => this.summaryFailed.set(failureOf(error)),
        });
    }

    private loadPage(query: FilterValues): void {
        this._feed?.unsubscribe();
        this.loadingFeed.set(true);
        this.feedFailed.set(null);
        this._feed = this._activity.page(query, (this.pageIndex() - 1) * PAGE, PAGE).subscribe({
            next: (page) => {
                this.entries.set(page.rows);
                this.total.set(page.total);
                this.loadingFeed.set(false);
            },
            error: (error: unknown) => {
                this.entries.set([]);
                this.loadingFeed.set(false);
                this.feedFailed.set(failureOf(error));
            },
        });
    }
}
