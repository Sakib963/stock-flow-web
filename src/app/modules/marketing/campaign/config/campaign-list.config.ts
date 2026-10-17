import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { PROMOTION_TYPES } from '@app/core/models/campaign.model';
import { ToneMap } from '@app/core/models/config.model';
import { ListShellPageConfig } from '@app/core/models/list-shell-page.model';
import { CAMPAIGN_ROUTES } from '@app/modules/marketing/campaign/constants/campaign-routes';

export const CAMPAIGN_STATUS: ToneMap = {
    Planned: { label: 'marketing.campaign.status.Planned', tone: 'warning', icon: 'lucideCalendarClock' },
    Live: { label: 'marketing.campaign.status.Live', tone: 'progress', icon: 'lucideCircleDot' },
    Completed: { label: 'marketing.campaign.status.Completed', tone: 'success', icon: 'lucideCheck' },
    Cancelled: { label: 'marketing.campaign.status.Cancelled', tone: 'neutral', icon: 'lucideX' },
};

export const DELIVERABLE_STATUS: ToneMap = {
    Pending: { label: 'marketing.campaign.deliverable.status.Pending', tone: 'neutral', icon: 'lucideClock' },
    Posted: { label: 'marketing.campaign.deliverable.status.Posted', tone: 'success', icon: 'lucideCheck' },
    Late: { label: 'marketing.campaign.deliverable.status.Late', tone: 'warning', icon: 'lucideClock' },
    Missed: { label: 'marketing.campaign.deliverable.status.Missed', tone: 'danger', icon: 'lucideX' },
};

export const PROMOTION_TYPE_TAG: ToneMap = Object.fromEntries(PROMOTION_TYPES.map((type) => [type, { label: `marketing.campaign.type.${type}`, tone: 'neutral' as const }]));

export const CAMPAIGN_LIST: ListShellPageConfig = {
    permission: 'marketing.campaign.view',
    header: {
        count: true,
        actions: [{ key: 'create', label: 'marketing.campaign.add', icon: 'lucidePlus', permission: 'marketing.campaign.create', primary: true, run: { kind: 'navigate', route: CAMPAIGN_ROUTES.create } }],
    },
    stats: [
        { key: 'planned', label: 'marketing.campaign.stat.planned', icon: 'lucideCalendarClock', tone: 'warning' },
        { key: 'live', label: 'marketing.campaign.stat.live', icon: 'lucideCircleDot', tone: 'progress' },
        { key: 'completed', label: 'marketing.campaign.stat.completed', icon: 'lucideCheck', tone: 'success' },
    ],
    filter: {
        render: 'modal',
        search: { placeholder: 'marketing.campaign.searchPlaceholder' },
        fields: [
            { key: 'status', label: 'marketing.campaign.status.label', type: 'multi-select', choices: Object.keys(CAMPAIGN_STATUS).map((value) => ({ value, label: `marketing.campaign.status.${value}` })) },
            { key: 'promotion_type', label: 'marketing.campaign.type.label', type: 'multi-select', choices: PROMOTION_TYPES.map((value) => ({ value, label: `marketing.campaign.type.${value}` })) },
        ],
    },
    table: {
        key: 'marketing.campaign',
        rowKey: 'oid',
        source: { endpoint: APIEndpoint.GET_CAMPAIGN_LIST },
        sort: { key: 'posting_start', order: 'desc' },
        columns: [
            { key: 'campaign_no', label: 'marketing.campaign.number', type: 'identifier', width: 15, sortable: true, locked: true, pin: 'start' },
            { key: 'name', label: 'marketing.campaign.name', type: 'text', width: 22, sortable: true },
            { key: 'promotion_type', label: 'marketing.campaign.type.label', type: 'status', width: 15, tones: PROMOTION_TYPE_TAG },
            { key: 'status', label: 'marketing.campaign.status.label', type: 'status', width: 12, tones: CAMPAIGN_STATUS },
            { key: 'posting_start', label: 'marketing.campaign.postingStart', type: 'date', format: 'date', width: 13, sortable: true },
            { key: 'posting_end', label: 'marketing.campaign.postingEnd', type: 'date', format: 'date', width: 13 },
            { key: 'partners', label: 'marketing.campaign.partners', type: 'number', width: 9 },
            { key: 'agreed_cost', label: 'marketing.campaign.agreedCost', type: 'money', width: 13 },
        ],
        layouts: [{ type: 'table' }],
        rowActions: [
            { key: 'view', label: 'marketing.campaign.view', icon: 'lucideEye', permission: 'marketing.campaign.view', stateful: false, run: { kind: 'navigate', route: CAMPAIGN_ROUTES.detailPattern } },
            { key: 'edit', label: 'marketing.campaign.edit', icon: 'lucidePencil', permission: 'marketing.campaign.edit', stateful: false, when: { field: 'status', in: ['Planned', 'Live'] }, run: { kind: 'navigate', route: CAMPAIGN_ROUTES.editPattern } },
        ],
        phoneRowActionStyle: 'menu',
        empty: { icon: 'lucideInbox', title: 'marketing.campaign.emptyTitle', body: 'marketing.campaign.emptyBody' },
    },
};
