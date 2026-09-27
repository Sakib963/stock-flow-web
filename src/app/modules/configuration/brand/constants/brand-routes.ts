/** Every route under Brands, in one place, so a page and the list config cannot disagree. */
export const BRAND_ROUTES = {
    list: '/app/configuration/brands',
    create: '/app/configuration/brands/new',
    /** The list config fills `:oid` from the row; a page fills it from what it just saved. */
    detailPattern: '/app/configuration/brands/:oid',
    editPattern: '/app/configuration/brands/:oid/edit',
    detail: (oid: string) => `/app/configuration/brands/${oid}`,
    edit: (oid: string) => `/app/configuration/brands/${oid}/edit`,
} as const;
