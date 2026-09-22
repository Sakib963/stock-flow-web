/**
 * The shared vocabulary of every component config: page header, filter, table and list shell page.
 *
 * A config is pure data. It must survive JSON.stringify unchanged, because configs are meant to
 * move to the database later: no functions, no class instances, no templates. Rules are
 * `Condition` objects and custom behaviour is a registered key.
 * Contract: stock-flow-documents/docs/list-page/list-page.md
 */
import { APIEndpoint } from '@app/core/constants/api-endpoint';

/** A path that exists in api-endpoint.ts. A config imports the constant; it never types a path. */
export type Endpoint = (typeof APIEndpoint)[Exclude<keyof typeof APIEndpoint, 'prototype'>];

/** Copy: an i18n key today, both languages inline once configs come from the database. */
export type Text = string | { en: string; bn: string };

export type Tone = 'success' | 'warning' | 'danger' | 'progress' | 'neutral';

/**
 * How a date reads, named for what a person sees rather than a format string.
 *
 * 'date' is the list default (24 Aug 2026). The slashed forms are for screens people scan against
 * paper, where a fixed-width 24/08/2026 lines up and a month name does not. A config picks one; a
 * pattern string would let every list invent its own.
 */
export type DateFormat = 'date' | 'date-time' | 'date-time-12' | 'slashed' | 'slashed-time' | 'slashed-time-12' | 'time' | 'time-12' | 'relative';

export type JsonValue = string | number | boolean | null | readonly JsonValue[] | { readonly [key: string]: JsonValue };
export type JsonObject = { readonly [key: string]: JsonValue };

/** A rule as data, over a row's fields or over the current filter values. */
export type Condition = { field: string; is: 'empty' | 'filled' } | { field: string; in: readonly (string | number | boolean)[] } | { all: readonly Condition[] } | { any: readonly Condition[] };

/**
 * A request parameter as data. route: a route parameter. context: a value the host passes in
 * [context]. filter: another filter field's current value. row: a field of the row an action runs on.
 */
export type ParamValue = string | number | boolean | { route: string } | { context: string } | { filter: string } | { row: string };
export type Params = Readonly<Record<string, ParamValue>>;

export interface Confirm {
    title: Text;
    body: Text;
    ok: Text;
}

export type ActionRun =
    | { kind: 'navigate'; route: string }
    | { kind: 'request'; endpoint: Endpoint; method: 'post' | 'put' | 'patch' | 'delete'; body?: Params; success: Text }
    | { kind: 'download'; endpoint: Endpoint; format: 'xlsx' | 'csv' | 'pdf' }
    | { kind: 'handler'; handler: string }
    | { kind: 'emit' };

export interface Action {
    key: string;
    label: Text;
    /** A Lucide name from the list icon registry. */
    icon: string;
    /** The action is absent without it. */
    permission: string;
    confirm?: Confirm;
    run: ActionRun;
}

export interface ToneStyle {
    label: Text;
    tone: Tone;
    icon?: string;
}
export type ToneMap = Readonly<Record<string, ToneStyle>>;

export type Row = Readonly<Record<string, unknown>>;

/** Where a param value reads from. */
export interface ParamSources {
    route?: Readonly<Record<string, string | undefined>>;
    context?: Readonly<Record<string, unknown>> | null;
    filters?: Readonly<Record<string, string | null>>;
    row?: Row;
}

export interface ResolvedTone {
    style: ToneStyle;
    /** False when the value had no entry and the fallback was used. */
    known: boolean;
}

/** What a component reports when a person picks an action it does not run itself. */
export interface ActionEvent {
    action: Action;
    rows: readonly Row[];
}
