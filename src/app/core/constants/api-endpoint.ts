// Every endpoint the app calls lives here. No inline URLs in services or components.
// Endpoints arrive with the features that use them.
export class APIEndpoint {
    static readonly SIGN_IN = '/api/v1/auth/sign-in';
    static readonly SIGN_OUT = '/api/v1/auth/sign-out';
    static readonly SIGN_OUT_EVERYWHERE = '/api/v1/auth/sign-out-everywhere';
    static readonly GET_SESSIONS = '/api/v1/auth/get-sessions';

    // A person's own notes
    static readonly GET_USER_NOTE_LIST = '/api/v1/profile/notes/get-note-list';
    static readonly CREATE_USER_NOTE = '/api/v1/profile/notes/create-note';
    static readonly UPDATE_USER_NOTE = '/api/v1/profile/notes/update-note';
    static readonly DELETE_USER_NOTE = '/api/v1/profile/notes/delete-note';

    // A person's own profile and password
    static readonly GET_PROFILE_INFO = '/api/v1/profile/profile-info/get-profile-info';
    static readonly UPDATE_PROFILE_INFO = '/api/v1/profile/profile-info/update-profile-info';
    static readonly SIGN_PROFILE_PHOTO_UPLOAD = '/api/v1/profile/profile-info/sign-profile-photo-upload';
    static readonly CHANGE_PASSWORD = '/api/v1/profile/change-password/change-user-password';
    static readonly VERIFY_PASSWORD_CHANGE = '/api/v1/profile/change-password/verify-otp-for-password-change';
    static readonly SET_FIRST_PASSWORD = '/api/v1/profile/change-password/set-first-password';
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
    static readonly GET_SUB_CATEGORY_LIST_FOR_DROPDOWN = '/api/v1/configuration/sub-category/get-sub-category-list-for-dropdown';

    static readonly GET_BRAND_LIST = '/api/v1/configuration/brands/get-brand-list';
    static readonly GET_BRAND_DETAILS = '/api/v1/configuration/brands/get-brand-details';
    static readonly CREATE_BRAND = '/api/v1/configuration/brands/create-brand';
    static readonly UPDATE_BRAND_DETAILS = '/api/v1/configuration/brands/update-brand-details';
    static readonly CHECK_BRAND_AVAILABILITY = '/api/v1/configuration/brands/check-brand-availability';
    static readonly GENERATE_PRODUCT_LIST_REPORT_BY_BRAND = '/api/v1/configuration/brands/generate-product-list-report-by-brand';
    static readonly GENERATE_INVENTORY_REPORT_BY_BRAND = '/api/v1/configuration/brands/generate-inventory-report-by-brand';
    static readonly GET_BRAND_LIST_FOR_DROPDOWN = '/api/v1/configuration/brands/get-brand-list-for-dropdown';

    static readonly GET_PRODUCT_LIST = '/api/v1/configuration/product/get-product-list';
    static readonly GET_PRODUCT_DETAILS = '/api/v1/configuration/product/get-product-details';
    static readonly CREATE_PRODUCT = '/api/v1/configuration/product/create-product';
    static readonly UPDATE_PRODUCT_DETAILS = '/api/v1/configuration/product/update-product-details';
    static readonly DELETE_PRODUCT = '/api/v1/configuration/product/delete-product';
    static readonly CHECK_PRODUCT_AVAILABILITY = '/api/v1/configuration/product/check-product-availability';
    static readonly GENERATE_PRODUCT_SKU = '/api/v1/configuration/product/generate-product-sku';
    static readonly SIGN_PRODUCT_PHOTO_UPLOAD = '/api/v1/configuration/product/sign-product-photo-upload';
    /** Cloudinary itself, not our API: `{cloud}` is filled from the signature the server hands back. */
    static readonly CLOUDINARY_UPLOAD = 'https://api.cloudinary.com/v1_1/{cloud}/image/upload';

