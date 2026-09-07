import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '@app/core/services/auth.service';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { catchError, switchMap, throwError } from 'rxjs';

/**
 * Attaches the bearer token, and renews it once when the server says it has expired.
 *
 * The access token lives 30 minutes and the refresh token 7 days, so before this a person was
 * signed out mid-shift while a perfectly good refresh token sat unused in storage. A 401 now spends
 * that token once and replays the request. Only a refusal to renew ends the session.
 *
 * Sign-in, sign-out and the renewal itself are exempt. A wrong password is a message on the form
 * rather than an expired session, a 401 from the renewal is the end of the line, and renewing on
 * the way out would hand back the tokens the person just asked the server to close.
 */
export const tokenInterceptor: HttpInterceptorFn = (request, next) => {
    const auth = inject(AuthService);

    const exempt = [APIEndpoint.SIGN_IN, APIEndpoint.SIGN_OUT, APIEndpoint.REFRESH_TOKEN].some((endpoint) => request.url.includes(endpoint));
    const isSignIn = request.url.includes(APIEndpoint.SIGN_IN);

    // Read at send time rather than once per interceptor run, so the replay below carries the token
    // the renewal just produced instead of the expired one.
    const authorise = (outgoing: HttpRequest<unknown>) => {
        const token = auth.getAccessToken();
        return token && !isSignIn ? outgoing.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : outgoing;
    };

    return next(authorise(request)).pipe(
        catchError((error: HttpErrorResponse) => {
            if (error.status !== 401 || exempt) return throwError(() => error);

            // One retry, and only one: the replay is not wrapped in this handler, so a second 401
            // travels straight to the caller instead of starting another renewal.
            return auth.renewAccessToken().pipe(switchMap(() => next(authorise(request))));
        })
    );
};
