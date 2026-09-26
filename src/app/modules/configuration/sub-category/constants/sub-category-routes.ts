/** Every route under Sub-categories, in one place, so a page and the list config cannot disagree. */
export const SUB_CATEGORY_ROUTES = {
    list: '/app/configuration/sub-categories',
    create: '/app/configuration/sub-categories/new',
    detailPattern: '/app/configuration/sub-categories/:oid',
    editPattern: '/app/configuration/sub-categories/:oid/edit',
    detail: (oid: string) => `/app/configuration/sub-categories/${oid}`,
    edit: (oid: string) => `/app/configuration/sub-categories/${oid}/edit`,
} as const;
