/** Every route under Stock adjustments, in one place, so a page and the list config cannot disagree. */
export const STOCK_ADJUSTMENT_ROUTES = {
    list: '/app/inventory/stock-adjustments',
    create: '/app/inventory/stock-adjustments/new',
    /** The create page with Opening stock chosen, for the stock overview's shortcut. */
    openingStock: '/app/inventory/stock-adjustments/new?reason=opening_stock',
    detailPattern: '/app/inventory/stock-adjustments/:oid',
    editPattern: '/app/inventory/stock-adjustments/:oid/edit',
    detail: (oid: string) => `/app/inventory/stock-adjustments/${oid}`,
    edit: (oid: string) => `/app/inventory/stock-adjustments/${oid}/edit`,
} as const;
