export const ROLE_ROUTES = {
    list: '/app/administration/roles',
    create: '/app/administration/roles/new',
    detailPattern: '/app/administration/roles/:oid',
    editPattern: '/app/administration/roles/:oid/edit',
    detail: (oid: string) => `/app/administration/roles/${oid}`,
    edit: (oid: string) => `/app/administration/roles/${oid}/edit`,
} as const;
