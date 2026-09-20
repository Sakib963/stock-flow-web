import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCopy } from '@ng-icons/lucide';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Row, Tone } from '@app/core/models/config.model';
import { Column } from '@app/core/models/table.model';
import { LanguageService } from '@app/core/services/language/language.service';
import { RendererOutletComponent } from '@app/shared/components/renderer-outlet/renderer-outlet.component';
import { StatusTagComponent } from '@app/shared/components/status-tag/status-tag.component';
import { MoneyPipe } from '@app/shared/pipes/money/money.pipe';
import { RecordDatePipe } from '@app/shared/pipes/record-date/record-date.pipe';
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
 */
@Component({
    selector: 'table-cell',
    imports: [RouterLink, NgIcon, NzTooltipModule, TranslatePipe, TextPipe, MoneyPipe, RecordDatePipe, StatusTagComponent, RendererOutletComponent],
    providers: [provideIcons({ lucideCopy })],
    templateUrl: './table-cell.component.html',
    styleUrl: './table-cell.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TableCellComponent {
    private readonly _host = inject(ElementRef<HTMLElement>);
    private readonly _message = inject(NzMessageService);
    private readonly _translate = inject(TranslateService);
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

    /** Set on hover, so a tooltip appears only when the text was actually cut short. */
    readonly truncated = signal(false);

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

    readonly moneyInk = computed(() => {
        const column = this.column();
        const amount = this.amount();
        return amount < 0 || (column.type === 'money' && column.due && amount > 0);
    });

    /** Stock reads as ink and a sub line, never a chip: the chip belongs to the record's own state. */
    readonly stock = computed(() => {
        const column = this.column();
        if (column.type !== 'stock') return null;
        const level = Number(readPath(this.row(), column.restockAt));
        const on = this.amount();
        if (on <= 0) return { ink: 'text-danger-ink', key: 'list.stock.out', level };
        if (!Number.isNaN(level) && on <= level) return { ink: 'text-warning-ink', key: 'list.stock.below', level };
        return { ink: 'text-ink', key: Number.isNaN(level) ? null : 'list.stock.restockAt', level };
    });

    readonly linkRoute = computed(() => {
        const column = this.column();
        return column.type === 'link' ? fillRoute(column.route, this.row()) : null;
    });

    readonly linkText = computed(() => {
        const column = this.column();
        return String((column.type === 'link' && column.text ? readPath(this.row(), column.text) : this.value()) ?? '');
    });

    readonly rendererBindings = computed(() => {
        const column = this.column();
        return { row: this.row(), column, inputs: column.type === 'component' ? (column.inputs ?? {}) : {} };
    });

    measure(): void {
        const text = this._host.nativeElement.querySelector('[data-truncate]') as HTMLElement | null;
        this.truncated.set(!!text && (text.scrollWidth > text.clientWidth || text.scrollHeight > text.clientHeight));
    }

    async copy(event: Event): Promise<void> {
        event.stopPropagation();
        try {
            await navigator.clipboard.writeText(String(this.value()));
            this._message.success(this._translate.instant('list.copied'));
        } catch {
            this._message.error(this._translate.instant('list.copyFailed'));
        }
    }

    stopRow(event: Event): void {
        event.stopPropagation();
    }
}
