// Every endpoint the app calls lives here. No inline URLs in services or components.
// Only the auth routes are listed so far; the rest arrive with the features that use them.
export class APIEndpoint {
    static readonly SIGN_IN = '/api/v1/auth/sign-in';
    static readonly REFRESH_TOKEN = '/api/v1/auth/refresh-token';
    static readonly GET_USER_INFO = '/api/v1/auth/get-user-info';
}
