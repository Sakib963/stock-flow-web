/** Draft is a gift on its own before it is given; Held and Returned are a gift in an online order's parcel. */
export type GiveawayStatus = 'Draft' | 'Held' | 'Given' | 'Returned' | 'Cancelled';

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
    order_oid: string | null;
    /** The order's invoice, for a gift in its parcel. */
    invoice_no: string | null;
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

/** A gift in an order's parcel, as the order record lists it. */
export interface OrderGift {
    oid: string;
    giveaway_no: string;
    status: GiveawayStatus;
    units: number;
    note: string;
}

export interface AddOrderGift {
    oid: string;
    order_oid: string;
    note: string;
    lines: { inventory_oid: string; quantity: number }[];
}
