/** Every route under Returns, in one place, so a page and the list config cannot disagree. */
export const RETURN_ROUTES = {
    list: '/app/sales/returns',
    /** The list config fills `:oid` from the row. */
    detailPattern: '/app/sales/returns/:oid',
    detail: (oid: string) => `/app/sales/returns/${oid}`,
} as const;
