import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { ToneMap } from '@app/core/models/config.model';
import { ListShellPageConfig } from '@app/core/models/list-shell-page.model';
import { GIVEAWAY_ROUTES } from '@app/modules/sales/giveaway/constants/giveaway-routes';

export const GIVEAWAY_STATUS: ToneMap = {
    Draft: { label: 'sales.giveaway.status.Draft', tone: 'warning', icon: 'lucideClock' },
    Given: { label: 'sales.giveaway.status.Given', tone: 'success', icon: 'lucideGift' },
    Cancelled: { label: 'sales.giveaway.status.Cancelled', tone: 'neutral', icon: 'lucideX' },
};

/** Cost is money: its column and stat only for someone with `inventory.stock-value.view` (giveaway REQ-08). */
export const giveawayList = ({ seesMoney }: { seesMoney: boolean }): ListShellPageConfig => ({
    permission: 'sales.giveaway.view',
    header: {
        count: true,
        actions: [{ key: 'create', label: 'sales.giveaway.add', icon: 'lucidePlus', permission: 'sales.giveaway.create', primary: true, run: { kind: 'navigate', route: GIVEAWAY_ROUTES.create } }],
    },
    stats: [{ key: 'drafts', label: 'sales.giveaway.stat.drafts', icon: 'lucideClock', tone: 'warning' }, { key: 'given_this_month', label: 'sales.giveaway.stat.given', icon: 'lucideGift' }, { key: 'units_this_month', label: 'sales.giveaway.stat.units', icon: 'lucidePackage' }, ...(seesMoney ? [{ key: 'cost_this_month', label: 'sales.giveaway.stat.cost', icon: 'lucideWallet', format: 'money' as const }] : [])],
    filter: {
        render: 'modal',
        search: { placeholder: 'sales.giveaway.searchPlaceholder' },
        fields: [{ key: 'status', label: 'sales.giveaway.statusLabel', type: 'multi-select', choices: Object.keys(GIVEAWAY_STATUS).map((value) => ({ value, label: `sales.giveaway.status.${value}` })) }],
    },
    table: {
        key: 'sales.giveaway',
        rowKey: 'oid',
        source: { endpoint: APIEndpoint.GET_GIVEAWAY_LIST },
        sort: { key: 'created_on', order: 'desc' },
        columns: [
            { key: 'giveaway_no', label: 'sales.giveaway.number', type: 'identifier', width: 16, sortable: true, locked: true, pin: 'start', copy: true },
            { key: 'recipient_name', label: 'sales.giveaway.recipient', type: 'name', sub: 'recipient_phone', width: 18 },
            { key: 'status', label: 'sales.giveaway.statusLabel', type: 'status', width: 12, tones: GIVEAWAY_STATUS },
            { key: 'units', label: 'sales.order.units', type: 'quantity', width: 8 },
            ...(seesMoney ? [{ key: 'cost', label: 'sales.giveaway.cost', type: 'money' as const, width: 12 }] : []),
            { key: 'note', label: 'sales.giveaway.note', type: 'text', width: 20 },
            { key: 'created_on', label: 'sales.giveaway.savedOn', type: 'date', format: 'date-time-12', width: 15, sortable: true },
        ],
        layouts: [{ type: 'table' }],
        rowActions: [{ key: 'view', label: 'sales.order.view', icon: 'lucideEye', permission: 'sales.giveaway.view', stateful: false, run: { kind: 'navigate', route: GIVEAWAY_ROUTES.detailPattern } }],
        phoneRowActionStyle: 'menu',
        empty: { icon: 'lucideGift', title: 'sales.giveaway.emptyTitle', body: 'sales.giveaway.emptyBody' },
    },
});
