import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { ToneMap } from '@app/core/models/config.model';
import { ListShellPageConfig } from '@app/core/models/list-shell-page.model';
import { DISPOSAL_METHODS } from '@app/core/models/disposal.model';
import { DISPOSAL_ROUTES } from '@app/modules/inventory/disposal/constants/disposal-routes';
import { STOCK_VALUE } from '@app/modules/inventory/stock-overview/config/stock-overview-list.config';

/** The stock adjustment's colours: amber while typed, brand tint while waiting, success once approved. */
export const DISPOSAL_STATUS: ToneMap = {
    Draft: { label: 'inventory.disposal.status.draft', tone: 'warning', icon: 'lucideFilePen' },
    Submitted: { label: 'inventory.disposal.status.submitted', tone: 'progress', icon: 'lucideSend' },
    Approved: { label: 'inventory.disposal.status.approved', tone: 'success', icon: 'lucideBadgeCheck' },
    Rejected: { label: 'inventory.disposal.status.rejected', tone: 'danger', icon: 'lucideCircleX' },
    Cancelled: { label: 'inventory.disposal.status.cancelled', tone: 'neutral', icon: 'lucideBan' },
};

export const DISPOSAL_METHOD: ToneMap = Object.fromEntries(DISPOSAL_METHODS.map((method) => [method, { label: `inventory.disposal.method.${method}`, tone: 'neutral' }]));

const SUBMITTED = { field: 'status', in: ['Submitted'] } as const;
const EDITABLE = { field: 'status', in: ['Draft', 'Submitted'] } as const;

export const DISPOSAL_LIST: ListShellPageConfig = {
    permission: 'inventory.product-dispose.view',
    header: {
        count: true,
        actions: [
            { key: 'create', label: 'inventory.disposal.add', icon: 'lucidePlus', permission: 'inventory.product-dispose.create', primary: true, run: { kind: 'navigate', route: DISPOSAL_ROUTES.create } },
        ],
    },
    stats: [
        { key: 'draft', label: 'inventory.disposal.stat.draft', icon: 'lucideFilePen', tone: 'warning' },
        { key: 'submitted', label: 'inventory.disposal.stat.submitted', icon: 'lucideSend' },
        { key: 'approved_this_month', label: 'inventory.disposal.stat.approved', icon: 'lucideBadgeCheck', tone: 'success' },
    ],
    filter: {
        render: 'modal',
        search: { placeholder: 'inventory.disposal.searchPlaceholder' },
        fields: [
            { key: 'status', label: 'inventory.disposal.status.label', type: 'select', choices: Object.entries(DISPOSAL_STATUS).map(([value, style]) => ({ value, label: style.label })) },
        ],
    },
    table: {
        key: 'inventory.disposal',
        rowKey: 'oid',
        source: { endpoint: APIEndpoint.GET_DISPOSAL_LIST },
        sort: { key: 'created_on', order: 'desc' },
        columns: [
            { key: 'dispose_no', label: 'inventory.disposal.number', type: 'identifier', width: 14, sortable: true, locked: true, pin: 'start', copy: true },
            { key: 'disposal_date', label: 'inventory.disposal.date', type: 'date', format: 'date', width: 12, sortable: true },
            { key: 'status', label: 'inventory.disposal.status.label', type: 'status', width: 12, sortable: true, tones: DISPOSAL_STATUS },
            { key: 'method', label: 'inventory.disposal.method.label', type: 'status', width: 12, tones: DISPOSAL_METHOD },
            { key: 'line_count', label: 'inventory.disposal.lineCount', type: 'number', width: 8 },
            { key: 'units', label: 'inventory.disposal.units', type: 'number', width: 9 },
            { key: 'value', label: 'inventory.disposal.value', type: 'money', width: 12, permission: STOCK_VALUE },
            { key: 'created_on', label: 'inventory.disposal.createdOn', type: 'date', format: 'date', width: 13, sortable: true },
            { key: 'created_by', label: 'inventory.disposal.createdBy', type: 'user', width: 16, name: 'created_by_name', hidden: true },
        ],
        layouts: [{ type: 'table' }],
        rowActions: [
            { key: 'view', label: 'inventory.disposal.view', icon: 'lucideEye', permission: 'inventory.product-dispose.view', stateful: false, run: { kind: 'navigate', route: DISPOSAL_ROUTES.detailPattern } },
            { key: 'edit', label: 'inventory.disposal.edit', icon: 'lucidePencil', permission: 'inventory.product-dispose.edit', stateful: false, when: EDITABLE, run: { kind: 'navigate', route: DISPOSAL_ROUTES.editPattern } },
            // Approve lives on the record page, where the lines are read first: it is never a click from a list.
            { key: 'open', label: 'inventory.disposal.openToApprove', icon: 'lucideBadgeCheck', permission: 'inventory.product-dispose.approve', stateful: false, when: SUBMITTED, run: { kind: 'navigate', route: DISPOSAL_ROUTES.detailPattern } },
        ],
        rowActionStyle: 'inline',
        phoneRowActionStyle: 'menu',
        empty: { icon: 'lucideTrash2', title: 'inventory.disposal.emptyTitle', body: 'inventory.disposal.emptyBody', action: 'create' },
    },
};
