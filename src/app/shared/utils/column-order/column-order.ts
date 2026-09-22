import { Column, TablePreferences } from '@app/core/models/table.model';

/**
 * The person's column order and hidden set, reconciled with the config every time a list opens
 * (REQ-23), and the one move a drag or an Alt+Arrow performs (REQ-22).
 *
 * Preferences outlive the config that produced them: they sit in this browser while the config
 * ships with the app. So a stored order is never trusted as a list of columns, only as an opinion
 * about the order of the columns that exist now.
 */

/** Pinned columns hold their config position, so they are never part of what a person reorders. */
const isMovable = (column: Column): boolean => !column.pin;

/**
 * The stored order, reconciled with the columns that exist and are permitted now.
 *
 * A key that no longer resolves is dropped rather than kept as a hole. A column added since the
 * order was stored is placed after the column that precedes it in the config, which is where its
 * author meant it to be: appending instead sent every new column to the far right, where a person
 * who had ever opened the picker would never see it.
 */
export function mergeOrder(columns: readonly Column[], stored: readonly string[] | undefined): string[] {
    const present = new Set(columns.map((c) => c.key));
    const order = (stored ?? []).filter((key, i, all) => present.has(key) && all.indexOf(key) === i);

    columns.forEach((column, i) => {
        if (order.includes(column.key)) return;

        // The nearest earlier config column that is already placed, so a run of new columns keeps
        // its config order rather than stacking up in reverse.
        let at = 0;
        for (let j = i - 1; j >= 0; j--) {
            const found = order.indexOf(columns[j].key);
            if (found >= 0) {
                at = found + 1;
                break;
            }
        }
        order.splice(at, 0, column.key);
    });

    return order;
}

/**
 * The columns a layout draws: pinned to the edges they claim, the rest in the person's order.
 *
 * Applying the order before the pins would let a stored order from before a column was pinned
 * float it back into the middle.
 */
export function orderedColumns(columns: readonly Column[], order: readonly string[]): Column[] {
    const rank = new Map(order.map((key, i) => [key, i]));
    const at = (c: Column) => rank.get(c.key) ?? Number.MAX_SAFE_INTEGER;

    const start = columns.filter((c) => c.pin === 'start');
    const end = columns.filter((c) => c.pin === 'end');
    const middle = columns.filter(isMovable).sort((a, b) => at(a) - at(b));

    return [...start, ...middle, ...end];
}

/** Hidden unless locked: a locked column carries the row's identity, so losing it leaves nothing to read. */
export function visibleColumns(columns: readonly Column[], preferences: TablePreferences): Column[] {
    const hidden = new Set(preferences.hidden);
    return orderedColumns(columns, preferences.order).filter((c) => c.locked || !hidden.has(c.key));
}

/**
 * Moves one column to the position another occupies, counting only the columns that can move.
 *
 * Both indexes are positions in the movable list, which is what the picker and the header both
 * show, so neither caller has to know a pinned column is sitting in between.
 */
export function moveColumn(columns: readonly Column[], order: readonly string[], from: number, to: number): string[] {
    const movable = orderedColumns(columns, order).filter(isMovable).map((c) => c.key);
    if (from < 0 || from >= movable.length || to < 0 || to >= movable.length || from === to) return [...order];

    const moved = [...movable];
    moved.splice(to, 0, ...moved.splice(from, 1));

    // Pinned keys stay in the stored order so it still describes every column, not just the movable
    // ones: orderedColumns puts them back at their edges either way.
    const pinned = order.filter((key) => !movable.includes(key));
    return [...moved, ...pinned];
}

/**
 * The preferences a table starts from: what was stored, reconciled with the config.
 *
 * A layout the config no longer offers falls back to the config's own, so removing a board layout
 does not leave someone staring at an empty card with no way back.
 */
export function mergePreferences(columns: readonly Column[], layouts: readonly string[], stored: Partial<TablePreferences> | null, fallback: { layout: string }): TablePreferences {
    const present = new Set(columns.map((c) => c.key));
    const lockedNow = new Set(columns.filter((c) => c.locked).map((c) => c.key));

    return {
        layout: stored?.layout && layouts.includes(stored.layout) ? stored.layout : fallback.layout,
        order: mergeOrder(columns, stored?.order),
        // A column locked since the preference was stored stops being hidden, rather than being
        // both locked and absent.
        hidden: (stored?.hidden ?? columns.filter((c) => c.hidden).map((c) => c.key)).filter((key) => present.has(key) && !lockedNow.has(key)),
    };
}
