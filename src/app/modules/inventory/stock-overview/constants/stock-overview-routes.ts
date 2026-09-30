/** Every route under Stock overview, in one place. */
export const STOCK_OVERVIEW_ROUTES = {
    list: '/app/inventory/overview',
    product: (oid: string) => `/app/inventory/overview/${oid}`,
    productPattern: '/app/inventory/overview/:oid',
} as const;
