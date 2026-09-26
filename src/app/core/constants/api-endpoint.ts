// Every endpoint the app calls lives here. No inline URLs in services or components.
// Endpoints arrive with the features that use them.
export class APIEndpoint {
    static readonly SIGN_IN = '/api/v1/auth/sign-in';
    static readonly SIGN_OUT = '/api/v1/auth/sign-out';
    static readonly SIGN_OUT_EVERYWHERE = '/api/v1/auth/sign-out-everywhere';
    static readonly GET_SESSIONS = '/api/v1/auth/get-sessions';
    static readonly SIGN_OUT_SESSION = '/api/v1/auth/sign-out-session';
    static readonly REFRESH_TOKEN = '/api/v1/auth/refresh-token';
    static readonly GET_USER_INFO = '/api/v1/auth/get-user-info';
    // Password recovery. Both are unauthenticated: a user who has forgotten their password has
    // no token, so the token interceptor must not attach one or expect a 401 to mean expiry.
    static readonly FORGOT_PASSWORD = '/api/v1/auth/forgot-password';
    static readonly RESET_PASSWORD = '/api/v1/auth/reset-password';

    // Who a name in a list belongs to, fetched when a person card opens.
    static readonly GET_USER_CARD = '/api/v1/auth/get-user-card';

    // Configuration
    static readonly GET_CATEGORY_LIST = '/api/v1/configuration/category/get-category-list';
    static readonly GET_CATEGORY_DETAILS = '/api/v1/configuration/category/get-category-details';
    static readonly CREATE_CATEGORY = '/api/v1/configuration/category/create-category';
    static readonly UPDATE_CATEGORY_DETAILS = '/api/v1/configuration/category/update-category-details';
    static readonly CHECK_CATEGORY_AVAILABILITY = '/api/v1/configuration/category/check-category-availability';
    static readonly GENERATE_CATEGORY_CODE = '/api/v1/configuration/category/generate-category-code';
    static readonly GENERATE_PRODUCT_LIST_REPORT_BY_CATEGORY = '/api/v1/configuration/category/generate-product-list-report-by-category';
    static readonly GENERATE_INVENTORY_REPORT_BY_CATEGORY = '/api/v1/configuration/category/generate-inventory-report-by-category';
    static readonly GET_CATEGORY_LIST_FOR_DROPDOWN = '/api/v1/configuration/category/get-category-list-for-dropdown';

    static readonly GET_SUB_CATEGORY_LIST = '/api/v1/configuration/sub-category/get-sub-category-list';
    static readonly GET_SUB_CATEGORY_DETAILS = '/api/v1/configuration/sub-category/get-sub-category-details';
    static readonly CREATE_SUB_CATEGORY = '/api/v1/configuration/sub-category/create-sub-category';
    static readonly UPDATE_SUB_CATEGORY_DETAILS = '/api/v1/configuration/sub-category/update-sub-category-details';
    static readonly CHECK_SUB_CATEGORY_AVAILABILITY = '/api/v1/configuration/sub-category/check-sub-category-availability';
    static readonly GENERATE_SUB_CATEGORY_CODE = '/api/v1/configuration/sub-category/generate-sub-category-code';
    static readonly GENERATE_PRODUCT_LIST_REPORT_BY_SUB_CATEGORY = '/api/v1/configuration/sub-category/generate-product-list-report-by-sub-category';
    static readonly GENERATE_INVENTORY_REPORT_BY_SUB_CATEGORY = '/api/v1/configuration/sub-category/generate-inventory-report-by-sub-category';
}
