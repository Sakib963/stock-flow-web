/** Every route under Customers, in one place, so a page and the list config cannot disagree. */
export const CUSTOMER_ROUTES = {
    list: '/app/sales/customers',
    create: '/app/sales/customers/new',
    /** The list config fills `:oid` from the row; a page fills it from what it just saved. */
    detailPattern: '/app/sales/customers/:oid',
    editPattern: '/app/sales/customers/:oid/edit',
    detail: (oid: string) => `/app/sales/customers/${oid}`,
    edit: (oid: string) => `/app/sales/customers/${oid}/edit`,
} as const;
