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

/** The copy key for a failure, under a feature's own namespace. */
export const failureKey = (error: unknown, namespace: string): string => `${namespace}.${failureOf(error)}`;
