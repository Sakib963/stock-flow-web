import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NzPopoverModule } from 'ng-zorro-antd/popover';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { TranslatePipe } from '@ngx-translate/core';
import { DateFormat, Row, Tone } from '@app/core/models/config.model';
import { Column } from '@app/core/models/table.model';
import { LanguageService } from '@app/core/services/language/language.service';
import { RendererOutletComponent } from '@app/shared/components/renderer-outlet/renderer-outlet.component';
import { StatusTagComponent } from '@app/shared/components/status-tag/status-tag.component';
import { DigitsPipe } from '@app/shared/pipes/digits/digits.pipe';
import { MoneyPipe } from '@app/shared/pipes/money/money.pipe';
import { RecordDatePipe } from '@app/shared/pipes/record-date/record-date.pipe';
import { UserCardComponent } from '@app/shared/components/user-card/user-card.component';
import { NzTypographyModule } from 'ng-zorro-antd/typography';
import { TextPipe } from '@app/shared/pipes/text/text.pipe';
import { fillRoute } from '@app/shared/utils/fill-route/fill-route';
import { readPath } from '@app/shared/utils/read-path/read-path';
import { resolveTone } from '@app/shared/utils/tone-map/tone-map';

const DOT: Record<Tone, string> = {
    success: 'bg-success',
    warning: 'bg-warning',
    danger: 'bg-danger',
    progress: 'bg-primary',
    neutral: 'bg-ink-faint',
};

/**
 * One value, drawn by its column's type, the same in every layout: money is right-aligned tabular
 * taka in a table and on a card alike. A column's type decides alignment, font, truncation and
 * tooltip, so nothing is styled per screen.
 *
 * Anything carrying words shows the whole of it on hover, whether or not the column happened to
 * cut it short: a tooltip that appeared only on an overflowing cell was indistinguishable from
 * one that had never been built.
 */
@Component({
    selector: 'table-cell',
    imports: [NgTemplateOutlet, RouterLink, NzTypographyModule, NzPopoverModule, NzTooltipModule, TranslatePipe, TextPipe, MoneyPipe, DigitsPipe, RecordDatePipe, StatusTagComponent, UserCardComponent, RendererOutletComponent],
    templateUrl: './table-cell.component.html',
    styleUrl: './table-cell.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TableCellComponent {
    readonly language = inject(LanguageService).current;

    readonly column = input.required<Column>();
    readonly row = input.required<Row>();
    /** The record route, already filled from the row: name and identifier cells link to it. */
    readonly openRoute = input<string | null>(null);
    /** Which list, for the warning an unmapped status logs. */
    readonly where = input('a list');

    readonly value = computed(() => readPath(this.row(), this.column().key));
    readonly text = computed(() => String(this.value() ?? ''));

    readonly empty = computed(() => {
        const value = this.value();
        return value === undefined || value === null || value === '' || (Array.isArray(value) && !value.length);
    });

    readonly sub = computed(() => {
        const column = this.column();
        return 'sub' in column && column.sub ? readPath(this.row(), column.sub) : null;
    });

    readonly thumb = computed(() => {
        const column = this.column();
        return column.type === 'name' && column.thumb ? (readPath(this.row(), column.thumb) as string | null) : null;
    });

    readonly tone = computed(() => {
        const column = this.column();
        if (column.type !== 'status' && column.type !== 'dot') return null;
        return resolveTone(column.tones, this.value(), column.type === 'status' ? column.fallback : undefined, this.where());
    });

    readonly dotClass = computed(() => DOT[this.tone()?.style.tone ?? 'neutral']);

    readonly tags = computed(() => {
        const column = this.column();
        const value = this.value();
        if (column.type !== 'tags' || !Array.isArray(value)) return [];
        return value.map((item) => (column.tones ? resolveTone(column.tones, item, undefined, this.where())?.style : null) ?? { label: String(item), tone: 'neutral' as const, icon: undefined });
    });

    readonly amount = computed(() => Number(this.value()));

    readonly signed = computed(() => {
        const column = this.column();
        return column.type === 'number' && !!column.signed;
    });

    readonly moneyInk = computed(() => {
        const column = this.column();
        const amount = this.amount();
        return amount < 0 || (column.type === 'money' && column.due && amount > 0);
    });

    /** The quantity with a Low or Out badge beside it; the restock level is on hover, never printed (decided by the user, 2026-09-30). */
    readonly stock = computed(() => {
        const column = this.column();
        if (column.type !== 'stock') return null;
        const level = Number(readPath(this.row(), column.restockAt));
        const on = this.amount();
        const known = !Number.isNaN(level);
        if (on <= 0) return { ink: 'text-danger-ink', badge: 'out' as const, tone: 'danger' as const, level, known };
        if (known && on <= level) return { ink: 'text-warning-ink', badge: 'low' as const, tone: 'warning' as const, level, known };
        return { ink: 'text-ink', badge: null, tone: null, level, known };
    });

    readonly linkRoute = computed(() => {
        const column = this.column();
        return column.type === 'link' ? fillRoute(column.route, this.row()) : null;
    });

    readonly linkText = computed(() => {
        const column = this.column();
        return String((column.type === 'link' && column.text ? readPath(this.row(), column.text) : this.value()) ?? '');
    });

    readonly dateFormat = computed<DateFormat>(() => {
        const column = this.column();
        return column.type === 'date' ? (column.format ?? 'date') : 'date';
    });

    /**
     * The name a row carries, and the account behind it. Nothing else: the designation, the photo
     * and the rest are what the card fetches when somebody opens it.
     */
    readonly person = computed(() => {
        const column = this.column();
        if (column.type !== 'user') return null;

        const account = String(this.value() ?? '');
        const name = column.name ? String(readPath(this.row(), column.name) ?? '') : '';

        return { label: name || account, account, named: !!name };
    });

    readonly rendererBindings = computed(() => {
        const column = this.column();
        return { row: this.row(), column, inputs: column.type === 'component' ? (column.inputs ?? {}) : {} };
    });

    stopRow(event: Event): void {
        event.stopPropagation();
    }

    /** A click on the copy button copies and does not open the row. */
    stopCopy(event: Event): void {
        if ((event.target as HTMLElement).closest('.ant-typography-copy')) event.stopPropagation();
    }
}
