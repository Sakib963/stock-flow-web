/** Every route under Partners, in one place, so a page and the list config cannot disagree. */
export const PARTNER_ROUTES = {
    list: '/app/marketing/partners',
    create: '/app/marketing/partners/new',
    /** The list config fills `:oid` from the row; a page fills it from what it just saved. */
    detailPattern: '/app/marketing/partners/:oid',
    editPattern: '/app/marketing/partners/:oid/edit',
    detail: (oid: string) => `/app/marketing/partners/${oid}`,
    edit: (oid: string) => `/app/marketing/partners/${oid}/edit`,
} as const;
