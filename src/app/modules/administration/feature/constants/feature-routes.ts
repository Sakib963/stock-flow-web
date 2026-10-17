/** Every route under the feature registry, in one place, so a page and the list config cannot disagree. */
export const FEATURE_ROUTES = {
    list: '/app/administration/features',
    detailPattern: '/app/administration/features/:oid',
    editPattern: '/app/administration/features/:oid/edit',
    detail: (oid: string) => `/app/administration/features/${oid}`,
    edit: (oid: string) => `/app/administration/features/${oid}/edit`,
} as const;
