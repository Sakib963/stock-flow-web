/** Every route under Categories, in one place, so a page and the list config cannot disagree. */
export const CATEGORY_ROUTES = {
    list: '/app/configuration/categories',
    create: '/app/configuration/categories/new',
    /** The list config fills `:oid` from the row; a page fills it from what it just saved. */
    detailPattern: '/app/configuration/categories/:oid',
    editPattern: '/app/configuration/categories/:oid/edit',
    detail: (oid: string) => `/app/configuration/categories/${oid}`,
    edit: (oid: string) => `/app/configuration/categories/${oid}/edit`,
} as const;
