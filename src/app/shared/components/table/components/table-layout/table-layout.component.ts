import { CdkDrag, CdkDragDrop, CdkDropList } from '@angular/cdk/drag-drop';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzTableModule, NzTableSortOrder } from 'ng-zorro-antd/table';
import { Row } from '@app/core/models/config.model';
import { LayoutContext } from '@app/core/models/renderer.model';
import { Column } from '@app/core/models/table.model';
import { TableCellComponent } from '@app/shared/components/table/components/table-cell/table-cell.component';
import { TextPipe } from '@app/shared/pipes/text/text.pipe';
import { fillRoute } from '@app/shared/utils/fill-route/fill-route';

const RIGHT: ReadonlySet<Column['type']> = new Set(['number', 'quantity', 'stock', 'money', 'percent']);
/** The column without a width is never squeezed below this: the table scrolls inside its card instead. */
const SLACK_MIN_PX = 220;

/**
 * The table layout: columns across, one row per record. It takes the same LayoutContext a
 * registered layout does, so it has no privileges a board or a timeline would not.
 */
@Component({
    selector: 'table-layout',
    imports: [CdkDrag, CdkDropList, NzTableModule, NzSkeletonModule, TableCellComponent, TextPipe],
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

    /** Indexes into the movable columns, which is what the header shows once pins are at the edges. */
    readonly reorder = output<{ from: number; to: number }>();

    readonly columns = computed(() => this.context().columns());
    readonly rows = computed(() => this.context().rows());
    readonly loading = computed(() => this.context().state() === 'loading');
    readonly size = computed(() => (this.context().density() === 'compact' ? 'small' : 'middle'));
    readonly skeleton = computed(() => Array.from({ length: this.skeletonRows() }, (_, i) => i));

    readonly scroll = computed(() => ({ x: `${this.columns().reduce((sum, c) => sum + (c.width ?? SLACK_MIN_PX), 0)}px` }));

    align(column: Column): 'left' | 'right' | 'center' {
        return column.align ?? (RIGHT.has(column.type) ? 'right' : 'left');
    }

    width(column: Column): string | null {
        return column.width ? `${column.width}px` : null;
    }

    sortOrder(column: Column): NzTableSortOrder {
        const sort = this.context().sort();
        if (!sort || sort.key !== column.key) return null;
        return sort.order === 'asc' ? 'ascend' : 'descend';
    }

    onSort(column: Column, order: NzTableSortOrder): void {
        this.context().setSort(order ? { key: column.key, order: order === 'ascend' ? 'asc' : 'desc' } : null);
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
