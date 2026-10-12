export type ActivityArea = 'sales' | 'inventory' | 'configuration' | 'settings' | 'security' | 'other';

/** The device a change was made from, as the request log recorded it. */
export interface ActivityDevice {
    browser: string | null;
    os: string | null;
    type: 'desktop' | 'phone' | 'tablet' | string | null;
}

/** One thing someone did. The title and description are the server's own words, in English. */
export interface ActivityEntry {
    oid: string;
    reference_type: string;
    reference_oid: string;
    title: string;
    description: string | null;
    performed_by: string;
    performed_by_name: string | null;
    performed_on: string;
    area: ActivityArea;
    /** A cancellation, a refund, a deletion, stock written off, a settings or sign-in change. */
    attention: boolean;
    /** False once the record it is about has been deleted, so there is nothing to open. */
    record_exists: boolean;
    device: ActivityDevice | null;
    city: string | null;
}

export interface ActivityPerson {
    email: string;
    name: string | null;
    actions: number;
    last_seen: string;
}

/** The period at a glance, over exactly the entries the feed shows. */
export interface ActivitySummary {
    actions: number;
    attention: number;
    /** Everyone who acted in the period; `people` lists the busiest 50. */
    people_count: number;
    /** 0 to 23 on the business's clock, or null when nothing happened. */
    busiest_hour: number | null;
    people: ActivityPerson[];
    areas: { area: ActivityArea; actions: number }[];
    /** ISO weekday 1 (Monday) to 7 (Sunday) by hour, on the business's clock. */
    week: { day: number; hour: number; actions: number }[];
}