    static readonly GET_SUPPLIER_LIST = '/api/v1/configuration/supplier/get-supplier-list';
    static readonly GET_SUPPLIER_DETAILS = '/api/v1/configuration/supplier/get-supplier-details';
    static readonly CREATE_SUPPLIER = '/api/v1/configuration/supplier/create-supplier';
    static readonly UPDATE_SUPPLIER_DETAILS = '/api/v1/configuration/supplier/update-supplier-details';
    static readonly CHECK_SUPPLIER_AVAILABILITY = '/api/v1/configuration/supplier/check-supplier-availability';
    static readonly GENERATE_SUPPLIER_PERFORMANCE_REPORT = '/api/v1/configuration/supplier/generate-supplier-performance-report';
    static readonly EXPORT_SUPPLIER_DATA = '/api/v1/configuration/supplier/export-supplier-data';
    static readonly GET_SUPPLIER_LIST_FOR_DROPDOWN = '/api/v1/configuration/supplier/get-supplier-list-for-dropdown';

    static readonly GET_WAREHOUSE_LIST = '/api/v1/configuration/warehouse/get-warehouse-list';
    static readonly GET_WAREHOUSE_DETAILS = '/api/v1/configuration/warehouse/get-warehouse-details';
    static readonly CREATE_WAREHOUSE = '/api/v1/configuration/warehouse/create-warehouse';
    static readonly UPDATE_WAREHOUSE_DETAILS = '/api/v1/configuration/warehouse/update-warehouse-details';
    static readonly CHECK_WAREHOUSE_AVAILABILITY = '/api/v1/configuration/warehouse/check-warehouse-availability';
    static readonly GENERATE_WAREHOUSE_CODE = '/api/v1/configuration/warehouse/generate-warehouse-code';
    static readonly GENERATE_PRODUCT_LIST_REPORT_BY_WAREHOUSE = '/api/v1/configuration/warehouse/generate-product-list-report-by-warehouse';
    static readonly GENERATE_INVENTORY_REPORT_BY_WAREHOUSE = '/api/v1/configuration/warehouse/generate-inventory-report-by-warehouse';
    static readonly GET_WAREHOUSE_LIST_FOR_DROPDOWN = '/api/v1/configuration/warehouse/get-warehouse-list-for-dropdown';

    static readonly GET_AISLE_LIST = '/api/v1/configuration/aisle/get-aisle-list';
    static readonly GET_AISLE_DETAILS = '/api/v1/configuration/aisle/get-aisle-details';
    static readonly CREATE_AISLE = '/api/v1/configuration/aisle/create-aisle';
    static readonly UPDATE_AISLE_DETAILS = '/api/v1/configuration/aisle/update-aisle-details';
    static readonly CHECK_AISLE_AVAILABILITY = '/api/v1/configuration/aisle/check-aisle-availability';
    static readonly GENERATE_AISLE_CODE = '/api/v1/configuration/aisle/generate-aisle-code';
    static readonly GENERATE_PRODUCT_LIST_REPORT_BY_AISLE = '/api/v1/configuration/aisle/generate-product-list-report-by-aisle';
    static readonly GENERATE_INVENTORY_REPORT_BY_AISLE = '/api/v1/configuration/aisle/generate-inventory-report-by-aisle';
    static readonly GET_AISLE_LIST_FOR_DROPDOWN = '/api/v1/configuration/aisle/get-aisle-list-for-dropdown';

    static readonly GET_CONFIGURATION_ANALYTICS = '/api/v1/configuration/analytics/get-configuration-analytics';
    static readonly GET_SALES_ANALYTICS_OVERVIEW = '/api/v1/sales/analytics/get-sales-analytics-overview';
    static readonly GET_SALES_ANALYTICS_ORDERS = '/api/v1/sales/analytics/get-sales-analytics-orders';
    static readonly GET_SALES_ANALYTICS_TEAM = '/api/v1/sales/analytics/get-sales-analytics-team';
    static readonly GET_SALES_ANALYTICS_PRODUCTS = '/api/v1/sales/analytics/get-sales-analytics-products';
    static readonly GET_SALES_ANALYTICS_CUSTOMERS = '/api/v1/sales/analytics/get-sales-analytics-customers';
    /** A static file in the app, built by tools/map-builder: not on the API server. */
    static readonly BD_DISTRICT_MAP = 'assets/maps/bd-districts.json';

