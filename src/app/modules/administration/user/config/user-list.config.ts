import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { ToneMap } from '@app/core/models/config.model';
import { ListShellPageConfig } from '@app/core/models/list-shell-page.model';
import { USER_ROUTES } from '@app/modules/administration/user/constants/user-routes';

export const USER_STATUS: ToneMap = {
    Active: { label: 'administration.user.status.Active', tone: 'success', icon: 'lucideCheck' },
    Inactive: { label: 'administration.user.status.Inactive', tone: 'neutral', icon: 'lucideCircleDashed' },
    Deleted: { label: 'administration.user.status.Deleted', tone: 'danger', icon: 'lucideTrash2' },
};

export const USER_LIST: ListShellPageConfig = {
    permission: 'administration.user.view',
    header: {
        count: true,
        actions: [{ key: 'create', label: 'administration.user.add', icon: 'lucideUserPlus', permission: 'administration.user.create', primary: true, run: { kind: 'navigate', route: USER_ROUTES.create } }],
    },
    stats: [
        { key: 'active', label: 'administration.user.stat.active', icon: 'lucideCheck', tone: 'success' },
        { key: 'inactive', label: 'administration.user.stat.inactive', icon: 'lucideCircleDashed' },
        { key: 'never_signed_in', label: 'administration.user.stat.neverSignedIn', icon: 'lucideClock' },
    ],
    filter: {
        render: 'modal',
        search: { placeholder: 'administration.user.searchPlaceholder' },
        fields: [
            {
                key: 'status',
                label: 'administration.user.status.label',
                type: 'select',
                choices: [
                    { value: 'Active', label: 'administration.user.status.Active' },
                    { value: 'Inactive', label: 'administration.user.status.Inactive' },
                    { value: 'Deleted', label: 'administration.user.status.Deleted' },
                ],
            },
            { key: 'role', label: 'administration.user.role', type: 'select', choices: { endpoint: APIEndpoint.GET_ASSIGNABLE_ROLES, value: 'oid', label: 'name' } },
        ],
    },
    table: {
        key: 'administration.user',
        rowKey: 'oid',
        source: { endpoint: APIEndpoint.GET_USER_LIST },
        sort: { key: 'name', order: 'asc' },
        columns: [
            { key: 'name', label: 'administration.user.name', type: 'name', sub: 'email', thumb: 'photo', width: 28, sortable: true, locked: true, pin: 'start' },
            { key: 'mobile_number', label: 'administration.user.phone', type: 'phone', width: 16 },
            { key: 'role_name', label: 'administration.user.role', type: 'text', width: 18, sortable: true, sortKey: 'role' },
            { key: 'designation', label: 'administration.user.designation', type: 'text', width: 14, hidden: true },
            { key: 'status', label: 'administration.user.status.label', type: 'status', width: 16, sortable: true, tones: USER_STATUS },
            { key: 'last_sign_in_on', label: 'administration.user.lastSignIn', type: 'date', format: 'relative', width: 22, sortable: true },
        ],
        layouts: [{ type: 'table' }],
        rowActions: [
            { key: 'view', label: 'administration.user.view', icon: 'lucideEye', permission: 'administration.user.view', stateful: false, run: { kind: 'navigate', route: USER_ROUTES.detailPattern } },
            { key: 'edit', label: 'administration.user.edit', icon: 'lucidePencil', permission: 'administration.user.edit', stateful: false, when: { field: 'status', in: ['Active', 'Inactive'] }, run: { kind: 'navigate', route: USER_ROUTES.editPattern } },
        ],
        phoneRowActionStyle: 'menu',
        empty: { icon: 'lucideUsers', title: 'administration.user.emptyTitle', body: 'administration.user.emptyBody' },
    },
};
