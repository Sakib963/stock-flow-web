import { CdkDrag, CdkDragDrop, CdkDragHandle, CdkDropList } from '@angular/cdk/drag-drop';
import { ChangeDetectionStrategy, Component, computed, input, model, signal } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCheck, lucideColumns3, lucideGripVertical, lucideRotateCcw } from '@ng-icons/lucide';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzPopoverModule } from 'ng-zorro-antd/popover';
import { TranslatePipe } from '@ngx-translate/core';
import { Column, TablePreferences } from '@app/core/models/table.model';
import { TextPipe } from '@app/shared/pipes/text/text.pipe';
import { mergeOrder, moveColumn, orderedColumns } from '@app/shared/utils/column-order/column-order';

/**
 * Columns: which ones are shown and in what order (REQ-22).
 *
 * The panel is an nz-popover, so the CDK anchors it to the button and flips it near the foot of the
 * window rather than being clipped by the table's own overflow.
 *
 * Dragging is the fast way and never the only way: a focused row moves with Alt+Up and Alt+Down,
 * because a pointer drag is unreachable by keyboard and hard work on a trackpad. Pinned columns are
 * listed as fixed rather than left out, so nobody hunts the panel for a column that is on screen.
 */
@Component({
    selector: 'column-picker',
    imports: [CdkDrag, CdkDragHandle, CdkDropList, NgIcon, NzButtonModule, NzCheckboxModule, NzPopoverModule, TranslatePipe, TextPipe],
    providers: [provideIcons({ lucideCheck, lucideColumns3, lucideGripVertical, lucideRotateCcw })],
    templateUrl: './column-picker.component.html',
    styleUrl: './column-picker.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ColumnPickerComponent {
    /** Already filtered by permission: a column nobody may see is not offered here either. */
    readonly columns = input.required<readonly Column[]>();
    readonly preferences = model.required<TablePreferences>();
    /** A table may turn either half off; with both off the button is not rendered at all. */
    readonly canHide = input(true);
    readonly canReorder = input(true);

    readonly open = signal(false);

    /** The movable rows, in the person's order. Pinned columns are shown apart, and cannot be dragged. */
    readonly rows = computed(() => orderedColumns(this.columns(), this.preferences().order).filter((c) => !c.pin));
    readonly pinned = computed(() => orderedColumns(this.columns(), this.preferences().order).filter((c) => !!c.pin));

    private readonly _hidden = computed(() => new Set(this.preferences().hidden));

    isShown(column: Column): boolean {
        return column.locked || !this._hidden().has(column.key);
    }

    /** The last visible column cannot be hidden: an empty table is not a preference, it is a dead end. */
    canToggle(column: Column): boolean {
        return this.canHide() && !column.locked && (!this.isShown(column) || this.shownCount() > 1);
    }

    shownCount(): number {
        return this.columns().filter((c) => this.isShown(c)).length;
    }

    toggle(column: Column): void {
        if (!this.canToggle(column)) return;

        const hidden = new Set(this._hidden());
        if (hidden.has(column.key)) hidden.delete(column.key);
        else hidden.add(column.key);
        this.preferences.update((p) => ({ ...p, hidden: [...hidden] }));
    }

    onDrop(event: CdkDragDrop<unknown>): void {
        this.move(event.previousIndex, event.currentIndex);
    }

    /** Alt, not a bare arrow: the arrows still move focus through the list. */
    onKeydown(index: number, event: KeyboardEvent): void {
        if (!event.altKey || (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')) return;

        event.preventDefault();
        const to = event.key === 'ArrowUp' ? index - 1 : index + 1;
        if (to < 0 || to >= this.rows().length) return;

        this.move(index, to);

        // The row moved out from under the focus ring, so the focus follows it rather than staying
        // on whatever slid into its place. The list is read now, while the event still has its
        // target: after the move the row this came from may no longer be in the document.
        const list = event.target instanceof Element ? event.target.closest('[data-picker="list"]') : null;
        if (list) queueMicrotask(() => list.querySelectorAll<HTMLElement>('[data-picker="row"]')[to]?.focus());
    }

    /** Back to what the config says, order and hidden together: a half reset leaves a stranger state. */
    reset(): void {
        this.preferences.update((p) => ({ ...p, order: mergeOrder(this.columns(), undefined), hidden: this.columns().filter((c) => c.hidden && !c.locked).map((c) => c.key) }));
    }

    private move(from: number, to: number): void {
        if (!this.canReorder() || from === to) return;
        this.preferences.update((p) => ({ ...p, order: moveColumn(this.columns(), p.order, from, to) }));
    }
}
