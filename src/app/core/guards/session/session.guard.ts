import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Constants } from '@app/core/constants/constants';
import { AuthService } from '@app/core/services/auth/auth.service';
import { SessionService } from '@app/core/services/session/session.service';

/**
 * Makes sure the boot payload in memory belongs to the person who is signed in now, before any
 * signed-in screen activates.
 *
 * The app initializer can only cover a reload. Signing in happens inside the running app with no
 * reload, so on that path nothing else fetches the payload: the shell would activate with no
 * permissions and no menu, and the permission guard would bounce the landing route back to itself.
 *
 * The freshness check lives here rather than in AuthService, which is the natural-looking home for
 * it. AuthService cannot reach SessionService: the token interceptor injects AuthService, the
 * translation files are fetched through that interceptor, and SessionService reaches LanguageService,
 * so that edge closes a ring Angular refuses to construct. This guard is the one place that already
 * holds both halves.
 */
export const sessionGuard: CanActivateFn = async () => {
    const router = inject(Router);
    const session = inject(SessionService);
    if (!(await ensureSession(inject(AuthService), session))) return false;
    // An account someone else created sees nothing until its person sets their own password. The
    // server refuses everything else anyway; this keeps the shell from drawing on top of refusals.
    return session.user()?.mustChangePassword ? router.createUrlTree([Constants.SET_PASSWORD_ROUTE]) : true;
};

/** The set-password page is only for an account that still has to set one; anyone else goes to the app. */
export const mustSetPasswordGuard: CanActivateFn = async () => {
    const router = inject(Router);
    const session = inject(SessionService);
    if (!(await ensureSession(inject(AuthService), session))) return false;
    return session.user()?.mustChangePassword ? true : router.createUrlTree([Constants.APP_ROUTE]);
};

const ensureSession = async (auth: AuthService, session: SessionService): Promise<boolean> => {
    const key = auth.sessionKey();
    if (session.loaded() && session.loadedFor() === key) return true;

    try {
        await session.load(key);
        return true;
    } catch {
        // Without the payload there is no menu to draw and nothing to check a route against. Ending
        // it here and now is the honest end, and it resolves the status to anonymous, so the login
        // page cannot bounce straight back here through the guest guard. Not `signOut`, which waits
        // for the server: there is no screen left to wait on.
        void auth.abandonSession();
        session.clear();
        return false;
    }
};
