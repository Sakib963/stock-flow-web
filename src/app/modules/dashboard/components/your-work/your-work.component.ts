import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideActivity, lucideCircleDot, lucideHistory, lucideSettings2, lucideShieldCheck, lucideShoppingBag, lucideStore, lucideWarehouse } from '@ng-icons/lucide';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { YourWork } from '@app/core/models/dashboard.model';
import { LanguageService } from '@app/core/services/language/language.service';
import { SessionService } from '@app/core/services/session/session.service';
import { AREA_STYLE, RECORD_LINK } from '@app/modules/activity-log/constants/activity-kinds';
import { WeekHeatmapComponent } from '@app/shared/components/charts/week-heatmap/week-heatmap.component';
import { DigitsPipe } from '@app/shared/pipes/digits/digits.pipe';
import { RecordDatePipe } from '@app/shared/pipes/record-date/record-date.pipe';

@Component({
    selector: 'your-work',
    imports: [NgTemplateOutlet, RouterLink, NgIcon, NzCardModule, NzTooltipModule, TranslatePipe, DigitsPipe, RecordDatePipe, WeekHeatmapComponent],
    providers: [provideIcons({ lucideActivity, lucideCircleDot, lucideHistory, lucideSettings2, lucideShieldCheck, lucideShoppingBag, lucideStore, lucideWarehouse })],
    templateUrl: './your-work.component.html',
    styleUrl: './your-work.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class YourWorkComponent {
    private readonly _session = inject(SessionService);
    private readonly _translate = inject(TranslateService);
    readonly language = inject(LanguageService).current;

    readonly work = input.required<YourWork>();

    readonly stats = computed(() => (['today', 'active_days', 'streak'] as const).map((key) => ({ key, value: this.work()[key] })));

    readonly busiest = computed(() => {
        const top = [...this.work().week].sort((a, b) => b.count - a.count)[0];
        if (!top) return null;
        const locale = this.language() === 'bn' ? 'bn-BD' : 'en-GB';
        // 1 January 2024 was a Monday, so ISO weekday n falls on the nth.
        const day = new Intl.DateTimeFormat(locale, { weekday: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(2024, 0, top.day)));
        const hour = new Intl.DateTimeFormat(locale, { hour: 'numeric', hour12: true, timeZone: 'UTC' }).format(new Date(Date.UTC(2024, 0, 1, top.hour)));
        return this._translate.instant('dashboard.work.busiest', { day, hour });
    });

    readonly recent = computed(() =>
        this.work().recent.map((entry) => {
            const target = RECORD_LINK[entry.reference_type];
            const link = target && entry.record_exists && this._session.can(target.permission) ? target.route.replace(':oid', entry.reference_oid) : null;
            return { ...entry, icon: AREA_STYLE[entry.area].icon, link };
        })
    );
}
