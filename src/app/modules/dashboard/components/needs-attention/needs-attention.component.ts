import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCalendarClock, lucideCalendarX, lucideChevronRight, lucideCircleAlert, lucideCircleCheck, lucideCircleX, lucideClipboardCheck, lucideClipboardList, lucideInbox, lucideMegaphone, lucidePackage, lucidePackageCheck, lucideScale, lucideTrash2, lucideTruck, lucideUndo2 } from '@ng-icons/lucide';
import { NzCardModule } from 'ng-zorro-antd/card';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { AttentionKey, AttentionRow } from '@app/core/models/dashboard.model';
import { LanguageService } from '@app/core/services/language/language.service';
import { ATTENTION } from '@app/modules/dashboard/constants/dashboard';
import { DigitsPipe } from '@app/shared/pipes/digits/digits.pipe';
import { RecordDatePipe } from '@app/shared/pipes/record-date/record-date.pipe';
import { localDigits } from '@app/shared/utils/local-digits/local-digits';

const ORDER = Object.keys(ATTENTION) as AttentionKey[];

const TONE: Record<string, string> = {
    neutral: 'bg-surface-sunken text-ink-muted',
    warning: 'bg-warning-bg text-warning-ink',
    danger: 'bg-danger-bg text-danger-ink',
};

@Component({
    selector: 'needs-attention',
    imports: [RouterLink, NgIcon, NzCardModule, TranslatePipe, DigitsPipe],
    providers: [
        RecordDatePipe,
        provideIcons({
            lucideCalendarClock,
            lucideCalendarX,
            lucideChevronRight,
            lucideCircleAlert,
            lucideCircleCheck,
            lucideCircleX,
            lucideClipboardCheck,
            lucideClipboardList,
            lucideInbox,
            lucideMegaphone,
            lucidePackage,
            lucidePackageCheck,
            lucideScale,
            lucideTrash2,
            lucideTruck,
            lucideUndo2,
        }),
    ],
    templateUrl: './needs-attention.component.html',
    styleUrl: './needs-attention.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NeedsAttentionComponent {
    private readonly _translate = inject(TranslateService);
    private readonly _dates = inject(RecordDatePipe);
    private readonly _language = inject(LanguageService).current;

    readonly rows = input.required<AttentionRow[]>();

    readonly items = computed(() =>
        [...this.rows()]
            .sort((a, b) => ORDER.indexOf(a.key) - ORDER.indexOf(b.key))
            .map((row) => {
                const link = ATTENTION[row.key];
                return { ...row, ...link, toneClass: TONE[link.tone], hint: this.hintOf(row), state: link.filters ? { filters: link.filters } : undefined };
            })
    );

    /** The one detail that says how urgent a row is: how long the oldest has waited, or what part of it is worse. */
    private hintOf(row: AttentionRow): string | null {
        const t = (key: string, params: object) => localDigits(this._translate.instant(key, params), this._language());
        if (row.key === 'returns_to_confirm' && row.parcels) return t('dashboard.attention.hint.parcels', { count: row.parcels });
        if (row.key === 'expiring' && row.expired) return t('dashboard.attention.hint.expired', { count: row.expired });
        if (row.oldest_day) return t('dashboard.attention.hint.dueSince', { date: this._dates.transform(row.oldest_day, this._language(), 'date') });
        if (row.oldest_on) return t('dashboard.attention.hint.oldest', { when: this._dates.transform(row.oldest_on, this._language(), 'relative') });
        return null;
    }
}
