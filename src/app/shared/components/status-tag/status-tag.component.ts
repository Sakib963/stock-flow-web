import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { Text, Tone } from '@app/core/models/config.model';
import { LIST_ICONS, isListIcon } from '@app/shared/constants/list-icons';
import { TextPipe } from '@app/shared/pipes/text/text.pipe';

const TONES: Record<Tone, string> = {
    success: 'bg-success-bg border-success-border text-success-ink',
    warning: 'bg-warning-bg border-warning-border text-warning-ink',
    danger: 'bg-danger-bg border-danger-border text-danger-ink',
    progress: 'bg-primary-wash border-progress-border text-primary-8',
    neutral: 'bg-n-100 border-n-200 text-n-600',
};

const SIZES = {
    compact: 'h-4.75 px-1.5 text-[11px]',
    standard: 'h-5.75 px-2 text-xs',
};

/**
 * A state, anywhere: a table cell, beside a record title, on a detail page or a dashboard tile.
 *
 * It knows no statuses. Whoever shows a status maps its value to a label, tone and icon, usually
 * through a ToneMap and `resolveTone`, so a new status never needs a change here. Never clickable.
 */
@Component({
    selector: 'status-tag',
    imports: [NzTagModule, NgIcon, TextPipe],
    providers: [provideIcons(LIST_ICONS)],
    templateUrl: './status-tag.component.html',
    styleUrl: './status-tag.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusTagComponent {
    readonly label = input.required<Text>();
    readonly tone = input<Tone>('neutral');
    readonly icon = input<string | null | undefined>(null);
    readonly size = input<'compact' | 'standard'>('compact');

    readonly classes = computed(() => `${TONES[this.tone()] ?? TONES.neutral} ${SIZES[this.size()]}`);
    readonly glyph = computed(() => (isListIcon(this.icon()) ? this.icon() : null));
    readonly glyphSize = computed(() => (this.size() === 'compact' ? '11px' : '13px'));
}
