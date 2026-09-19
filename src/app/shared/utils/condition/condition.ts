import { Condition } from '@app/core/models/config.model';
import { isEmptyValue } from '@app/shared/utils/empty-value/empty-value';
import { readPath } from '@app/shared/utils/read-path/read-path';

/** Evaluates a condition written as data against a row or the current filter values. */
export const matches = (condition: Condition, source: unknown): boolean => {
    if ('all' in condition) return condition.all.every((c) => matches(c, source));
    if ('any' in condition) return condition.any.some((c) => matches(c, source));

    const value = readPath(source, condition.field);
    if ('is' in condition) return condition.is === 'empty' ? isEmptyValue(value) : !isEmptyValue(value);
    return condition.in.some((allowed) => allowed === value || String(allowed) === String(value));
};