    // Inventory
    static readonly GET_PURCHASE_ORDER_LIST = '/api/v1/inventory/purchase-order/get-purchase-list';
    static readonly GET_STOCK_MOVEMENT_LIST = '/api/v1/inventory/stock-movement/get-stock-movement-list';
    static readonly GET_STOCK_ADJUSTMENT_LIST = '/api/v1/inventory/stock-adjustment/get-stock-adjustment-list';
    static readonly GET_STOCK_ADJUSTMENT_DETAILS = '/api/v1/inventory/stock-adjustment/get-stock-adjustment-details';
    static readonly GET_PRODUCT_LIST_FOR_ADJUSTMENT = '/api/v1/inventory/stock-adjustment/get-product-list-for-adjustment';
    static readonly CREATE_STOCK_ADJUSTMENT = '/api/v1/inventory/stock-adjustment/create-stock-adjustment';
    static readonly UPDATE_STOCK_ADJUSTMENT = '/api/v1/inventory/stock-adjustment/update-stock-adjustment';
    static readonly VERIFY_STOCK_ADJUSTMENT = '/api/v1/inventory/stock-adjustment/verify-stock-adjustment';
    static readonly REJECT_STOCK_ADJUSTMENT = '/api/v1/inventory/stock-adjustment/reject-stock-adjustment';
    static readonly CANCEL_STOCK_ADJUSTMENT = '/api/v1/inventory/stock-adjustment/cancel-stock-adjustment';
    static readonly GENERATE_STOCK_ADJUSTMENT_REPORT = '/api/v1/inventory/stock-adjustment/generate-stock-adjustment-report';
    static readonly GET_DISPOSAL_LIST = '/api/v1/inventory/product-dispose/get-product-dispose-list';
    static readonly GET_DISPOSAL_DETAILS = '/api/v1/inventory/product-dispose/get-product-dispose-details';
    static readonly GET_PRODUCT_LIST_FOR_DISPOSAL = '/api/v1/inventory/product-dispose/get-product-list-for-dispose';
    static readonly CREATE_DISPOSAL = '/api/v1/inventory/product-dispose/create-product-dispose';
    static readonly UPDATE_DISPOSAL = '/api/v1/inventory/product-dispose/update-product-dispose';
    static readonly APPROVE_DISPOSAL = '/api/v1/inventory/product-dispose/approve-product-dispose';
    static readonly REJECT_DISPOSAL = '/api/v1/inventory/product-dispose/reject-product-dispose';
    static readonly CANCEL_DISPOSAL = '/api/v1/inventory/product-dispose/cancel-product-dispose';
    static readonly GENERATE_DISPOSAL_REPORT = '/api/v1/inventory/product-dispose/generate-product-dispose-report';
    static readonly GET_STOCK_OVERVIEW_LIST = '/api/v1/inventory/inventory-overview/get-stock-overview-list';
    static readonly GET_PRODUCT_STOCK = '/api/v1/inventory/inventory-overview/get-product-stock';
    static readonly GENERATE_PRODUCT_STOCK_REPORT = '/api/v1/inventory/inventory-overview/generate-product-stock-report';
    static readonly UPDATE_BATCH_PRICING = '/api/v1/inventory/inventory-overview/update-batch-pricing';
    static readonly UPDATE_BATCH_BUDGET = '/api/v1/inventory/inventory-overview/update-batch-budget';
    static readonly GET_PURCHASE_ORDER_DETAILS = '/api/v1/inventory/purchase-order/get-purchase-details';
    static readonly GET_PRODUCT_LIST_FOR_PURCHASE = '/api/v1/inventory/purchase-order/get-product-list-for-purchase';
    static readonly CREATE_PURCHASE_ORDER = '/api/v1/inventory/purchase-order/create-purchase';
    static readonly UPDATE_PURCHASE_ORDER = '/api/v1/inventory/purchase-order/update-purchase-details';
    static readonly UPDATE_PURCHASE_ORDER_PAYMENT = '/api/v1/inventory/purchase-order/update-purchase-payment';
    static readonly UPDATE_BATCH_EXPIRY = '/api/v1/inventory/purchase-order/update-batch-expiry';
    static readonly VERIFY_PURCHASE_ORDER = '/api/v1/inventory/purchase-order/verify-purchase';
    static readonly CANCEL_PURCHASE_ORDER = '/api/v1/inventory/purchase-order/cancel-purchase';
    static readonly GET_PURCHASE_ORDER_REPORT = '/api/v1/inventory/purchase-order/get-purchase-order-report';
    static readonly GET_PURCHASE_ORDER_PRODUCTS_REPORT = '/api/v1/inventory/purchase-order/get-purchase-order-products-report';

