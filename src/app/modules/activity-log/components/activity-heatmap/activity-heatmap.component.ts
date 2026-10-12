import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { LanguageService } from '@app/core/services/language/language.service';
import { localDigits } from '@app/shared/utils/local-digits/local-digits';

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);
/** ISO weekdays, Saturday first: the working week of a business in Bangladesh starts on Saturday. */
const DAYS = [6, 7, 1, 2, 3, 4, 5];
const SHADES = ['bg-line-soft', 'bg-primary/15', 'bg-primary/35', 'bg-primary/60', 'bg-primary'];

/**
 * When the team works: every weekday by every hour on the business's clock, each cell shaded by how
 * much was done in it against the busiest cell, so the shape of a working week shows at a glance.
 */
@Component({
    selector: 'activity-heatmap',
    imports: [NzTooltipModule, TranslatePipe],
    templateUrl: './activity-heatmap.component.html',
    styleUrl: './activity-heatmap.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActivityHeatmapComponent {
    private readonly _translate = inject(TranslateService);
    private readonly _language = inject(LanguageService).current;

    readonly week = input.required<readonly { day: number; hour: number; actions: number }[]>();

    readonly hours = HOURS;
    readonly marks = [0, 6, 12, 18];

    readonly rows = computed(() => {
        this._language();
        const counts = new Map(this.week().map((cell) => [`${cell.day}-${cell.hour}`, cell.actions]));
        const busiest = Math.max(1, ...this.week().map((cell) => cell.actions));
        return DAYS.map((day) => ({
            day,
            label: this._translate.instant(`activityLog.days.${day}`),
            cells: HOURS.map((hour) => {
                const actions = counts.get(`${day}-${hour}`) ?? 0;
                const shade = actions ? SHADES[Math.min(4, Math.ceil((actions / busiest) * 4))] : SHADES[0];
                return { hour, actions, shade, tip: this._translate.instant('activityLog.heatmap.cell', { day: this._translate.instant(`activityLog.days.${day}`), from: this.clock(hour), to: this.clock((hour + 1) % 24), count: localDigits(String(actions), this._language()) }) };
            }),
        }));
    });

    readonly empty = computed(() => !this.week().some((cell) => cell.actions));

    /** 9 am, 12 pm, in the reader's language and digits. */
    clock(hour: number): string {
        const label = new Intl.DateTimeFormat(this._language() === 'bn' ? 'bn-BD' : 'en-GB', { hour: 'numeric', hour12: true, timeZone: 'UTC' }).format(new Date(Date.UTC(2026, 0, 1, hour)));
        return label.replace(/\s/g, ' ');
    }
}
