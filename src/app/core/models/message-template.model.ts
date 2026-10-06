/** The stages a template can be matched to: the order's status, its parcel's, or what it owes back. */
export const MESSAGE_STAGES = ['Pending', 'Confirmed', 'Packed', 'WithCourier', 'Delivered', 'Failed', 'Cancelled', 'ToRefund', 'Refunded'] as const;
export type MessageStage = (typeof MESSAGE_STAGES)[number];

export const MESSAGE_PLACEHOLDERS = ['customer_name', 'invoice_no', 'items', 'total', 'due', 'delivery_charge', 'address', 'tracking_link', 'business_name', 'business_phone'] as const;
export type MessagePlaceholder = (typeof MESSAGE_PLACEHOLDERS)[number];

export interface MessageTemplate {
    oid: string;
    name: string;
    language: 'en' | 'bn';
    body: string;
    /** Empty means every stage. */
    order_statuses: MessageStage[];
    status: 'Active' | 'Inactive';
}

export type MessageTemplatePayload = Omit<MessageTemplate, 'oid'> & { oid?: string };
