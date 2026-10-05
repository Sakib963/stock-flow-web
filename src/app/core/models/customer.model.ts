export const CUSTOMER_GENDERS = ['Female', 'Male'] as const;
export type CustomerGender = (typeof CUSTOMER_GENDERS)[number];

export const CUSTOMER_AGE_BANDS = ['under_18', '18_24', '25_34', '35_44', '45_plus'] as const;
export type CustomerAgeBand = (typeof CUSTOMER_AGE_BANDS)[number];

export const CUSTOMER_FLAGS = ['None', 'Watch', 'Blocked'] as const;
export type CustomerFlag = (typeof CUSTOMER_FLAGS)[number];

export type CustomerStatus = 'Active' | 'Inactive';

/** A customer as the list, the form and the record page see it. Gender and age are null when not known (sales REQ-63). */
export interface Customer {
    oid: string;
    name: string;
    phone: string;
    gender: CustomerGender | null;
    age_band: CustomerAgeBand | null;
    flag: CustomerFlag;
    flag_reason: string | null;
    social_handle: string | null;
    note: string | null;
    status: CustomerStatus;
    first_source_name?: string | null;
    created_by?: string | null;
    created_on?: string;
    last_action_by?: string | null;
    last_action_on?: string | null;
}

export interface CustomerAddress {
    oid: string;
    label: string | null;
    recipient_name: string;
    recipient_phone: string | null;
    address_line: string;
    district_oid: string;
    district_name_en: string;
    district_name_bn: string;
    thana_oid: string;
    thana_name_en: string;
    thana_name_bn: string;
    area_text: string | null;
    postal_code: string | null;
    is_default: boolean;
}

/** Worked out by the server over the person's own channels. A rate with nothing to divide by is null. */
export interface CustomerStats {
    orders: number;
    sales: number;
    lifetime_value: number;
    average_order: number | null;
    delivered: number;
    refused_parcels: number;
    delivered_rate: number | null;
    last_order_on: string | null;
    owed: number;
}

export interface CustomerOrder {
    oid: string;
    invoice_no: string;
    channel: 'POS' | 'ONLINE';
    status: string;
    payment_status: string | null;
    total_amount: number;
    created_on: string;
}

export interface CustomerActivity {
    oid: string;
    date: string;
    user: string;
    action: string;
    description: string | null;
}

export interface CustomerDetails {
    details: Customer;
    stats: CustomerStats;
    /** Null for someone who sells only at the counter: they never see saved addresses. */
    addresses: CustomerAddress[] | null;
    orders: CustomerOrder[];
    channels: ('POS' | 'ONLINE')[];
    activity: CustomerActivity[];
}

export interface AddressPayload {
    label: string | null;
    recipient_name: string;
    recipient_phone: string | null;
    address_line: string;
    district_oid: string;
    thana_oid: string;
    area_text: string | null;
    postal_code: string | null;
    is_default: boolean;
}

/** What the form sends. `oid` and `status` only when editing; `address` only when adding, and optional. */
export interface CustomerPayload {
    oid?: string;
    name: string;
    phone: string;
    gender: CustomerGender | null;
    age_band: CustomerAgeBand | null;
    social_handle: string | null;
    note: string | null;
    status?: CustomerStatus;
    address?: AddressPayload;
}

/** A district or thana from the place search. */
export interface Place {
    oid: string;
    name_en: string;
    name_bn: string;
    postal_code?: string | null;
}
