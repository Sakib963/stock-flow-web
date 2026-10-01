import { HttpErrorResponse } from '@angular/common/http';
import { failureKey } from '@app/shared/utils/request-failure/request-failure';

/**
 * The copy for an adjustment write that failed, with the line it names when there is one.
 *
 * A 400 is a line that breaks its reason's rules, a 409 an adjustment that moved on or a line that no
 * longer fits its batch because stock sold since it was submitted. The server's sentence is English and
 * stays in the log; the person reads which line to fix in their own language.
 */
export const adjustmentFailure = (error: unknown, namespace: string): { key: string; params: Record<string, unknown> } => {
    if (error instanceof HttpErrorResponse && (error.status === 400 || error.status === 409)) {
        const line = error.error?.data?.line;
        if (typeof line === 'number') return { key: error.status === 400 ? 'inventory.stockAdjustment.lineRefused' : 'inventory.stockAdjustment.lineNoLongerFits', params: { line: line + 1 } };
        return { key: error.status === 400 ? 'inventory.stockAdjustment.refused' : 'inventory.stockAdjustment.moved', params: {} };
    }
    return { key: failureKey(error, namespace), params: {} };
};
