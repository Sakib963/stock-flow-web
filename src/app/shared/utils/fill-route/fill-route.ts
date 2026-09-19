import { Row } from '@app/core/models/config.model';
import { readPath } from '@app/shared/utils/read-path/read-path';

/** '/app/sales/orders/:oid' filled from the row. A segment with no value leaves the route unusable, so it answers null. */
export const fillRoute = (route: string, row?: Row): string | null => {
    let complete = true;
    const filled = route.replace(/:([\w.]+)/g, (_, field: string) => {
        const value = readPath(row, field);
        if (value === undefined || value === null || value === '') complete = false;
        return encodeURIComponent(String(value ?? ''));
    });
    return complete ? filled : null;
};
