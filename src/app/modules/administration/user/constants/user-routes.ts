export const USER_ROUTES = {
    list: '/app/administration/users',
    create: '/app/administration/users/new',
    detailPattern: '/app/administration/users/:oid',
    editPattern: '/app/administration/users/:oid/edit',
    detail: (oid: string) => `/app/administration/users/${oid}`,
    edit: (oid: string) => `/app/administration/users/${oid}/edit`,
} as const;
