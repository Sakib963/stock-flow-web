/** Every route under Aisles, in one place, so a page and the list config cannot disagree. */
export const AISLE_ROUTES = {
    list: '/app/configuration/aisles',
    create: '/app/configuration/aisles/new',
    detailPattern: '/app/configuration/aisles/:oid',
    editPattern: '/app/configuration/aisles/:oid/edit',
    detail: (oid: string) => `/app/configuration/aisles/${oid}`,
    edit: (oid: string) => `/app/configuration/aisles/${oid}/edit`,
} as const;
