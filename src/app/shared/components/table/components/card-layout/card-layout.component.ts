import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { Row } from '@app/core/models/config.model';
import { LayoutContext } from '@app/core/models/renderer.model';
import { Column, Layout } from '@app/core/models/table.model';
import { RowActionsComponent } from '@app/shared/components/table/components/row-actions/row-actions.component';
import { TableCellComponent } from '@app/shared/components/table/components/table-cell/table-cell.component';
import { TextPipe } from '@app/shared/pipes/text/text.pipe';
import { fillRoute } from '@app/shared/utils/fill-route/fill-route';
import { readPath } from '@app/shared/utils/read-path/read-path';

const DEFAULT_GRID_MIN_PX = 240;

/**
 * The same records as cards rather than rows: `cards` reads as a stack of wide cards, `grid` as
 * tiles that can carry a picture.
 */
@Component({
    selector: 'card-layout',
    imports: [NzCardModule, NzSkeletonModule, RowActionsComponent, TableCellComponent, TextPipe],
    templateUrl: './card-layout.component.html',
    styleUrl: './card-layout.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardLayoutComponent {
    readonly context = input.required<LayoutContext>();
    readonly layout = input.required<Layout & { type: 'cards' | 'grid' }>();
    readonly rowKey = input.required<string>();
    readonly openRoute = input<string | null>(null);
    readonly skeletonCards = input(8);
    readonly where = input('a list');

    readonly rows = computed(() => this.context().rows());
    readonly loading = computed(() => this.context().state() === 'loading');
    readonly skeleton = computed(() => Array.from({ length: this.skeletonCards() }, (_, i) => i));
    readonly isGrid = computed(() => this.layout().type === 'grid');

    readonly gridStyle = computed(() => {
        const layout = this.layout();
        const min = layout.type === 'grid' ? (layout.minWidth ?? DEFAULT_GRID_MIN_PX) : 320;
        return { 'grid-template-columns': `repeat(auto-fill, minmax(min(${min}px, 100%), 1fr))` };
    });

    private readonly _byKey = computed(() => new Map(this.context().columns().map((c) => [c.key, c])));

    column(key: string | undefined): Column | null {
        return key ? (this._byKey().get(key) ?? null) : null;
    }

    readonly titleColumn = computed(() => this.column(this.layout().title));
    readonly subtitleColumn = computed(() => this.column(this.layout().subtitle));
    readonly badgeColumn = computed(() => this.column(this.layout().badge));
    readonly mediaColumn = computed(() => {
        const layout = this.layout();
        return layout.type === 'grid' ? this.column(layout.media) : null;
    });

    /**
     * The lines under the heading, in the person's own column order (REQ-22), minus the ones already
     * drawn as the title, subtitle, badge or picture, so nothing appears on a card twice.
     */
    readonly metaColumns = computed(() => {
        const layout = this.layout();
        const spoken = new Set([layout.title, layout.subtitle, layout.badge, layout.type === 'grid' ? layout.media : undefined].filter(Boolean) as string[]);
        const named = layout.meta;
        const columns = this.context().columns();
        if (named) return named.map((key) => this._byKey().get(key)).filter((c): c is Column => !!c && !spoken.has(c.key));
        return columns.filter((c) => !spoken.has(c.key));
    });

    numberOf(index: number): number {
        return this.context().offset() + index + 1;
    }

    idOf(row: Row): string {
        return String(row[this.rowKey()] ?? '');
    }

    labelOf(row: Row): string {
        const title = this.titleColumn();
        return title ? String(readPath(row, title.key) ?? '') : '';
    }

    routeFor(row: Row): string | null {
        const route = this.openRoute();
        return route ? fillRoute(route, row) : null;
    }

    /** A click anywhere on the card opens the record, except on something that has its own job. */
    onCardClick(row: Row, event: MouseEvent): void {
        if ((event.target as HTMLElement).closest('a, button, input, label, [role="menuitem"]')) return;
        if (window.getSelection()?.toString()) return;
        this.context().open(row);
    }
}
