/** Every route under Pre-orders, in one place, so a page and the list config cannot disagree. */
export const PRE_ORDER_ROUTES = {
    list: '/app/sales/pre-orders',
    create: '/app/sales/pre-orders/new',
    /** The list config fills `:oid` from the row. */
    detailPattern: '/app/sales/pre-orders/:oid',
    detail: (oid: string) => `/app/sales/pre-orders/${oid}`,
    edit: (oid: string) => `/app/sales/pre-orders/${oid}/edit`,
} as const;
