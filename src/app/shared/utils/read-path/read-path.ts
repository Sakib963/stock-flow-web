/** Reads 'supplier.name' from a row, or 'data.rows' from a response. Undefined when any step is missing. */
export const readPath = (source: unknown, path: string): unknown => {
    let value: unknown = source;
    for (const part of path.split('.')) {
        if (value === null || typeof value !== 'object') return undefined;
        value = (value as Record<string, unknown>)[part];
    }
    return value;
};
