import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { ToneMap } from '@app/core/models/config.model';
import { ListShellPageConfig } from '@app/core/models/list-shell-page.model';

export const CATEGORY_STATUS: ToneMap = {
    Active: { label: 'configuration.category.status.active', tone: 'success', icon: 'lucideCheck' },
    Inactive: { label: 'configuration.category.status.inactive', tone: 'neutral', icon: 'lucideCircleDashed' },
};

/**
 * Categories, read only until the form round: no create action and no row actions yet, because
 * there is nowhere for them to go. Reference data with few records, so standard density.
 */
export const CATEGORY_LIST: ListShellPageConfig = {
    permission: 'configuration.category.view',
    header: { count: true },
    table: {
        key: 'configuration.category',
        rowKey: 'oid',
        source: { endpoint: APIEndpoint.GET_CATEGORY_LIST },
        density: 'standard',
        sort: { key: 'name', order: 'asc' },
        columns: [
            { key: 'category_code', label: 'configuration.category.code', type: 'identifier', width: 120, sortable: true, locked: true, pin: 'start' },
            { key: 'name', label: 'configuration.category.name', type: 'name', sub: 'description', sortable: true, locked: true },
            { key: 'status', label: 'configuration.category.status.label', type: 'status', width: 130, sortable: true, tones: CATEGORY_STATUS },
            { key: 'created_on', label: 'configuration.category.created', type: 'date', width: 130, sortable: true, hideBelow: 900 },
        ],
        layouts: [{ type: 'table' }],
        empty: { icon: 'lucideFolderTree', title: 'configuration.category.emptyTitle', body: 'configuration.category.emptyBody' },
    },
};
