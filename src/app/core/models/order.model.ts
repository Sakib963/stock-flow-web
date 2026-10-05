/** Orders is every order with every action; Order history is the person's own with view, confirm and cancel. */
export type OrderScope = 'all' | 'history';

export type OrderChannel = 'POS' | 'ONLINE';
export type DeliveryStatus = 'Preparing' | 'Packed' | 'WithCourier' | 'Delivered' | 'Failed' | 'BackInShop';

export const CONFIRMED_VIA = ['PhoneCall', 'Message', 'AdvanceReceived', 'NotNeeded'] as const;
export type ConfirmedVia = (typeof CONFIRMED_VIA)[number];

/** Split by whose side it came from (sales REQ-53), so the business's own failures are never blamed on a buyer. */
export const CANCEL_REASONS = { customer: ['changed_mind', 'unreachable', 'fake_order', 'price', 'ordered_elsewhere'], business: ['out_of_stock', 'duplicate', 'cannot_deliver'], other: ['other'] } as const;
export type CancelReason = (typeof CANCEL_REASONS)[keyof typeof CANCEL_REASONS][number];

export const COURIERS = ['Pathao', 'Steadfast', 'RedX', 'Paperfly', 'Sundarban', 'OwnRider', 'Other'] as const;
export type Courier = (typeof COURIERS)[number];

export const NOT_DELIVERED_REASONS = ['refused', 'unreachable', 'wrong_address', 'other'] as const;
export type NotDeliveredReason = (typeof NOT_DELIVERED_REASONS)[number];

export interface OrderLine {
    oid: string;
    product_oid: string;
    product_name: string;
    batch_code: string | null;
    quantity: number;
    returned_qty: number;
    unit_price: number;
    discount: number;
    total: number;
}

export interface OrderHistoryEntry {
    kind: 'Order' | 'Delivery' | 'Payment' | 'Refund';
    from_status: string | null;
    to_status: string;
    reason: string | null;
    performed_by: string;
    performed_by_name: string | null;
    performed_on: string;
}

export interface OrderOnline {
    recipient_name: string | null;
    recipient_phone: string | null;
    address_line: string | null;
    area_text: string | null;
    postal_code: string | null;
    district_name_en: string | null;
    district_name_bn: string | null;
    thana_name_en: string | null;
    thana_name_bn: string | null;
    source_name: string | null;
    confirmed_via: ConfirmedVia | null;
    confirmed_note: string | null;
    confirmed_on: string | null;
    confirmed_by: string | null;
    risk_own_delivered_rate: number | null;
    risk_flag: string | null;
    delivery_status: DeliveryStatus | null;
    packed_on: string | null;
    courier: Courier | null;
    consignment_no: string | null;
}

export interface OrderDetails {
    oid: string;
    invoice_no: string;
    channel: OrderChannel;
    status: string;
    customer_oid: string | null;
    customer_name: string | null;
    customer_phone: string | null;
    subtotal: number;
    discount_total: number;
    delivery_charge: number;
    total_amount: number;
    amount_paid: number;
    amount_refunded: number;
    payment_type: 'COD' | 'ADVANCE' | 'PREPAID' | null;
    payment_method: string | null;
    payment_status: string;
    refund_status: 'None' | 'ToRefund' | 'Refunded';
    refund_due: number;
    dispatched_on: string | null;
    delivered_on: string | null;
    cancelled_on: string | null;
    cancel_reason_code: CancelReason | null;
    cancel_reason: string | null;
    sold_on: string | null;
    tracking_token: string | null;
    notes: string | null;
    created_by: string;
    created_by_name: string | null;
    created_on: string;
    items: OrderLine[];
    status_history: OrderHistoryEntry[];
    online: OrderOnline | null;
}
