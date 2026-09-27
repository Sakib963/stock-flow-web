/** Every route under Products, in one place, so a page and the list config cannot disagree. */
export const PRODUCT_ROUTES = {
    list: '/app/configuration/products',
    create: '/app/configuration/products/new',
    detailPattern: '/app/configuration/products/:oid',
    editPattern: '/app/configuration/products/:oid/edit',
    detail: (oid: string) => `/app/configuration/products/${oid}`,
    edit: (oid: string) => `/app/configuration/products/${oid}/edit`,
} as const;
