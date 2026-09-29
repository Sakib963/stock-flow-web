/** Every route under Purchase orders, in one place, so a page and the list config cannot disagree. */
export const PURCHASE_ORDER_ROUTES = {
    list: '/app/inventory/purchase-orders',
    create: '/app/inventory/purchase-orders/new',
    /** The list config fills `:oid` from the row; a page fills it from what it just saved. */
    detailPattern: '/app/inventory/purchase-orders/:oid',
    editPattern: '/app/inventory/purchase-orders/:oid/edit',
    verifyPattern: '/app/inventory/purchase-orders/:oid/verify',
    detail: (oid: string) => `/app/inventory/purchase-orders/${oid}`,
    edit: (oid: string) => `/app/inventory/purchase-orders/${oid}/edit`,
    verify: (oid: string) => `/app/inventory/purchase-orders/${oid}/verify`,
} as const;
