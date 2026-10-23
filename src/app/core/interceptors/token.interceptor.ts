import { HttpErrorResponse, HttpInterceptorFn, HttpRequest, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '@app/core/services/auth/auth.service';
import { ConfigVersionService } from '@app/core/services/config-version/config-version.service';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { environment } from '@env/environment';
import { catchError, switchMap, tap, throwError } from 'rxjs';

// Writes to what the kept picker lists show (docs/caching). Purchase orders are here because the
// supplier list carries each supplier's last order date.
const REFERENCE_WRITES = new Set(
    [
        APIEndpoint.CREATE_PRODUCT,
        APIEndpoint.UPDATE_PRODUCT_DETAILS,
        APIEndpoint.DELETE_PRODUCT,
        APIEndpoint.CREATE_CATEGORY,
        APIEndpoint.UPDATE_CATEGORY_DETAILS,
        APIEndpoint.CREATE_SUB_CATEGORY,
        APIEndpoint.UPDATE_SUB_CATEGORY_DETAILS,
        APIEndpoint.CREATE_BRAND,
        APIEndpoint.UPDATE_BRAND_DETAILS,
        APIEndpoint.CREATE_SUPPLIER,
        APIEndpoint.UPDATE_SUPPLIER_DETAILS,
        APIEndpoint.CREATE_WAREHOUSE,
        APIEndpoint.UPDATE_WAREHOUSE_DETAILS,
        APIEndpoint.CREATE_AISLE,
        APIEndpoint.UPDATE_AISLE_DETAILS,
        APIEndpoint.CREATE_PARTNER,
        APIEndpoint.UPDATE_PARTNER_DETAILS,
        APIEndpoint.SAVE_MESSAGE_TEMPLATE,
        APIEndpoint.UPDATE_DELIVERY_CHARGES,
        APIEndpoint.CREATE_USER,
        APIEndpoint.UPDATE_USER,
        APIEndpoint.SWITCH_USER_STATUS,
        APIEndpoint.DELETE_USER,
        APIEndpoint.UPDATE_PROFILE_INFO,
        APIEndpoint.CREATE_PURCHASE_ORDER,
        APIEndpoint.UPDATE_PURCHASE_ORDER,
        APIEndpoint.CANCEL_PURCHASE_ORDER,
    ].map((endpoint) => `${environment.baseUrl}${endpoint}`)
);

/**
 * Attaches the bearer token to API calls, and renews it once when the server says it has expired.
 *
 * Only calls to the API carry the token. Translation files, and any third-party host a feature adds
 * later, never see it.
 *
 * Sign-in, sign-out and the renewal itself are exempt from renewal. A wrong password is a message on
 * the form rather than an expired session, a 401 from the renewal is the end of the line, and
 * renewing on the way out would hand back a session the person just asked the server to close.
 */
export const tokenInterceptor: HttpInterceptorFn = (request, next) => {
    const auth = inject(AuthService);
    const versions = inject(ConfigVersionService);

    const toApi = request.url.startsWith(`${environment.baseUrl}/api/`);
    const isSignIn = request.url.includes(APIEndpoint.SIGN_IN);
    const exempt = isSignIn || [APIEndpoint.SIGN_OUT, APIEndpoint.REFRESH_TOKEN].some((endpoint) => request.url.includes(endpoint));

    // Read at send time, so the replay below carries the token the renewal just produced. A header
    // the caller set itself wins, which is how sign-out still names a session already forgotten here.
    const authorise = (outgoing: HttpRequest<unknown>) => {
        const token = auth.getAccessToken();
        if (!token || !toApi || isSignIn || outgoing.headers.has('Authorization')) return outgoing;
        return outgoing.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
    };

    return next(authorise(request)).pipe(
        // Every guarded answer names the server's config and reference versions; a newer config one
        // makes the session reload, and either drops the kept picker lists.
        tap((event) => {
            if (!toApi || !(event instanceof HttpResponse)) return;
            versions.seen(event.headers.get('X-Config-Version'));
            versions.seenReference(event.headers.get('X-Reference-Version'));
            if (REFERENCE_WRITES.has(request.url.split('?')[0])) versions.dropReferenceLists();
        }),
        catchError((error: HttpErrorResponse) => {
            if (toApi) {
                versions.seen(error.headers?.get('X-Config-Version') ?? null);
                versions.seenReference(error.headers?.get('X-Reference-Version') ?? null);
            }
            if (error.status !== 401 || exempt || !toApi) return throwError(() => error);

            // One retry, and only one: the replay is not wrapped in this handler, so a second 401
            // travels straight to the caller instead of starting another renewal.
            return auth.renewAccessToken().pipe(switchMap(() => next(authorise(request))));
        })
    );
};
