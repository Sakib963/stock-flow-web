/** Every route under the feature registry, in one place, so a page and the list config cannot disagree. */
export const FEATURE_ROUTES = {
    list: '/app/system/features',
    detailPattern: '/app/system/features/:oid',
    editPattern: '/app/system/features/:oid/edit',
    detail: (oid: string) => `/app/system/features/${oid}`,
    edit: (oid: string) => `/app/system/features/${oid}/edit`,
} as const;