    // Sales: the counter
    static readonly GET_POS_PRODUCT_LIST = '/api/v1/sales/pos/get-product-list';
    static readonly CHECKOUT_POS_SALE = '/api/v1/sales/pos/checkout';
    static readonly PARK_POS_CART = '/api/v1/sales/pos/park-cart';
    static readonly GET_PARKED_CARTS = '/api/v1/sales/pos/get-parked-carts';
    static readonly DISCARD_PARKED_CART = '/api/v1/sales/pos/discard-parked-cart';
    static readonly FIND_CUSTOMER_BY_PHONE = '/api/v1/sales/customer/find-customer-by-phone';
    // Sales: orders list and record
    static readonly GET_ORDER_LIST = '/api/v1/sales/order/get-order-list';
    static readonly GET_ORDER_DETAILS = '/api/v1/sales/order/get-order-details';
    static readonly GET_ORDER_HISTORY_LIST = '/api/v1/sales/order-history/get-order-list';
    static readonly GET_ORDER_HISTORY_DETAILS = '/api/v1/sales/order-history/get-order-details';
    static readonly CONFIRM_ORDER_HISTORY = '/api/v1/sales/order-history/confirm-order';
    static readonly CANCEL_ORDER_HISTORY = '/api/v1/sales/order-history/cancel-order';
    static readonly CONFIRM_ORDER = '/api/v1/sales/order/confirm-order';
    static readonly CANCEL_ORDER = '/api/v1/sales/order/cancel-order';
    static readonly MARK_ORDER_NOT_DELIVERED = '/api/v1/sales/order/mark-order-not-delivered';
    static readonly RECORD_ORDER_REFUND = '/api/v1/sales/order/record-order-refund';
    static readonly GET_RETURN_LIST = '/api/v1/sales/return/get-return-list';
    static readonly GET_RETURN_DETAILS = '/api/v1/sales/return/get-return-details';
    static readonly GET_RETURNS_FOR_ORDER = '/api/v1/sales/return/get-returns-for-order';
    static readonly CREATE_RETURN = '/api/v1/sales/return/create-return';
    static readonly CONFIRM_RETURN = '/api/v1/sales/return/confirm-return';
    static readonly CANCEL_RETURN = '/api/v1/sales/return/cancel-return';
    static readonly GET_GIVEAWAY_LIST = '/api/v1/sales/giveaway/get-giveaway-list';
    static readonly GET_GIVEAWAY_DETAILS = '/api/v1/sales/giveaway/get-giveaway-details';
    static readonly CREATE_GIVEAWAY = '/api/v1/sales/giveaway/create-giveaway';
    static readonly GIVE_GIVEAWAY = '/api/v1/sales/giveaway/give-giveaway';
    static readonly CANCEL_GIVEAWAY = '/api/v1/sales/giveaway/cancel-giveaway';
    static readonly ADD_ORDER_GIFT = '/api/v1/sales/giveaway/add-order-gift';
    static readonly REMOVE_ORDER_GIFT = '/api/v1/sales/giveaway/remove-order-gift';
    static readonly GET_DELIVERY_BATCH_LIST = '/api/v1/sales/delivery-batch/get-delivery-batch-list';
    static readonly GET_DELIVERY_BATCH_DETAILS = '/api/v1/sales/delivery-batch/get-delivery-batch-details';
    static readonly GET_ORDERS_READY_TO_SEND = '/api/v1/sales/delivery-batch/get-orders-ready-to-send';
    static readonly CREATE_DELIVERY_BATCH = '/api/v1/sales/delivery-batch/create-delivery-batch';
    static readonly UPDATE_DELIVERY_BATCH_ORDERS = '/api/v1/sales/delivery-batch/update-delivery-batch-orders';
    static readonly GET_DELIVERY_BATCH_UPLOAD_FILE = '/api/v1/sales/delivery-batch/get-delivery-batch-upload-file';
    static readonly HAND_OVER_DELIVERY_BATCH = '/api/v1/sales/delivery-batch/hand-over-delivery-batch';
    static readonly DELIVER_DELIVERY_BATCH = '/api/v1/sales/delivery-batch/deliver-delivery-batch';
    static readonly CANCEL_DELIVERY_BATCH = '/api/v1/sales/delivery-batch/cancel-delivery-batch';
    static readonly GET_PRE_ORDER_LIST = '/api/v1/sales/pre-order/get-pre-order-list';
    static readonly GET_PRE_ORDERS_BY_PRODUCT = '/api/v1/sales/pre-order/get-pre-orders-by-product';
    static readonly GET_PRE_ORDER_DETAILS = '/api/v1/sales/pre-order/get-pre-order-details';
    static readonly CREATE_PRE_ORDER = '/api/v1/sales/pre-order/create-pre-order';
    static readonly UPDATE_PRE_ORDER = '/api/v1/sales/pre-order/update-pre-order';
    static readonly CONFIRM_PRE_ORDER = '/api/v1/sales/pre-order/confirm-pre-order';
    static readonly CANCEL_PRE_ORDER = '/api/v1/sales/pre-order/cancel-pre-order';
    static readonly RECORD_PRE_ORDER_REFUND = '/api/v1/sales/pre-order/record-pre-order-refund';
    static readonly GET_PRE_ORDER_FOR_CONVERSION = '/api/v1/sales/pre-order/get-pre-order-for-conversion';
    static readonly FIND_OPEN_BOOKINGS = '/api/v1/sales/pre-order/find-open-bookings';
    static readonly GET_PRODUCT_LIST_FOR_PRE_ORDER = '/api/v1/sales/pre-order/get-product-list-for-pre-order';
    static readonly GET_CUSTOMER_LIST = '/api/v1/sales/customer/get-customer-list';
    static readonly GET_CUSTOMER_DETAILS = '/api/v1/sales/customer/get-customer-details';
    static readonly CREATE_CUSTOMER = '/api/v1/sales/customer/create-customer';
    static readonly UPDATE_CUSTOMER_DETAILS = '/api/v1/sales/customer/update-customer-details';
    static readonly FLAG_CUSTOMER = '/api/v1/sales/customer/flag-customer';
    static readonly CREATE_CUSTOMER_ADDRESS = '/api/v1/sales/customer/create-customer-address';
    static readonly UPDATE_CUSTOMER_ADDRESS = '/api/v1/sales/customer/update-customer-address';
    static readonly RETIRE_CUSTOMER_ADDRESS = '/api/v1/sales/customer/retire-customer-address';
    static readonly SEARCH_LOCATION = '/api/v1/sales/location/search-location';

