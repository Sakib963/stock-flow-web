import { Signal, Type, WritableSignal } from '@angular/core';
import { JsonObject, Row } from '@app/core/models/config.model';
import { FilterValues } from '@app/core/models/filter.model';
import { Column, RowAction, TableSort, TableState } from '@app/core/models/table.model';

/** A registered component, named in a config by key. Inputs are JSON so the config stays data. */
export interface RendererRef {
    /** Shared renderers: 'board'. Feature renderers: '<module>.<name>'. */
    renderer: string;
    inputs?: JsonObject;
}

export type RendererKind = 'layout' | 'cell' | 'filter-field' | 'slot';
export type RendererLoader = () => Promise<Type<unknown>>;
export type RendererMap = Readonly<Record<string, RendererLoader>>;

/** What a layout renderer receives as its `context` input. Already filtered by permission, state and the person's preferences. */
export interface LayoutContext {
    rows: Signal<readonly Row[]>;
    /** Permitted, visible, in the person's order. */
    columns: Signal<readonly Column[]>;
    state: Signal<TableState>;
    density: Signal<'compact' | 'standard'>;
    /** Null when selection is 'none'. */
    selection: WritableSignal<ReadonlySet<string>> | null;
    sort: Signal<TableSort | null>;
    setSort(sort: TableSort | null): void;
    /** Permitted and allowed for this row. */
    actionsFor(row: Row): readonly RowAction[];
    /** Refused unless actionsFor(row) holds it. */
    run(action: string, row: Row): void;
    open(row: Row): void;
}

/** What a slot renderer receives as its `context` input. */
export interface ListShellContext {
    filters: Signal<FilterValues>;
    stats: Signal<JsonObject | null>;
    state: Signal<TableState>;
    reload(): void;
}
