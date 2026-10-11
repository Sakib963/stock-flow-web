import { Courier, DeliveryStatus } from '@app/core/models/order.model';

export type DeliveryBatchStatus = 'Open' | 'HandedOver' | 'Cancelled';

/** An online order as a batch shows, labels and exports it. Place names are English, as the label prints them. */
export interface BatchOrder {
    oid: string;
    invoice_no: string;
    status: string;
    created_on: string;
    notes: string | null;
    tracking_token: string | null;
    dispatched_on: string | null;
    delivery_status: DeliveryStatus | null;
    courier: Courier | null;
    consignment_no: string | null;
    recipient_name: string | null;
    recipient_phone: string | null;
    address_line: string | null;
    area_text: string | null;
    postal_code: string | null;
    district: string | null;
    thana: string | null;
    units: number;
    items: string | null;
    to_collect: number;
    ready: boolean;
}

export interface BatchActivity {
    title: string;
    description: string | null;
    performed_by: string;
    performed_on: string;
}

export interface DeliveryBatchDetails {
    oid: string;
    batch_no: string;
    courier: Courier;
    status: DeliveryBatchStatus;
    note: string | null;
    cancel_note: string | null;
    created_on: string;
    created_by: string;
    handed_over_on: string | null;
    handed_over_by: string | null;
    cancelled_on: string | null;
    orders: BatchOrder[];
    activity: BatchActivity[];
}

/** An order a handover or a delivery left alone, and the state it was in. */
export interface LeftOutOrder {
    invoice_no: string;
    status: string;
    delivery_status: DeliveryStatus | null;
}
