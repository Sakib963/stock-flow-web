import { AddressPayload, Customer, CustomerAddress, CustomerAgeBand, CustomerGender, CustomerOrder, CustomerStats, Place } from '@app/core/models/customer.model';
import { CartLine, PaymentMethod } from '@app/core/models/pos.model';

export interface OrderSource {
    oid: string;
    platform: string;
    name: string;
}

/** What the page needs before the first order: where orders come in, and the two delivery charges. */
export interface OnlineOrderSetup {
    sources: OrderSource[];
    delivery_charge_inside: number;
    delivery_charge_outside: number;
    home_district: Place | null;
    logo_url: string | null;
}

/** What a phone tells the moderator. Addresses are null for someone who does not sell online. */
export interface PhoneLookup {
    phone: string;
    customer: Pick<Customer, 'oid' | 'name' | 'phone' | 'gender' | 'age_band' | 'flag' | 'flag_reason' | 'status'> | null;
    addresses?: CustomerAddress[] | null;
    history?: CustomerStats & { cancelled_fake_or_unreachable: number };
    last_orders?: (CustomerOrder & { delivery_status: string | null })[];
}

/** One place an address can mean, ranked. Equal ranks are a tie the moderator settles. */
export interface PlaceCandidate {
    rank: number;
    district: Place;
    thana: (Place & { type: string }) | null;
    area: (Place & { kind: string }) | null;
    reasons: string[];
}

/** The order helper's reading of a pasted message. */
export interface ChatReading {
    phone: string | null;
    other_phones: string[];
    name: string | null;
    address_line: string | null;
    /** The area the template named, when it named one. */
    area: string | null;
    location: { postal_code: string | null; candidates: PlaceCandidate[] } | null;
    lookup: Omit<PhoneLookup, 'phone'> | null;
}

/** What "inside" means for the delivery charge, and the two charges (sales REQ-39). */
export interface DeliveryCharges {
    home_district_oid: string;
    delivery_charge_inside: number;
    delivery_charge_outside: number;
}

export const PAYMENT_TERMS = ['COD', 'ADVANCE', 'PREPAID'] as const;
export type PaymentTerms = (typeof PAYMENT_TERMS)[number];

export interface OnlineOrderPayload {
    oid: string;
    customer: { phone: string; name: string | null; gender: CustomerGender | null; age_band: CustomerAgeBand | null };
    address: { oid: string } | AddressPayload;
    source_oid: string;
    payment_type: PaymentTerms;
    payment_method?: PaymentMethod;
    payment_reference: string | null;
    amount_paid?: number;
    delivery_charge: number;
    total_amount: number;
    blocked_acknowledged: boolean;
    notes: string | null;
    lines: { inventory_oid: string; quantity: number; discount: number }[];
}

export interface OnlineOrderResult {
    oid: string;
    invoice_no: string;
    customer_oid: string;
    total_amount: number;
    amount_paid: number;
    tracking_token: string;
}

/** A half-made order kept on the server: its lines priced now, and the address as far as it was typed. */
export interface OnlineDraft {
    oid: string;
    invoice_no: string;
    draft_label: string | null;
    customer_name: string | null;
    customer_phone: string | null;
    notes: string | null;
    payment_type: PaymentTerms | null;
    delivery_charge: number;
    total_amount: number;
    created_on: string;
    saved_by: string | null;
    source_oid: string | null;
    customer_address_oid: string | null;
    recipient_name: string | null;
    recipient_phone: string | null;
    address_line: string | null;
    area_text: string | null;
    postal_code: string | null;
    district_oid: string | null;
    district_name_en: string | null;
    district_name_bn: string | null;
    thana_oid: string | null;
    thana_name_en: string | null;
    thana_name_bn: string | null;
    lines: CartLine[];
}

export interface OnlineDraftPayload {
    oid: string;
    draft_label: string | null;
    customer: { phone: string | null; name: string | null };
    address?: { oid: string } | AddressPayload;
    source_oid: string | null;
    payment_type: PaymentTerms;
    delivery_charge: number;
    notes: string | null;
    lines: { inventory_oid: string; quantity: number; discount: number }[];
}
