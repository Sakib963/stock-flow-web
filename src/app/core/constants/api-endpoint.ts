// Every endpoint the app calls lives here. No inline URLs in services or components.
// Only the auth routes are listed so far; the rest arrive with the features that use them.
export class APIEndpoint {
    static readonly SIGN_IN = '/api/v1/auth/sign-in';
    static readonly REFRESH_TOKEN = '/api/v1/auth/refresh-token';
    static readonly GET_USER_INFO = '/api/v1/auth/get-user-info';
    // Password recovery. Both are unauthenticated: a user who has forgotten their password has
    // no token, so the token interceptor must not attach one or expect a 401 to mean expiry.
    static readonly FORGOT_PASSWORD = '/api/v1/auth/forgot-password';
    static readonly RESET_PASSWORD = '/api/v1/auth/reset-password';
}
