/** Every route under Delivery batches, in one place, so a page and the list config cannot disagree. */
export const DELIVERY_BATCH_ROUTES = {
    list: '/app/sales/delivery-batches',
    create: '/app/sales/delivery-batches/new',
    /** The list config fills `:oid` from the row. */
    detailPattern: '/app/sales/delivery-batches/:oid',
    detail: (oid: string) => `/app/sales/delivery-batches/${oid}`,
} as const;
