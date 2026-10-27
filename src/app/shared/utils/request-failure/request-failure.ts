import { HttpErrorResponse } from '@angular/common/http';
import { RequestFailure } from '@app/core/models/api.model';

/**
 * Which of the three a failed request was.
 *
 * 401 is absent on purpose: the interceptor signs out on it, so no screen has copy for it.
 */
export const failureOf = (error: unknown): RequestFailure => {
    if (!(error instanceof HttpErrorResponse)) return 'server';
    if (error.status === 403) return 'forbidden';
    // Status 0 is the browser refusing to say more: no network, DNS, CORS or a cancelled request.
    if (error.status === 0) return 'network';
    return 'server';
};

/** Someone saved the record after this form loaded it. Every form answers it with the same copy. */
export const isStale = (error: unknown): boolean => error instanceof HttpErrorResponse && error.status === 409 && error.error?.data?.reason === 'changed_since_loaded';

/** The copy key for a failure, under a feature's own namespace. */
export const failureKey = (error: unknown, namespace: string): string => (isStale(error) ? 'form.changedSinceLoaded' : `${namespace}.${failureOf(error)}`);
