import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '@app/core/services/auth.service';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { environment } from '@env/environment';
import { catchError, switchMap, throwError } from 'rxjs';

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
        catchError((error: HttpErrorResponse) => {
            if (error.status !== 401 || exempt || !toApi) return throwError(() => error);

            // One retry, and only one: the replay is not wrapped in this handler, so a second 401
            // travels straight to the caller instead of starting another renewal.
            return auth.renewAccessToken().pipe(switchMap(() => next(authorise(request))));
        })
    );
};
