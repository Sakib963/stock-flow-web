import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '@app/core/services/auth.service';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { catchError, throwError } from 'rxjs';

/**
 * Attaches the bearer token, and signs the user out when the server rejects it.
 *
 * Sign-in is exempt from the 401 handling: a wrong password there is a message on the form, not
 * an expired session, and logging out mid-login would clear the screen the user is looking at.
 */
export const tokenInterceptor: HttpInterceptorFn = (request, next) => {
    const auth = inject(AuthService);
    const token = auth.getAccessToken();
    const isSignIn = request.url.includes(APIEndpoint.SIGN_IN);

    const authorised = token && !isSignIn ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : request;

    return next(authorised).pipe(
        catchError((error: HttpErrorResponse) => {
            if (error.status === 401 && !isSignIn) auth.logout();
            return throwError(() => error);
        })
    );
};
