import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { LanguageService } from '@app/core/services/language/language.service';
import { hourLabel } from '@app/shared/utils/hour-label/hour-label';
import { localDigits } from '@app/shared/utils/local-digits/local-digits';

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);
/** ISO weekdays, Saturday first: the working week of a business in Bangladesh starts on Saturday. */
const DAYS = [6, 7, 1, 2, 3, 4, 5];
const SHADES = ['bg-line-soft', 'bg-primary/15', 'bg-primary/35', 'bg-primary/60', 'bg-primary'];

/** One cell: an ISO weekday (Monday 1 to Sunday 7), an hour on the business's clock, and its count. */
export interface WeekCell {
    day: number;
    hour: number;
    count: number;
}

/**
 * Every weekday by every hour, each cell shaded against the busiest one, so the shape of a week shows
 * at a glance. Weekday names come from the reader's language; the tooltip sentence is a copy key
 * taking day, from, to and count.
 */
@Component({
    selector: 'week-heatmap',
    imports: [NzTooltipModule, TranslatePipe],
    templateUrl: './week-heatmap.component.html',
    styleUrl: './week-heatmap.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WeekHeatmapComponent {
    private readonly _translate = inject(TranslateService);
    private readonly _language = inject(LanguageService).current;

    readonly cells = input.required<readonly WeekCell[]>();
    readonly cellKey = input.required<string>();
    /** A copy key naming the chart for a screen reader. */
    readonly label = input.required<string>();
    readonly rowHeight = input<number | null>(null);

    readonly marks = [0, 6, 12, 18];

    readonly rows = computed(() => {
        const language = this._language();
        const counts = new Map(this.cells().map((cell) => [`${cell.day}-${cell.hour}`, cell.count]));
        const busiest = Math.max(1, ...this.cells().map((cell) => cell.count));
        return DAYS.map((day) => {
            const label = this.weekday(day, language);
            return {
                day,
                label,
                cells: HOURS.map((hour) => {
                    const count = counts.get(`${day}-${hour}`) ?? 0;
                    const shade = count ? SHADES[Math.min(4, Math.ceil((count / busiest) * 4))] : SHADES[0];
                    return { hour, count, shade, tip: this._translate.instant(this.cellKey(), { day: label, from: this.clock(hour), to: this.clock((hour + 1) % 24), count: localDigits(String(count), language) }) };
                }),
            };
        });
    });

    /** 9 am, 12 pm, in the reader's language and digits. */
    clock(hour: number): string {
        return hourLabel(hour, this._language());
    }

    /** 5 January 2026 was a Monday, so day n of that week is the ISO weekday n. */
    private weekday(day: number, language: string): string {
        return new Intl.DateTimeFormat(language === 'bn' ? 'bn-BD' : 'en-GB', { weekday: 'short', timeZone: 'UTC' }).format(new Date(Date.UTC(2026, 0, 4 + day)));
    }
}