    // Sales: the online order
    static readonly GET_ONLINE_ORDER_SETUP = '/api/v1/sales/online/get-online-order-setup';
    static readonly READ_CHAT_MESSAGE = '/api/v1/sales/online/read-chat-message';
    static readonly CREATE_ONLINE_ORDER = '/api/v1/sales/online/create-online-order';
    static readonly EDIT_ONLINE_ORDER = '/api/v1/sales/online/edit-online-order';
    static readonly GET_ONLINE_ORDER_FOR_EDIT = '/api/v1/sales/online/get-online-order-for-edit';
    static readonly SAVE_ONLINE_DRAFT = '/api/v1/sales/online/save-online-draft';
    static readonly GET_ONLINE_DRAFTS = '/api/v1/sales/online/get-online-drafts';
    static readonly DISCARD_ONLINE_DRAFT = '/api/v1/sales/online/discard-online-draft';
    static readonly UPDATE_DELIVERY_CHARGES = '/api/v1/sales/settings/update-delivery-charges';

    // Business settings: the name, logo and contact details everything printed carries
    static readonly GET_BUSINESS_SETTINGS = '/api/v1/configuration/settings/get-settings';
    static readonly UPDATE_BUSINESS_SETTINGS = '/api/v1/configuration/settings/update-settings';
    static readonly SIGN_SETTINGS_LOGO_UPLOAD = '/api/v1/configuration/settings/sign-settings-logo-upload';
    static readonly GET_MESSAGE_TEMPLATES = '/api/v1/sales/settings/get-message-templates';
    static readonly SAVE_MESSAGE_TEMPLATE = '/api/v1/sales/settings/save-message-template';
    static readonly RECORD_MESSAGE_COPIED = '/api/v1/sales/settings/record-message-copied';

