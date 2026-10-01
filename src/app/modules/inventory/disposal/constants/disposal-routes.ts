/** Every route under Disposals, in one place, so a page and the list config cannot disagree. */
export const DISPOSAL_ROUTES = {
    list: '/app/inventory/disposals',
    create: '/app/inventory/disposals/new',
    detailPattern: '/app/inventory/disposals/:oid',
    editPattern: '/app/inventory/disposals/:oid/edit',
    detail: (oid: string) => `/app/inventory/disposals/${oid}`,
    edit: (oid: string) => `/app/inventory/disposals/${oid}/edit`,
} as const;
