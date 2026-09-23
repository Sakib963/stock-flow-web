import { CdkDrag, CdkDragDrop, CdkDropList } from '@angular/cdk/drag-drop';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzTableModule, NzTableSortOrder } from 'ng-zorro-antd/table';
import { TranslatePipe } from '@ngx-translate/core';
import { Row } from '@app/core/models/config.model';
import { LayoutContext } from '@app/core/models/renderer.model';
import { Column, RowActionStyle } from '@app/core/models/table.model';
import { RowActionsComponent } from '@app/shared/components/table/components/row-actions/row-actions.component';
import { TableCellComponent } from '@app/shared/components/table/components/table-cell/table-cell.component';
import { TextPipe } from '@app/shared/pipes/text/text.pipe';
import { fillRoute } from '@app/shared/utils/fill-route/fill-route';
import { readPath } from '@app/shared/utils/read-path/read-path';

const RIGHT: ReadonlySet<Column['type']> = new Set(['number', 'quantity', 'stock', 'money', 'percent']);
/** The column without a width is never squeezed below this: the table scrolls inside its card instead. */
const SLACK_MIN_PX = 220;
/** Wide enough for a four figure serial, and no wider: it is the least interesting column on screen. */
const SERIAL_PX = 52;
const ACTIONS_PX = 76;

/**
 * The table layout: columns across, one row per record. It takes the same LayoutContext a
 * registered layout does, so it has no privileges a board or a timeline would not.
 */
@Component({
    selector: 'table-layout',
    imports: [CdkDrag, CdkDropList, NzTableModule, NzSkeletonModule, TranslatePipe, RowActionsComponent, TableCellComponent, TextPipe],
    templateUrl: './table-layout.component.html',
    styleUrl: './table-layout.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TableLayoutComponent {
    readonly context = input.required<LayoutContext>();
    readonly rowKey = input.required<string>();
    readonly openRoute = input<string | null>(null);
    /** How many skeleton rows the first load shows: the page size, so nothing jumps when rows land. */
    readonly skeletonRows = input(20);
    readonly where = input('a list');
    /** Off when the config refuses reorder, and on a phone, where a drag is a scroll. */
    readonly canReorder = input(false);
    readonly actionStyle = input<RowActionStyle>('auto');

    /** Indexes into the movable columns, which is what the header shows once pins are at the edges. */
    readonly reorder = output<{ from: number; to: number }>();

    readonly columns = computed(() => this.context().columns());
    readonly rows = computed(() => this.context().rows());
    readonly loading = computed(() => this.context().state() === 'loading');
    readonly skeleton = computed(() => Array.from({ length: this.skeletonRows() }, (_, i) => i));

    readonly serial = computed(() => this.context().serial());
    readonly hasActions = computed(() => this.context().hasActions());

    readonly scroll = computed(() => {
        const columns = this.columns().reduce((sum, c) => sum + (c.width ?? SLACK_MIN_PX), 0);
        return { x: `${columns + (this.serial() ? SERIAL_PX : 0) + (this.hasActions() ? ACTIONS_PX : 0)}px` };
    });

    readonly serialWidth = `${SERIAL_PX}px`;
    readonly actionsWidth = `${ACTIONS_PX}px`;

    /**
     * The number in the # column: the row's place in the whole list, not in the page on screen.
     * Row 1 of page 3 at 20 a page is 41, which is what someone counting against a printed sheet
     * expects, and what a colleague on the phone means by "the forty-first one".
     */
    numberOf(index: number): number {
        return this.context().offset() + index + 1;
    }

    align(column: Column): 'left' | 'right' | 'center' {
        return column.align ?? (RIGHT.has(column.type) ? 'right' : 'left');
    }

    width(column: Column): string | null {
        return column.width ? `${column.width}px` : null;
    }

    /** What the server is asked to sort by, which is the field unless the column names another. */
    sortKey(column: Column): string {
        return column.sortKey ?? column.key;
    }

    sortOrder(column: Column): NzTableSortOrder {
        const sort = this.context().sort();
        if (!sort || sort.key !== this.sortKey(column)) return null;
        return sort.order === 'asc' ? 'ascend' : 'descend';
    }

    onSort(column: Column, order: NzTableSortOrder): void {
        this.context().setSort(order ? { key: this.sortKey(column), order: order === 'ascend' ? 'asc' : 'desc' } : null);
    }

    /** A pinned column is not a drop target either, so nothing can be dropped past one. */
    isMovable(column: Column): boolean {
        return this.canReorder() && !column.pin;
    }

    /** The header lists pinned columns too, so a drag index has to be counted over the movable ones. */
    onDrop(event: CdkDragDrop<unknown>): void {
        const movable = this.columns().filter((c) => !c.pin);
        const from = movable.indexOf(this.columns()[event.previousIndex]);
        const to = movable.indexOf(this.columns()[event.currentIndex]);
        if (from < 0 || to < 0 || from === to) return;
        this.reorder.emit({ from, to });
    }

    idOf(row: Row): string {
        return String(row[this.rowKey()] ?? '');
    }

    /** The menu head repeats the row's code, or its name where a list has no code to show. */
    labelOf(row: Row): string {
        const named = this.columns().find((c) => c.type === 'identifier') ?? this.columns().find((c) => c.type === 'name');
        return named ? String(readPath(row, named.key) ?? '') : '';
    }

    routeFor(row: Row): string | null {
        const route = this.openRoute();
        return route ? fillRoute(route, row) : null;
    }

    /** A click anywhere on the row opens the record, except on something that has its own job. */
    onRowClick(row: Row, event: MouseEvent): void {
        if ((event.target as HTMLElement).closest('a, button, input, label, [role="menuitem"]')) return;
        if (window.getSelection()?.toString()) return;
        this.context().open(row);
    }
}
