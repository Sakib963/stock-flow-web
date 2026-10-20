import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { ToneMap } from '@app/core/models/config.model';
import { TableConfig, TableSource } from '@app/core/models/table.model';

export const ANSWER: ToneMap = {
    '2xx': { label: 'system.health.requests.statusClass.2xx', tone: 'success', icon: 'lucideCircleCheck' },
    '3xx': { label: 'system.health.requests.statusClass.3xx', tone: 'neutral', icon: 'lucideMinus' },
    '4xx': { label: 'system.health.requests.statusClass.4xx', tone: 'warning', icon: 'lucideBan' },
    '5xx': { label: 'system.health.requests.statusClass.5xx', tone: 'danger', icon: 'lucideCircleX' },
};

export const REQUEST_LIST: TableConfig & { source: TableSource } = {
    key: 'system.health.requests',
    rowKey: 'oid',
    source: {
        endpoint: APIEndpoint.GET_REQUEST_LIST,
        params: {
            date_from: { context: 'date_from' },
            date_to: { context: 'date_to' },
            person: { context: 'person' },
            status: { context: 'status' },
            route: { context: 'route' },
            ip: { context: 'ip' },
            request_id: { context: 'request_id' },
        },
    },
    pageSize: { default: 50, options: [20, 50, 100] },
    columns: [
        { key: 'occurred_on', label: 'system.health.requests.when', type: 'date', format: 'date-time-12', width: 15, locked: true },
        { key: 'email', label: 'system.health.requests.who', type: 'user', name: 'name', width: 17 },
        { key: 'endpoint', label: 'system.health.requests.route', type: 'identifier', width: 30 },
        { key: 'status_class', label: 'system.health.requests.status', type: 'status', tones: ANSWER, width: 14 },
        { key: 'duration_ms', label: 'system.health.requests.durationMs', type: 'quantity', width: 9 },
        { key: 'device_name', label: 'system.health.requests.device', type: 'text', width: 15 },
    ],
    layouts: [{ type: 'table' }],
    rowActions: [{ key: 'open', label: 'system.health.requests.open', icon: 'lucideEye', permission: 'system.observability.view', stateful: false, run: { kind: 'emit' } }],
    phoneRowActionStyle: 'menu',
    empty: { icon: 'lucideInbox', title: 'system.health.requests.emptyTitle', body: 'system.health.none' },
};
