import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
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
    const auth = inject(AuthService);
    const session = inject(SessionService);

    const key = auth.sessionKey();
    if (session.loaded() && session.loadedFor() === key) return true;

    try {
        await session.load(key);
        return true;
    } catch {
        // Without the payload there is no menu to draw and nothing to check a route against.
        // Signing out is the honest end, and it resolves the status to anonymous, so the login page
        // cannot bounce straight back here through the guest guard.
        void auth.signOut();
        session.clear();
        return false;
    }
};
