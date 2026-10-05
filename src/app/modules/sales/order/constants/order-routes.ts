/** Every route under Orders, in one place, so a page and the list config cannot disagree. */
export const ORDER_ROUTES = {
    list: '/app/sales/orders',
    /** The list config fills `:oid` from the row. */
    detailPattern: '/app/sales/orders/:oid',
    detail: (oid: string) => `/app/sales/orders/${oid}`,
    historyList: '/app/sales/order-history',
    historyDetailPattern: '/app/sales/order-history/:oid',
} as const;
