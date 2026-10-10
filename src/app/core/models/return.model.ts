import { NotDeliveredReason, OrderChannel, RefundMethod } from '@app/core/models/order.model';

/** Not delivered is written only by the order's Not delivered action, so the Return dialog never offers it. */
export const RETURN_REASONS = ['changed_mind', 'size_or_fit', 'wrong_item', 'damaged_on_arrival', 'not_as_described', 'entered_by_mistake', 'other'] as const;
export type ReturnReason = (typeof RETURN_REASONS)[number] | 'not_delivered';
export type ReturnStatus = 'Pending' | 'Returned' | 'Cancelled';
export type ReturnCondition = 'Good' | 'Damaged';

export interface ReturnLine {
    oid: string;
    order_item_oid: string;
    product_oid: string;
    product_name: string;
    batch_code: string | null;
    condition: ReturnCondition;
    action: 'Restocked' | 'Disposed' | null;
    return_quantity: number;
    sold_quantity: number;
    unit_price: number;
    discount: number;
    line_refund: number;
}

export interface ReturnDetails {
    oid: string;
    return_no: string;
    order_oid: string;
    invoice_no: string;
    channel: OrderChannel;
    order_status: string;
    delivery_status: string | null;
    customer_name: string | null;
    customer_phone: string | null;
    return_reason: ReturnReason;
    not_delivered_reason: NotDeliveredReason | null;
    notes: string | null;
    status: ReturnStatus;
    refund_amount: number;
    refund_delivery_charge: boolean;
    delivery_charge: number;
    return_value: number;
    due_reduction: number;
    total_units: number;
    dispose_oid: string | null;
    created_on: string;
    created_by: string;
    edited_on: string | null;
    edited_by: string | null;
    items: ReturnLine[];
}

/** One return in the order record's Returns card. */
export interface OrderReturn {
    oid: string;
    return_no: string;
    refund_amount: number;
    return_reason: ReturnReason;
    not_delivered_reason: NotDeliveredReason | null;
    status: ReturnStatus;
    created_on: string;
    created_by_name: string;
    units: number;
}

export interface OrderReturns {
    returns: OrderReturn[];
    /** Per order line: sold, less returned, less what a Pending return already claims. */
    returnable: { order_item_oid: string; returnable: number }[];
}

export interface CreateReturn {
    oid: string;
    order_oid: string;
    return_reason: Exclude<ReturnReason, 'not_delivered'>;
    note: string | null;
    refund_delivery_charge: boolean;
    items: { order_item_oid: string; quantity: number; condition: ReturnCondition }[];
}

export interface CreatedReturn {
    return_oid: string;
    return_no: string;
    return_value: number;
    refund_amount: number;
    due_reduction: number;
}

export interface ConfirmReturn {
    oid: string;
    conditions: { oid: string; condition: ReturnCondition }[];
    refund_method?: RefundMethod;
}
