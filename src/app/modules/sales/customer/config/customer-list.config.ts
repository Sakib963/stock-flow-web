import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { ToneMap } from '@app/core/models/config.model';
import { CUSTOMER_AGE_BANDS, CUSTOMER_GENDERS } from '@app/core/models/customer.model';
import { ListShellPageConfig } from '@app/core/models/list-shell-page.model';
import { CUSTOMER_ROUTES } from '@app/modules/sales/customer/constants/customer-routes';

export const CUSTOMER_STATUS: ToneMap = {
    Active: { label: 'sales.customer.status.active', tone: 'success', icon: 'lucideCheck' },
    Inactive: { label: 'sales.customer.status.inactive', tone: 'neutral', icon: 'lucideCircleDashed' },
};

export const CUSTOMER_FLAG: ToneMap = {
    None: { label: 'sales.customer.flag.None', tone: 'neutral', icon: 'lucideCircleDashed' },
    Watch: { label: 'sales.customer.flag.Watch', tone: 'warning', icon: 'lucideEye' },
    Blocked: { label: 'sales.customer.flag.Blocked', tone: 'danger', icon: 'lucideBan' },
};

/**
 * District and first source are filters the server already takes, left out until the filter can
 * load its choices from the server (owed by the list shell) and sources can be set up (sales settings).
 */
export const CUSTOMER_LIST: ListShellPageConfig = {
    permission: 'sales.customer.view',
    header: {
        count: true,
        actions: [{ key: 'create', label: 'sales.customer.add', icon: 'lucidePlus', permission: 'sales.customer.create', primary: true, run: { kind: 'navigate', route: CUSTOMER_ROUTES.create } }],
    },
    // A card reports; it does not narrow the list, the same as every other list.
    stats: [
        { key: 'active', label: 'sales.customer.stat.active', icon: 'lucideCheck', tone: 'success' },
        { key: 'inactive', label: 'sales.customer.stat.inactive', icon: 'lucideCircleDashed' },
        { key: 'watch', label: 'sales.customer.stat.watch', icon: 'lucideEye', tone: 'warning' },
        { key: 'blocked', label: 'sales.customer.stat.blocked', icon: 'lucideBan', tone: 'danger' },
    ],
    filter: {
        render: 'modal',
        search: { placeholder: 'sales.customer.searchPlaceholder' },
        fields: [
            {
                key: 'status',
                label: 'sales.customer.status.label',
                type: 'select',
                choices: [
                    { value: 'Active', label: 'sales.customer.status.active' },
                    { value: 'Inactive', label: 'sales.customer.status.inactive' },
                ],
            },
            { key: 'flag', label: 'sales.customer.flag.label', type: 'select', choices: ['None', 'Watch', 'Blocked'].map((value) => ({ value, label: `sales.customer.flag.${value}` })) },
            { key: 'gender', label: 'sales.customer.gender.label', type: 'select', choices: [...CUSTOMER_GENDERS, 'unknown'].map((value) => ({ value, label: `sales.customer.gender.${value}` })) },
            { key: 'age_band', label: 'sales.customer.ageBand.label', type: 'select', choices: [...CUSTOMER_AGE_BANDS, 'unknown'].map((value) => ({ value, label: `sales.customer.ageBand.${value}` })) },
        ],
    },
    table: {
        key: 'sales.customer',
        rowKey: 'oid',
        source: { endpoint: APIEndpoint.GET_CUSTOMER_LIST },
        sort: { key: 'name', order: 'asc' },
        columns: [
            { key: 'name', label: 'sales.customer.name', type: 'name', width: 20, sortable: true, locked: true, pin: 'start' },
            { key: 'phone', label: 'sales.customer.phone', type: 'phone', width: 14, sortable: true },
            { key: 'flag', label: 'sales.customer.flag.label', type: 'status', width: 11, tones: CUSTOMER_FLAG },
            { key: 'district_name_en', label: 'sales.customer.district', type: 'text', width: 14 },
            { key: 'status', label: 'sales.customer.status.label', type: 'status', width: 11, tones: CUSTOMER_STATUS },
            { key: 'last_action_by', label: 'sales.customer.lastTouched', type: 'user', width: 16, sortable: true, sortKey: 'last_action_on', name: 'last_action_by_name' },
            { key: 'last_action_on', label: 'sales.customer.lastTouchedOn', type: 'date', format: 'date', width: 14, sortable: true, sortKey: 'last_action_on' },
            { key: 'flag_reason', label: 'sales.customer.flagReason', type: 'long-text', width: 20, hidden: true },
            { key: 'created_on', label: 'sales.customer.created', type: 'date', format: 'date', width: 12, sortable: true, hidden: true },
        ],
        layouts: [{ type: 'table' }],
        rowActions: [
            { key: 'view', label: 'sales.customer.view', icon: 'lucideEye', permission: 'sales.customer.view', stateful: false, run: { kind: 'navigate', route: CUSTOMER_ROUTES.detailPattern } },
            { key: 'edit', label: 'sales.customer.edit', icon: 'lucidePencil', permission: 'sales.customer.edit', stateful: false, run: { kind: 'navigate', route: CUSTOMER_ROUTES.editPattern } },
        ],
        phoneRowActionStyle: 'menu',
        empty: { icon: 'lucideUsers', title: 'sales.customer.emptyTitle', body: 'sales.customer.emptyBody' },
    },
};
