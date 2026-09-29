import { HttpErrorResponse } from '@angular/common/http';
import { failureKey } from '@app/shared/utils/request-failure/request-failure';

/**
 * The copy key for a purchase order write that failed.
 *
 * A 400 is a rule the order broke (an aisle in another warehouse, a product removed since it was
 * picked) and a 409 is the order having moved on (verified or cancelled in another tab). Both say
 * what to do in the reader's language; the server's own sentence is English and stays in the log.
 */
export const orderFailureKey = (error: unknown, namespace: string): string => {
    if (error instanceof HttpErrorResponse && error.status === 400) return 'inventory.purchaseOrder.refused';
    if (error instanceof HttpErrorResponse && error.status === 409) return 'inventory.purchaseOrder.moved';
    return failureKey(error, namespace);
};
