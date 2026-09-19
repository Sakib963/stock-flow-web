import { Condition, Endpoint, JsonObject, Params, Text } from '@app/core/models/config.model';
import { RendererRef } from '@app/core/models/renderer.model';

export interface FilterConfig {
    /** row: up to 3 fields inline; modal: 4 or more; bar: a popover that applies live. */
    render: 'row' | 'modal' | 'bar';
    /** key defaults to 'search'. */
    search?: { placeholder: Text; key?: string };
    fields: readonly FilterField[];
    /** Applied chips, default true. */
    chips?: boolean;
}

interface FilterFieldBase {
    /** The query parameter and the URL key. */
    key: string;
    label: Text;
    placeholder?: Text;
    apply?: 'immediate' | 'on-apply';
    default?: string | readonly string[];
    /** The table stays idle until it has a value; its chip cannot be closed. */
    required?: boolean;
    /** Over the current filter values. */
    disabledWhen?: Condition;
    disabledHint?: Text;
    /** For remote choices, the permission their endpoint requires. */
    permission?: string;
    span?: 1 | 2;
}

export interface Choice {
    value: string;
    label: Text;
}

/** Choices loaded from an endpoint. Defaults match the dropdown endpoints: data is [{ value, label, groupLabel }]. */
export interface RemoteChoices {
    endpoint: Endpoint;
    params?: Params;
    rows?: string;
    value?: string;
    label?: string;
    sub?: string;
    group?: string;
    search?: { key: string; minChars?: number };
    pageSize?: number;
    resolve?: { key: string };
}

export type Choices = readonly Choice[] | RemoteChoices;

export type DateBound = 'today' | { days: number };
export type DatePreset = 'today' | 'yesterday' | 'last-7-days' | 'last-30-days' | 'this-month' | 'last-month';

export type FilterField =
    | (FilterFieldBase & { type: 'text' })
    | (FilterFieldBase & { type: 'select'; choices: Choices })
    | (FilterFieldBase & { type: 'multi-select'; choices: Choices; maxTags?: number })
    | (FilterFieldBase & { type: 'segmented'; choices: readonly Choice[] })
    | (FilterFieldBase & { type: 'toggle' })
    | (FilterFieldBase & { type: 'date'; min?: DateBound; max?: DateBound })
    | (FilterFieldBase & { type: 'date-range'; fromKey: string; toKey: string; presets?: readonly DatePreset[]; maxDays?: number; max?: DateBound })
    | (FilterFieldBase & { type: 'month-range'; fromKey: string; toKey: string; max?: DateBound })
    | (FilterFieldBase & { type: 'number-range'; fromKey: string; toKey: string; format: 'number' | 'money' })
    | (FilterFieldBase & RendererRef & { type: 'component'; inputs?: JsonObject });

/** What the filter holds and emits: strings or null, exactly as in the URL. */
export type FilterValues = Readonly<Record<string, string | null>>;
