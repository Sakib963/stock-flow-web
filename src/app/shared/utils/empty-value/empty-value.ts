/** Empty for a condition or a filter: absent, null, a blank string or an empty array. */
export const isEmptyValue = (value: unknown): boolean => value === undefined || value === null || (typeof value === 'string' && value.trim() === '') || (Array.isArray(value) && value.length === 0);
