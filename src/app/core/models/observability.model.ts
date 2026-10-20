import { ActivityDevice } from '@app/core/models/activity-log.model';

export interface ObservabilityRange {
    date_from: string;
    date_to: string;
}

export interface ObservabilityUsage {
    last_active: { occurred_on: string; method: string; route: string; name: string | null; email: string | null } | null;
    daily: { day: string; requests: number; people: number }[];
    month_days: { day: number; requests: number }[];
    people: { oid: string; name: string | null; email: string | null; requests: number; last_seen: string }[];
    people_count: number;
}

export interface RouteMetric {
    method: string;
    route: string;
    calls: number;
    average_ms: number;
    p95_ms: number;
    slowest_ms: number;
    error_rate: number | null;
    client_errors: number;
}

export type StatusClass = '2xx' | '3xx' | '4xx' | '5xx';

export interface RequestFilters {
    person?: string;
    ip?: string;
    country?: string;
    route?: string;
    request_id?: string;
    status?: StatusClass;
}

export interface LoggedRequest {
    oid: string;
    occurred_on: string;
    method: string;
    route: string;
    path: string;
    unmatched_route: boolean;
    status: number;
    duration_ms: number;
    ip: string | null;
    country: string | null;
    city: string | null;
    device: ActivityDevice | null;
    login_oid: string | null;
    name: string | null;
    email: string | null;
}

export interface LoggedRequestDetails extends LoggedRequest {
    request_bytes: number;
    response_bytes: number;
    session_oid: string | null;
    request_body: unknown;
    response_body: unknown;
    activity: { oid: string; reference_type: string; title: string; description: string | null; performed_on: string }[];
}

export type SignalKey = 'list_sweeping' | 'many_addresses' | 'off_hours' | 'refusal_burst' | 'export_taken';

export interface Signal {
    key: SignalKey;
    threshold: number | null;
    window: [number, number] | null;
    matches: { oid: string | null; name: string | null; email: string | null; ip: string | null; count: number; first_seen: string; last_seen: string }[];
}

export interface Crash {
    oid: string;
    occurred_on: string;
    name: string | null;
    email: string | null;
    page: string;
    message: string;
    version: string | null;
    device: ActivityDevice | null;
}

export interface DatabaseStatus {
    database_bytes: number;
    plan_bytes: number;
    max_connections: number;
    connections: number;
    tables: { name: string; bytes: number; rows: number }[];
    daily: { day: string; requests: number; bytes: number }[];
    average_bytes_per_day: number;
}
