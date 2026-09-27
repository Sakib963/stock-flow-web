/** Every route under Suppliers, in one place, so a page and the list config cannot disagree. */
export const SUPPLIER_ROUTES = {
    list: '/app/configuration/suppliers',
    create: '/app/configuration/suppliers/new',
    /** The list config fills `:oid` from the row; a page fills it from what it just saved. */
    detailPattern: '/app/configuration/suppliers/:oid',
    editPattern: '/app/configuration/suppliers/:oid/edit',
    detail: (oid: string) => `/app/configuration/suppliers/${oid}`,
    edit: (oid: string) => `/app/configuration/suppliers/${oid}/edit`,
} as const;
