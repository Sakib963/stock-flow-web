import { PosBatch } from '@app/core/models/pos.model';

export type PreOrderStatus = 'Pending' | 'Confirmed' | 'Converted' | 'Cancelled';
export type PreOrderCancelReason = 'changed_mind' | 'unreachable' | 'stock_not_coming' | 'other';
export const PRE_ORDER_CANCEL_REASONS: PreOrderCancelReason[] = ['changed_mind', 'unreachable', 'stock_not_coming', 'other'];
export type AdvanceMethod = 'cash' | 'bkash' | 'nagad' | 'card' | 'other';
export const ADVANCE_METHODS: AdvanceMethod[] = ['cash', 'bkash', 'nagad', 'card', 'other'];

/** What a product really goes for, to guide the approximate price. Null where there is no history. */
export interface PriceHints {
    /** Median paid per unit after discount on sales in the last 180 days. */
    usual_price: number | null;
    sales: number;
    last_price: number | null;
    /** The price range of batches with stock now. */
    price_from: number | null;
    price_to: number | null;
    /** Absent for someone without `inventory.stock-value.view`. */
    last_cost?: number | null;
}

/** A booked line names a product, never a batch. Its price is approximate: the real one comes from the batch at conversion. */
export interface PreOrderLine extends PriceHints {
    oid: string;
    product_oid: string;
    product_name: string;
    sku: string | null;
    quantity: number;
    unit_price: number;
    total: number;
    /** Units that could be sold now, across the product's batches. */
    sellable: number;
}

export interface PreOrderActivity {
    title: string;
    description: string | null;
    performed_by: string;
    performed_on: string;
}

export interface PreOrderDetails {
    oid: string;
    preorder_no: string;
    customer_oid: string;
    customer_name: string;
    customer_phone: string;
    status: PreOrderStatus;
    total_amount: number;
    advance_paid: number;
    advance_method: AdvanceMethod | null;
    advance_reference: string | null;
    advance_refund_due: number;
    advance_refunded: number;
    refunded_on: string | null;
    expected_date: string | null;
    notes: string | null;
    cancel_reason: PreOrderCancelReason | null;
    cancel_note: string | null;
    converted_order_oid: string | null;
    converted_invoice_no: string | null;
    created_on: string;
    created_by: string;
    lines: PreOrderLine[];
    activity: PreOrderActivity[];
}

export interface PreOrderPayload {
    oid: string;
    customer: { phone: string; name: string | null };
    lines: { product_oid: string; quantity: number; unit_price: number }[];
    advance_paid: number;
    advance_method: AdvanceMethod | null;
    advance_reference: string | null;
    expected_date: string | null;
    notes: string | null;
}

/** One line of a customer's open booking, to warn before the same product is booked twice for them. */
export interface OpenBookingLine {
    oid: string;
    preorder_no: string;
    status: PreOrderStatus;
    product_oid: string;
    quantity: number;
}

/** A catalogue product to book, stock or not. `price` is a starting point for the approximate price. */
export interface PreOrderProduct extends PriceHints {
    product_oid: string;
    product_name: string;
    sku: string | null;
    category_name?: string | null;
    sub_category_name?: string | null;
    sellable: number;
    price: number;
}

/** A booked line as the online order page converts it: the batches of its product an order can take. */
export interface ConversionLine {
    oid: string;
    product_oid: string;
    product_name: string;
    sku: string | null;
    quantity: number;
    /** The approximate price booked: a hint, never the order's price. */
    unit_price: number;
    batches: PosBatch[];
}

/** A booking opened on the online order page to become an order (pre-order REQ-07). */
export interface ConversionBooking {
    oid: string;
    preorder_no: string;
    status: PreOrderStatus;
    customer_phone: string;
    customer_name: string;
    /** The advance still held, which becomes what the order has been paid. */
    advance: number;
    advance_method: AdvanceMethod | null;
    advance_reference: string | null;
    notes: string | null;
    lines: ConversionLine[];
}
