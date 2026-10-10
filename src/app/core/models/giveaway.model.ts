export type GiveawayStatus = 'Draft' | 'Given' | 'Cancelled';

export interface GiveawayLine {
    oid: string;
    inventory_oid: string;
    product_oid: string;
    product_name: string;
    batch_code: string;
    quantity: number;
    /** Absent for someone without `inventory.stock-value.view`. */
    cost_price?: number;
}

export interface GiveawayActivity {
    title: string;
    description: string | null;
    performed_by: string;
    performed_on: string;
}

export interface GiveawayDetails {
    oid: string;
    giveaway_no: string;
    customer_oid: string | null;
    recipient_name: string;
    recipient_phone: string | null;
    address_line: string | null;
    note: string;
    status: GiveawayStatus;
    cancel_reason: string | null;
    given_on: string | null;
    given_by: string | null;
    created_on: string;
    created_by: string;
    lines: GiveawayLine[];
    activity: GiveawayActivity[];
}

export interface CreateGiveaway {
    oid: string;
    recipient_name: string;
    recipient_phone: string | null;
    address_line: string | null;
    note: string;
    lines: { inventory_oid: string; quantity: number }[];
}
