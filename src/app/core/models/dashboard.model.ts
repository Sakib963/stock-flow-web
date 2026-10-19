export type DashboardPeriod = 'today' | 'week' | 'month';

/** A section that could not be read says so in its place; the rest of the page still shows. */
export interface FailedSection {
    failed: true;
}

export interface ForYou {
    counter: { sales: number; orders: number; previous_sales: number; previous_orders: number } | null;
    online: { entered: number; sold: number; previous_entered: number } | null;
    drafts: { parked: number; online: number };
}

export type AttentionKey =
    | 'orders_to_confirm'
    | 'orders_to_dispatch'
    | 'parcels_with_courier'
    | 'returns_to_confirm'
    | 'pre_orders_ready'
    | 'pre_orders_overdue'
    | 'purchase_orders_to_verify'
    | 'disposals_to_approve'
    | 'adjustments_to_verify'
    | 'out_of_stock'
    | 'low_on_stock'
    | 'expiring'
    | 'posts_past_due';

export interface AttentionRow {
    key: AttentionKey;
    count: number;
    oldest_on?: string | null;
    oldest_day?: string | null;
    parcels?: number;
    expired?: number;
}

export interface BusinessFigures {
    sales: number;
    profit: number;
    orders: number;
    average: number;
}

export interface Business {
    current: BusinessFigures;
    previous: BusinessFigures;
    units_without_cost: number;
    /** Only the days that had sales; the page fills the rest. Empty for a single day. */
    daily: { day: string; sales: number; profit: number }[];
    top: { oid: string; name: string; photo_thumb: string | null; units: number; sales: number }[];
}

export interface StockGlance {
    stock_value: number;
    expected_revenue: number;
    profit_full: number;
    unpriced_batches: number;
}

export interface Dashboard {
    period: { key: DashboardPeriod; date_from: string; date_to: string; previous_from: string; previous_to: string };
    /** Null when the person holds none of the features it summarises. */
    for_you: ForYou | FailedSection | null;
    attention: AttentionRow[] | FailedSection | null;
    business: Business | FailedSection | null;
    stock: StockGlance | FailedSection | null;
}
