export class Constants {
    static readonly LOGIN_ROUTE = '/auth/login';
    // Landing after sign in. One route for every role today, because the app shell has not been
    // designed and the old per-role destinations pointed at deleted modules. Revisit with the shell.
    static readonly APP_ROUTE = '/app';

    // Opaque on purpose: a key named "auth" or "token" is the first thing anyone pokes at in
    // devtools on a shared counter machine.
    static readonly AUTH_STORE_KEY = '__x9f4c2e8a1b7d6f3c0a5e9b2d4f8a11__';
    static readonly LANG_STORE_KEY = 'app_lang';

    static readonly EMAIL_REGEX = '^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+[.][a-zA-Z0-9-.]+$';
}

export class ROLES {
    static readonly ADMIN = 'Admin';
    static readonly MANAGER = 'Manager';
    static readonly SALESMAN = 'Salesman';
    static readonly GUEST = 'Guest';
}