    // Activity log
    static readonly GET_ACTIVITY_LOG_LIST = '/api/v1/activity-log/get-activity-log-list';
    static readonly GET_ACTIVITY_LOG_SUMMARY = '/api/v1/activity-log/get-activity-log-summary';

    // System health
    static readonly GET_OBSERVABILITY_USAGE = '/api/v1/system/observability/get-observability-usage';
    static readonly GET_ROUTE_METRICS = '/api/v1/system/observability/get-route-metrics';
    static readonly GET_REQUEST_LIST = '/api/v1/system/observability/get-request-list';
    static readonly GET_REQUEST_DETAILS = '/api/v1/system/observability/get-request-details';
    static readonly GET_SIGNALS = '/api/v1/system/observability/get-signals';
    static readonly GET_DATABASE_STATUS = '/api/v1/system/observability/get-database-status';
    static readonly GET_CRASH_LIST = '/api/v1/system/observability/get-crash-list';
    static readonly REPORT_CRASH = '/api/v1/profile/crash-report/report-crash';

    // Marketing
    static readonly GET_PARTNER_LIST = '/api/v1/marketing/partner/get-partner-list';
    static readonly GET_PARTNER_DETAILS = '/api/v1/marketing/partner/get-partner-details';
    static readonly CREATE_PARTNER = '/api/v1/marketing/partner/create-partner';
    static readonly UPDATE_PARTNER_DETAILS = '/api/v1/marketing/partner/update-partner-details';
    static readonly CHECK_PARTNER_AVAILABILITY = '/api/v1/marketing/partner/check-partner-availability';
    static readonly GET_CAMPAIGN_LIST = '/api/v1/marketing/campaign/get-campaign-list';
    static readonly GET_CAMPAIGN_DETAILS = '/api/v1/marketing/campaign/get-campaign-details';
    static readonly GET_PARTNERS_FOR_CAMPAIGN = '/api/v1/marketing/campaign/get-partners-for-campaign';
    static readonly GET_BATCHES_FOR_CAMPAIGN = '/api/v1/marketing/campaign/get-batches-for-campaign';
    static readonly CREATE_CAMPAIGN = '/api/v1/marketing/campaign/create-campaign';
    static readonly UPDATE_CAMPAIGN = '/api/v1/marketing/campaign/update-campaign';
    static readonly START_CAMPAIGN = '/api/v1/marketing/campaign/start-campaign';
    static readonly COMPLETE_CAMPAIGN = '/api/v1/marketing/campaign/complete-campaign';
    static readonly CANCEL_CAMPAIGN = '/api/v1/marketing/campaign/cancel-campaign';
    static readonly CREATE_CAMPAIGN_DELIVERABLE = '/api/v1/marketing/campaign/create-campaign-deliverable';
    static readonly UPDATE_CAMPAIGN_DELIVERABLE = '/api/v1/marketing/campaign/update-campaign-deliverable';
    static readonly DELETE_CAMPAIGN_DELIVERABLE = '/api/v1/marketing/campaign/delete-campaign-deliverable';
    static readonly GET_MARKETING_ANALYTICS_OVERVIEW = '/api/v1/marketing/analytics/get-marketing-analytics-overview';
    static readonly GET_MARKETING_CAMPAIGN_RESULTS = '/api/v1/marketing/analytics/get-marketing-campaign-results';
    static readonly GET_MARKETING_COMPARISONS = '/api/v1/marketing/analytics/get-marketing-comparisons';
    static readonly GET_MARKETING_SOURCES = '/api/v1/marketing/analytics/get-marketing-sources';
    static readonly GET_MARKETING_NEXT = '/api/v1/marketing/analytics/get-marketing-next';
    static readonly GET_FEATURE_LIST = '/api/v1/admin/feature/get-feature-list';
    static readonly GET_FEATURE_TREE = '/api/v1/admin/feature/get-feature-tree';
    static readonly GET_FEATURE_DETAILS = '/api/v1/admin/feature/get-feature-details';
    static readonly UPDATE_FEATURE_DETAILS = '/api/v1/admin/feature/update-feature-details';
    static readonly SWITCH_FEATURE = '/api/v1/admin/feature/switch-feature';
    static readonly MARK_ACTION_SENSITIVE = '/api/v1/admin/feature/mark-action-sensitive';
    static readonly REORDER_FEATURES = '/api/v1/admin/feature/reorder-features';
    static readonly GET_DASHBOARD = '/api/v1/dashboard/get-dashboard';
    static readonly GET_USER_LIST = '/api/v1/admin/user/get-user-list';
    static readonly GET_USER_DETAILS = '/api/v1/admin/user/get-user-details';
    static readonly GET_ASSIGNABLE_ROLES = '/api/v1/admin/user/get-assignable-roles';
    static readonly CHECK_USER_TAKEN = '/api/v1/admin/user/check-user-taken';
    static readonly CREATE_USER = '/api/v1/admin/user/create-user';
    static readonly UPDATE_USER = '/api/v1/admin/user/update-user';
    static readonly SWITCH_USER_STATUS = '/api/v1/admin/user/switch-user-status';
    static readonly DELETE_USER = '/api/v1/admin/user/delete-user';
    static readonly SIGN_OUT_USER_EVERYWHERE = '/api/v1/admin/user/sign-out-user-everywhere';
    static readonly SIGN_OUT_EVERYONE = '/api/v1/admin/user/sign-out-everyone';
    static readonly GET_ROLE_LIST = '/api/v1/admin/role/get-role-list';
    static readonly GET_ROLE_TREE = '/api/v1/admin/role/get-role-tree';
    static readonly GET_ROLE_DETAILS = '/api/v1/admin/role/get-role-details';
    static readonly CREATE_ROLE = '/api/v1/admin/role/create-role';
    static readonly UPDATE_ROLE = '/api/v1/admin/role/update-role';
    static readonly SWITCH_ROLE_STATUS = '/api/v1/admin/role/switch-role-status';
    static readonly DELETE_ROLE = '/api/v1/admin/role/delete-role';
    static readonly CREATE_PARTNER_PAYMENT = '/api/v1/marketing/partner-payment/create-partner-payment';
}
