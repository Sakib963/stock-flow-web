export type SalesChannel = 'POS' | 'ONLINE';

export interface SalesPeriod {
    date_from: string;
    date_to: string;
    previous_from: string;
    previous_to: string;
}

export interface Compared<T> {
    current: T;
    previous: T;
}

export interface RefusalCount {
    dispatched: number;
    failed: number;
}

/** A place's name in both languages, picked by the language on screen. */
export interface PlaceName {
    en: string;
    bn: string;
}

/**
 * A sentence key under `sales.analytics.insight` with what it names: numbers, a place, or (in a
 * param ending in Key) another copy key to translate first.
 */
export interface Insight {
    key: string;
    params: Record<string, number | string | PlaceName>;
}

export interface SalesOverview {
    period: SalesPeriod;
    channels: SalesChannel[];
    /** The business's order sources, for the filter; empty for someone who does not sell online. */
    sources: { oid: string; name: string; platform: string }[];
    tiles: {
        sales: Compared<number>;
        profit: Compared<number>;
        orders: Compared<number>;
        margin: Compared<number | null>;
        refusal: Compared<RefusalCount> | null;
    };
    daily: { day: string; sales: number; profit: number }[];
    /** Kept sales by channel; null unless both channels are in the figures. */
    by_channel: { channel: SalesChannel; sales: number; profit: number; orders: number }[] | null;
    /** Null for someone who may not see pre-orders. */
    pre_orders: { booked: number; booked_value: number; converted: number; cancelled: number; open: number; open_now: number; advance_held: number } | null;
    /** Null for someone who does not sell at the counter. */
    counter: { sales: number; units: number; value: number; without_customer: number } | null;
    waterfall: { list_price: number; discounts: number; returns: number; cost: number; profit: number; units_without_cost: number };
    insights: { headline: Insight; waterfall: Insight | null };
}

/** Counts every rate in the online section reads: cancellations here are the customer's side only. */
export interface FlowCounts {
    placed: number;
    cancelled: number;
    business_cancelled: number;
    dispatched: number;
    failed: number;
}

export interface District {
    oid: string;
    name_en: string;
    name_bn: string;
}

export interface OrderFlow {
    applies: true;
    period: SalesPeriod;
    funnel: {
        placed: number;
        placed_value: number;
        confirmed: number;
        confirmed_value: number;
        dispatched: number;
        dispatched_value: number;
        delivered: number;
        delivered_value: number;
        kept: number;
        kept_value: number;
        waiting_confirm: number;
        waiting_dispatch: number;
        with_courier: number;
        returned: number;
    };
    cancel_reasons: { reason: string | null; business: boolean; before_confirm: number; after_confirm: number }[];
    failed_reasons: { reason: string; parcels: number }[];
    places: (District & FlowCounts)[];
    sources: ({ oid: string; name: string; platform: string } & FlowCounts)[];
    products: { oid: string; name: string; units: number; cancelled_units: number; business_cancelled_units: number }[];
    customers: { oid: string; name: string; placed: number; cancelled: number }[];
    confirming: { method: string; dispatched: number; failed: number }[];
    terms: { terms: string; dispatched: number; failed: number }[];
    terms_by_place: (District & { cod_dispatched: number; cod_failed: number; advance_dispatched: number; advance_failed: number })[];
    risk: { shown: 'blocked' | 'watch' | 'under_80' | 'from_80' | 'no_history'; placed: number; kept: number; failed: number; returned: number; cancelled: number; open: number }[];
    speed: { to_confirm: number | null; to_dispatch: number | null; to_deliver: number | null };
    speed_by_place: (District & { delivered: number; to_deliver: number })[];
    insights: { funnel: Insight | null; confirming: Insight | null; terms: Insight | null; places: Insight | null; risk: Insight | null };
}

export interface TeamPerson {
    email: string;
    name: string | null;
    sales: number;
    sold_orders: number;
    list_price: number;
    discount: number;
    at_limit: number;
    taken: number;
    cancelled: number;
    business_cancelled: number;
    dispatched: number;
    failed: number;
    confirmed: number;
}

export interface DiscountFigures {
    list_price: number;
    discount: number;
    lines: number;
    discounted_lines: number;
    at_limit: number;
}

export interface TeamFigures {
    period: SalesPeriod;
    channels: SalesChannel[];
    /** weekday is 0 for Sunday to 6 for Saturday, on the business's clock. */
    arrivals: { channel: SalesChannel; weekday: number; hour: number; orders: number }[];
    discount: DiscountFigures;
    discount_by_product: ({ oid: string; name: string } & DiscountFigures)[];
    people: TeamPerson[];
    insights: { discount: Insight | null; people: Insight | null };
}

export interface ProductFigures {
    period: SalesPeriod;
    products: { oid: string; name: string; kept_units: number; demand_units: number; sales: number; profit: number; sold_units: number; returned_units: number; damaged_units: number }[];
    together: { first_oid: string; first_name: string; second_oid: string; second_name: string; orders: number }[];
    return_reasons: { reason: string; units: number; damaged: number }[];
    buyers: { gender: 'Female' | 'Male' | null; age_band: string | null; customers: number }[];
    /** The top three products each age band kept, by kept units. */
    age_demand: { age_band: string; oid: string; name: string; units: number; buyers: number }[];
    /** A null oid and name is stock that came in by an adjustment: no supplier. */
    suppliers: { oid: string | null; name: string | null; kept_units: number; sales: number; profit: number; sold_units: number; returned_units: number; damaged_units: number; received_all_time: number; kept_all_time: number }[];
    totals: { sales: number; orders: number; without_customer: number };
    insights: { products: Insight | null; demand: Insight | null; suppliers: Insight | null; buyers: Insight | null };
}

export interface CustomerFigures {
    period: SalesPeriod;
    channels: SalesChannel[];
    places: (District & { division_oid: string; customers: number; orders: number; sales: number; dispatched: number; failed: number })[];
    repeat: { customers: number; new_customers: number; bought_twice: number; days_to_second: number | null } | null;
    /** cohort is YYYY-MM; returned lists the months after it with someone back. */
    cohorts: { cohort: string; customers: number; returned: { month: number; customers: number }[] }[];
    win_back: { oid: string; name: string; sales: number; last_bought: string; days_since: number }[];
    /** Customers who bought in the period by age band; null where none was recorded. */
    ages: { age_band: string | null; customers: number }[];
    insights: { places: Insight | null; repeat: Insight | null };
}

export interface SalesAnalyticsQuery {
    date_from?: string | null;
    date_to?: string | null;
    channel?: SalesChannel | null;
    source_oid?: string | null;
    category_oid?: string | null;
}
