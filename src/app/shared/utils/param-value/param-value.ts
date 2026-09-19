import { ParamSources, Params, ParamValue } from '@app/core/models/config.model';
import { isEmptyValue } from '@app/shared/utils/empty-value/empty-value';
import { readPath } from '@app/shared/utils/read-path/read-path';

const resolveOne = (value: ParamValue, sources: ParamSources): unknown => {
    if (typeof value !== 'object') return value;
    if ('route' in value) return sources.route?.[value.route];
    if ('context' in value) return readPath(sources.context, value.context);
    if ('filter' in value) return sources.filters?.[value.filter];
    return readPath(sources.row, value.row);
};

/**
 * Resolves config parameters into request parameters. A reference with nothing behind it is left
 * out rather than sent as an empty value, so the server never filters by "".
 */
export const resolveParams = (params: Params | undefined, sources: ParamSources): Record<string, string | number | boolean> => {
    const out: Record<string, string | number | boolean> = {};
    for (const [key, raw] of Object.entries(params ?? {})) {
        const value = resolveOne(raw, sources);
        if (isEmptyValue(value)) continue;
        out[key] = typeof value === 'number' || typeof value === 'boolean' ? value : String(value);
    }
    return out;
};
