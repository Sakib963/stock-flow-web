/** Every route under Giveaways, in one place, so a page and the list config cannot disagree. */
export const GIVEAWAY_ROUTES = {
    list: '/app/sales/giveaways',
    create: '/app/sales/giveaways/new',
    /** The list config fills `:oid` from the row. */
    detailPattern: '/app/sales/giveaways/:oid',
    detail: (oid: string) => `/app/sales/giveaways/${oid}`,
} as const;
