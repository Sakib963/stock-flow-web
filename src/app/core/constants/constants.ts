export class Constants {
    static readonly LOGIN_ROUTE = '/auth/login';
    static readonly SESSION_ENDED_ROUTE = '/auth/session-ended';
    // Landing after sign in. One route for every role today, because the app shell has not been
    // designed and the old per-role destinations pointed at deleted modules. Revisit with the shell.
    static readonly APP_ROUTE = '/app';

    // Opaque on purpose: a key named "auth" or "token" is the first thing anyone pokes at in
    // devtools on a shared counter machine.
    static readonly AUTH_STORE_KEY = '__x9f4c2e8a1b7d6f3c0a5e9b2d4f8a11__';
    static readonly SIGN_OUT_PENDING_KEY = '__x3b8e1d6c9f2a7e4b0d5c8a1f6e3b27__';
    // The last session this browser held, so signing in again replaces it instead of adding one.
    static readonly LAST_SESSION_KEY = '__x7d2a9f4e1c8b3d6a0f5e2c9b7a41__';
    // Why the session just ended, for the other tabs that watch it go.
    static readonly SESSION_ENDED_KEY = '__x5c1e8b3f9a6d2e7c4b0a8f3d6e92__';
    // Carries no value. It dies with the browser, which is what "not kept signed in" means.
    static readonly BROWSER_SESSION_COOKIE = 'sf_bs';
    static readonly LANG_STORE_KEY = 'app_lang';

    static readonly EMAIL_REGEX = '^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+[.][a-zA-Z0-9-.]+$';
}

export class ROLES {
    static readonly ADMIN = 'Admin';
    static readonly MANAGER = 'Manager';
    static readonly SALESMAN = 'Salesman';
    static readonly GUEST = 'Guest';
}
