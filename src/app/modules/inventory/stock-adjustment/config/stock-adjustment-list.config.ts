import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { ToneMap } from '@app/core/models/config.model';
import { ListShellPageConfig } from '@app/core/models/list-shell-page.model';
import { ADJUSTMENT_REASONS } from '@app/core/models/stock-adjustment.model';
import { STOCK_ADJUSTMENT_ROUTES } from '@app/modules/inventory/stock-adjustment/constants/stock-adjustment-routes';
import { STOCK_VALUE } from '@app/modules/inventory/stock-overview/config/stock-overview-list.config';

/** The purchase order's colours: amber while typed, brand tint while waiting, success once verified. */
export const STOCK_ADJUSTMENT_STATUS: ToneMap = {
    Draft: { label: 'inventory.stockAdjustment.status.draft', tone: 'warning', icon: 'lucideFilePen' },
    Submitted: { label: 'inventory.stockAdjustment.status.submitted', tone: 'progress', icon: 'lucideSend' },
    Verified: { label: 'inventory.stockAdjustment.status.verified', tone: 'success', icon: 'lucideBadgeCheck' },
    Rejected: { label: 'inventory.stockAdjustment.status.rejected', tone: 'danger', icon: 'lucideCircleX' },
    Cancelled: { label: 'inventory.stockAdjustment.status.cancelled', tone: 'neutral', icon: 'lucideBan' },
};

export const STOCK_ADJUSTMENT_REASON: ToneMap = {
    opening_stock: { label: 'inventory.stockAdjustment.reason.opening_stock', tone: 'success', icon: 'lucidePackagePlus' },
    found: { label: 'inventory.stockAdjustment.reason.found', tone: 'success', icon: 'lucidePackagePlus' },
    lost: { label: 'inventory.stockAdjustment.reason.lost', tone: 'warning', icon: 'lucideSearchX' },
    theft: { label: 'inventory.stockAdjustment.reason.theft', tone: 'danger', icon: 'lucideBan' },
    entry_error: { label: 'inventory.stockAdjustment.reason.entry_error', tone: 'neutral', icon: 'lucidePencil' },
};

const SUBMITTED = { field: 'status', in: ['Submitted'] } as const;
const EDITABLE = { field: 'status', in: ['Draft', 'Submitted'] } as const;

export const STOCK_ADJUSTMENT_LIST: ListShellPageConfig = {
    permission: 'inventory.stock-adjustment.view',
    header: {
        count: true,
        actions: [
            { key: 'create', label: 'inventory.stockAdjustment.add', icon: 'lucidePlus', permission: 'inventory.stock-adjustment.create', primary: true, run: { kind: 'navigate', route: STOCK_ADJUSTMENT_ROUTES.create } },
        ],
    },
    stats: [
        { key: 'draft', label: 'inventory.stockAdjustment.stat.draft', icon: 'lucideFilePen', tone: 'warning' },
        { key: 'submitted', label: 'inventory.stockAdjustment.stat.submitted', icon: 'lucideSend' },
        { key: 'verified_this_month', label: 'inventory.stockAdjustment.stat.verified', icon: 'lucideBadgeCheck', tone: 'success' },
        { key: 'rejected_this_month', label: 'inventory.stockAdjustment.stat.rejected', icon: 'lucideCircleX', tone: 'danger' },
    ],
    filter: {
        render: 'modal',
        search: { placeholder: 'inventory.stockAdjustment.searchPlaceholder' },
        fields: [
            { key: 'status', label: 'inventory.stockAdjustment.status.label', type: 'select', choices: Object.entries(STOCK_ADJUSTMENT_STATUS).map(([value, style]) => ({ value, label: style.label })) },
            { key: 'reason', label: 'inventory.stockAdjustment.reason.label', type: 'select', choices: ADJUSTMENT_REASONS.map((value) => ({ value, label: `inventory.stockAdjustment.reason.${value}` })) },
        ],
    },
    table: {
        key: 'inventory.stock-adjustment',
        rowKey: 'oid',
        source: { endpoint: APIEndpoint.GET_STOCK_ADJUSTMENT_LIST },
        sort: { key: 'created_on', order: 'desc' },
        columns: [
            { key: 'adjustment_number', label: 'inventory.stockAdjustment.number', type: 'identifier', width: 14, sortable: true, locked: true, pin: 'start', copy: true },
            { key: 'reason', label: 'inventory.stockAdjustment.reason.label', type: 'status', width: 14, sortable: true, tones: STOCK_ADJUSTMENT_REASON },
            { key: 'status', label: 'inventory.stockAdjustment.status.label', type: 'status', width: 12, sortable: true, tones: STOCK_ADJUSTMENT_STATUS },
            { key: 'line_count', label: 'inventory.stockAdjustment.lineCount', type: 'number', width: 8 },
            { key: 'units_in', label: 'inventory.stockAdjustment.unitsIn', type: 'number', width: 9 },
            { key: 'units_out', label: 'inventory.stockAdjustment.unitsOut', type: 'number', width: 9 },
            { key: 'value_in', label: 'inventory.stockAdjustment.valueIn', type: 'money', width: 12, permission: STOCK_VALUE },
            { key: 'value_out', label: 'inventory.stockAdjustment.valueOut', type: 'money', width: 12, permission: STOCK_VALUE },
            { key: 'created_on', label: 'inventory.stockAdjustment.createdOn', type: 'date', format: 'date', width: 13, sortable: true },
            { key: 'created_by', label: 'inventory.stockAdjustment.createdBy', type: 'user', width: 16, name: 'created_by_name', hidden: true },
        ],
        layouts: [{ type: 'table' }],
        rowActions: [
            { key: 'view', label: 'inventory.stockAdjustment.view', icon: 'lucideEye', permission: 'inventory.stock-adjustment.view', stateful: false, run: { kind: 'navigate', route: STOCK_ADJUSTMENT_ROUTES.detailPattern } },
            { key: 'edit', label: 'inventory.stockAdjustment.edit', icon: 'lucidePencil', permission: 'inventory.stock-adjustment.edit', stateful: false, when: EDITABLE, run: { kind: 'navigate', route: STOCK_ADJUSTMENT_ROUTES.editPattern } },
            // Verify lives on the record page, where the lines are read first: it is never a click from a list.
            { key: 'open', label: 'inventory.stockAdjustment.openToVerify', icon: 'lucideBadgeCheck', permission: 'inventory.stock-adjustment.approve', stateful: false, when: SUBMITTED, run: { kind: 'navigate', route: STOCK_ADJUSTMENT_ROUTES.detailPattern } },
        ],
        rowActionStyle: 'inline',
        phoneRowActionStyle: 'menu',
        empty: { icon: 'lucideSlidersHorizontal', title: 'inventory.stockAdjustment.emptyTitle', body: 'inventory.stockAdjustment.emptyBody', action: 'create' },
    },
};
