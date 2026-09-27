/** Every route under Warehouses, in one place, so a page and the list config cannot disagree. */
export const WAREHOUSE_ROUTES = {
    list: '/app/configuration/warehouses',
    create: '/app/configuration/warehouses/new',
    /** The list config fills `:oid` from the row; a page fills it from what it just saved. */
    detailPattern: '/app/configuration/warehouses/:oid',
    editPattern: '/app/configuration/warehouses/:oid/edit',
    detail: (oid: string) => `/app/configuration/warehouses/${oid}`,
    edit: (oid: string) => `/app/configuration/warehouses/${oid}/edit`,
} as const;
