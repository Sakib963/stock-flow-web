import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, ResolveFn, RouterStateSnapshot } from '@angular/router';
import { Observable, catchError, finalize, tap, throwError, of } from 'rxjs';
import { AuthService } from '@app/modules/auth/services/auth.service';
import { ROLES } from '../constants/constants';
import { NoteService } from '../services/note.service';

export const UserInfoResolver: ResolveFn<any> = (route: ActivatedRouteSnapshot, state: RouterStateSnapshot, authService: AuthService = inject(AuthService), _noteService = inject(NoteService)): Observable<any> => {
    // Check if user has a valid token before making API call
    const token = authService.getJwtToken();
    if (!token) {
        authService.loading.set(false);
        return of(null); // Return empty observable, let AuthGuard handle redirect
    }

    return authService.getUserInfo().pipe(
        tap((res: any) => {
            authService._userInfo.set({
                role: res.data.role || '',
                name: res.data.name || '',
                email: res.data.email || '',
                photo: res.data.photo || '',
                mobile_number: res.data.mobile_number || '',
                designation: res.data.designation || '',
            });
            if (res.data.role === ROLES.GUEST) {
                authService.setGuestUser(true);
            }
            // Load user notes after successful login
            _noteService.loadNotes();
        }),
        finalize(() => {
            authService.loading.set(false);
        }),
        catchError((err) => {
            authService.loading.set(false);
            // Don't block navigation on error - return null to allow navigation to continue
            // AuthGuard will handle redirecting to login if needed
            return of(null);
        })
    );
};
