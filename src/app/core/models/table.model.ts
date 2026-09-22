import { Action, Condition, DateFormat, Endpoint, JsonObject, Params, Text, Tone, ToneMap, ToneStyle } from '@app/core/models/config.model';
import { RendererRef } from '@app/core/models/renderer.model';

interface ColumnBase {
    /** The row field, a dot path allowed: 'supplier.name'. */
    key: string;
    /** Money columns carry the currency: 'Total ৳'. */
    label: Text;
    /** px in the table layout. Exactly one column has none and takes the slack. */
    width?: number;
    /** Numbers and money default right. */
    align?: 'left' | 'center' | 'right';
    sortable?: boolean;
    /** The parameter the server sorts by, where it is not the field itself: a person column sorts by their time. */
    sortKey?: string;
    /** px width at which the column drops out. */
    hideBelow?: number;
    /** Off until picked in Columns. */
    hidden?: boolean;
    /** Cannot be hidden. */
    locked?: boolean;
    /** Cannot be dragged, and nothing is dropped past it. */
    pin?: 'start' | 'end';
    permission?: string;
}

export type Column =
    | (ColumnBase & { type: 'text' })
    /** Prose that will not fit: the cell clamps and the full value opens in a popover, not a tooltip. */
    | (ColumnBase & { type: 'long-text'; lines?: 1 | 2 })
    | (ColumnBase & { type: 'name'; sub?: string; thumb?: string })
    | (ColumnBase & { type: 'identifier'; copy?: boolean })
    | (ColumnBase & { type: 'number' })
    | (ColumnBase & { type: 'quantity'; unit?: string })
    | (ColumnBase & { type: 'stock'; restockAt: string })
    | (ColumnBase & { type: 'money'; due?: boolean })
    | (ColumnBase & { type: 'percent' })
    | (ColumnBase & { type: 'date'; format?: DateFormat })
    | (ColumnBase & { type: 'status'; tones: ToneMap; fallback?: ToneStyle })
    | (ColumnBase & { type: 'dot'; tones: ToneMap })
    | (ColumnBase & { type: 'boolean'; yes: Text; no: Text })
    | (ColumnBase & { type: 'phone' })
    /**
     * A person: the name a row carries, which opens their card. The one column type for a human, so
     * a staff name reads the same in every list.
     *
     * `key` is the account the row stores, usually an email, and is what the card is fetched by.
     * It is also what the cell falls back to when the row has no name to show.
     */
    | (ColumnBase & { type: 'user'; name?: string })
    | (ColumnBase & { type: 'tags'; tones?: ToneMap })
    | (ColumnBase & { type: 'image' })
    | (ColumnBase & { type: 'link'; route: string; text?: string })
    | (ColumnBase & RendererRef & { type: 'component'; inputs?: JsonObject });

export type ColumnType = Column['type'];

interface LayoutBase {
    label?: Text;
    icon?: string;
    permission?: string;
}

/** Where columns go. Every value named here is a column key, drawn by that column's own type. */
export type Layout =
    | (LayoutBase & { type: 'table' })
    | (LayoutBase & { type: 'cards'; title: string; subtitle?: string; badge?: string; meta?: readonly string[] })
    | (LayoutBase & { type: 'grid'; media?: string; title: string; subtitle?: string; badge?: string; meta?: readonly string[]; minWidth?: number })
    | (LayoutBase & RendererRef & { type: 'component'; key: string; label: Text; icon: string; skeleton: 'rows' | 'cards' | 'grid'; columns?: readonly string[] });

export interface TableSource {
    endpoint: Endpoint;
    /** Sent on every request beside offset, limit, search, sort, order, include and the filters. */
    params?: Params;
    /** Counts from their own endpoint, sent the same query. */
    stats?: Endpoint;
    /** Default 'data.rows', 'total', 'data.stats', 'data.totals'. */
    response?: { rows?: string; total?: string; stats?: string; totals?: string };
}

export interface RowAction extends Action {
    /** Default true: shown only when row.allowed_actions has the key. */
    stateful?: boolean;
    when?: Condition;
    danger?: boolean;
}

export interface BulkAction extends Action {
    stateful?: boolean;
}

export interface Total {
    key: string;
    label: Text;
    format: 'number' | 'money';
    tone?: Tone;
}

export interface TableSort {
    key: string;
    order: 'asc' | 'desc';
}

export interface TableConfig {
    /** 'sales.order': table preferences on the device. */
    key: string;
    rowKey: string;
    /** Absent: the host passes rows, total and state. */
    source?: TableSource;
    columns: readonly Column[];
    /** The first permitted one is the default. */
    layouts: readonly Layout[];
    phoneLayout?: string;
    /** A row click opens it: '/app/sales/orders/:oid'. */
    open?: { route: string };
    rowActions?: readonly RowAction[];
    bulkActions?: readonly BulkAction[];
    selection?: 'none' | 'multiple';
    /** The # column, counted from the page offset. On unless a table says otherwise. */
    serial?: boolean;
    personalise?: { hide?: boolean; reorder?: boolean };
    pageSize?: { default: number; options: readonly number[] };
    sort?: TableSort;
    totals?: readonly Total[];
    /** action: a page header action key. */
    empty: { icon: string; title: Text; body: Text; action?: string };
    idle?: { title: Text; body: Text };
}

export type TableState = 'idle' | 'loading' | 'refreshing' | 'data' | 'empty' | 'no-match' | 'error';

/** Per person, per table, on the device. */
export interface TablePreferences {
    layout: string;
    order: readonly string[];
    hidden: readonly string[];
}

/** What a list store needs to load a table. */
export interface ListStoreSetup {
    source: TableSource;
    pageSize?: number;
    sort?: TableSort | null;
    /** Values the host passes for `{ context: ... }` params. */
    context?: Readonly<Record<string, unknown>> | null;
    /** Route parameters for `{ route: ... }` params. */
    route?: Readonly<Record<string, string | undefined>>;
    /** Asked of the server only when a config shows them. */
    include?: readonly ('stats' | 'totals')[];
}
