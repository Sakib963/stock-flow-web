export class APIEndpoint {
    static SIGN_IN = '/api/v1/auth/sign-in';
    static REFRESH_TOKEN = '/api/v1/auth/refresh-token';
    static GET_USER_INFO = '/api/v1/auth/get-user-info';

    static GET_USER_LIST = '/api/v1/admin/user/get-user-list';
    static CREATE_USER = '/api/v1/admin/user/create-user';
    static GET_USER_DETAILS = '/api/v1/admin/user/get-user-details';
    static UPDATE_USER_DETAILS = '/api/v1/admin/user/update-user-details';

    static GET_CATEGORY_LIST = '/api/v1/configuration/category/get-category-list';
    static CREATE_CATEGORY = '/api/v1/configuration/category/create-category';
    static GET_CATEGORY_DETAILS = '/api/v1/configuration/category/get-category-details';
    static UPDATE_CATEGORY_DETAILS = '/api/v1/configuration/category/update-category-details';
    static GET_CATEGORY_LIST_FOR_DROPDOWN = '/api/v1/configuration/category/get-category-list-for-dropdown';
    static GENERATE_PRODUCT_LIST_REPORT_BY_CATEGORY = '/api/v1/configuration/category/generate-product-list-report-by-category';
    static GENERATE_INVENTORY_REPORT_BY_CATEGORY = '/api/v1/configuration/category/generate-inventory-report-by-category';

    static GET_SUB_CATEGORY_LIST = '/api/v1/configuration/sub-category/get-sub-category-list';
    static CREATE_SUB_CATEGORY = '/api/v1/configuration/sub-category/create-sub-category';
    static UPDATE_SUB_CATEGORY_DETAILS = '/api/v1/configuration/sub-category/update-sub-category-details';
    static GET_SUB_CATEGORY_DETAILS = '/api/v1/configuration/sub-category/get-sub-category-details';
    static GET_SUB_CATEGORY_LIST_FOR_DROPDOWN = '/api/v1/configuration/sub-category/get-sub-category-list-for-dropdown';
    static GENERATE_PRODUCT_LIST_REPORT_BY_SUB_CATEGORY = '/api/v1/configuration/sub-category/generate-product-list-report-by-sub-category';
    static GENERATE_INVENTORY_REPORT_BY_SUB_CATEGORY = '/api/v1/configuration/sub-category/generate-inventory-report-by-sub-category';

    static GET_BRAND_LIST = '/api/v1/configuration/brands/get-brand-list';
    static CREATE_BRAND = '/api/v1/configuration/brands/create-brand';
    static GET_BRAND_DETAILS = '/api/v1/configuration/brands/get-brand-details';
    static UPDATE_BRAND_DETAILS = '/api/v1/configuration/brands/update-brand-details';
    static GET_BRAND_LIST_FOR_DROPDOWN = '/api/v1/configuration/brands/get-brand-list-for-dropdown';
    static GENERATE_PRODUCT_LIST_REPORT_BY_BRAND = '/api/v1/configuration/brands/generate-product-list-report-by-brand';
    static GENERATE_INVENTORY_REPORT_BY_BRAND = '/api/v1/configuration/brands/generate-inventory-report-by-brand';

    static GET_SUPPLIER_LIST = '/api/v1/configuration/supplier/get-supplier-list';
    static CREATE_SUPPLIER = '/api/v1/configuration/supplier/create-supplier';
    static GET_SUPPLIER_DETAILS = '/api/v1/configuration/supplier/get-supplier-details';
    static UPDATE_SUPPLIER_DETAILS = '/api/v1/configuration/supplier/update-supplier-details';
    static GET_SUPPLIER_LIST_FOR_DROPDOWN = '/api/v1/configuration/supplier/get-supplier-list-for-dropdown';
    static GET_SUPPLIER_ANALYTICS = '/api/v1/configuration/supplier/get-supplier-analytics';
    static GENERATE_SUPPLIER_PERFORMANCE_REPORT = '/api/v1/configuration/supplier/generate-supplier-performance-report';
    static EXPORT_SUPPLIER_DATA = '/api/v1/configuration/supplier/export-supplier-data';

    // Configuration Product APIs
    static GET_PRODUCT_LIST = '/api/v1/configuration/product/get-product-list';
    static CREATE_PRODUCT = '/api/v1/configuration/product/create-product';
    static UPDATE_PRODUCT_DETAILS = '/api/v1/configuration/product/update-product-details';
    static GET_PRODUCT_DETAILS = '/api/v1/configuration/product/get-product-details';
    static GET_PRODUCT_LIST_FOR_DROPDOWN = '/api/v1/configuration/product/get-product-list-for-dropdown';
    static DELETE_PRODUCT = '/api/v1/configuration/product/delete-product';
    static GENERATE_PRODUCT_INVENTORY_REPORT = '/api/v1/configuration/product/generate-product-inventory-report';
    static GENERATE_PRODUCT_MOVEMENT_REPORT = '/api/v1/configuration/product/generate-product-movement-report';

    static GET_WAREHOUSE_LIST = '/api/v1/configuration/warehouse/get-warehouse-list';
    static CREATE_WAREHOUSE = '/api/v1/configuration/warehouse/create-warehouse';
    static UPDATE_WAREHOUSE_DETAILS = '/api/v1/configuration/warehouse/update-warehouse-details';
    static GET_WAREHOUSE_DETAILS = '/api/v1/configuration/warehouse/get-warehouse-details';
    static GET_WAREHOUSE_LIST_FOR_DROPDOWN = '/api/v1/configuration/warehouse/get-warehouse-list-for-dropdown';
    static GENERATE_PRODUCT_LIST_REPORT_BY_WAREHOUSE = '/api/v1/configuration/warehouse/generate-product-list-report-by-warehouse';
    static GENERATE_INVENTORY_REPORT_BY_WAREHOUSE = '/api/v1/configuration/warehouse/generate-inventory-report-by-warehouse';

    static GET_AISLE_LIST = '/api/v1/configuration/aisle/get-aisle-list';
    static CREATE_AISLE = '/api/v1/configuration/aisle/create-aisle';
    static UPDATE_AISLE_DETAILS = '/api/v1/configuration/aisle/update-aisle-details';
    static GET_AISLE_DETAILS = '/api/v1/configuration/aisle/get-aisle-details';
    static GET_AISLE_LIST_FOR_DROPDOWN = '/api/v1/configuration/aisle/get-aisle-list-for-dropdown';
    static GENERATE_PRODUCT_LIST_REPORT_BY_AISLE = '/api/v1/configuration/aisle/generate-product-list-report-by-aisle';
    static GENERATE_INVENTORY_REPORT_BY_AISLE = '/api/v1/configuration/aisle/generate-inventory-report-by-aisle';

    static GET_PURCHASE_LIST = '/api/v1/inventory/purchase-order/get-purchase-list';
    static CREATE_PURCHASE = '/api/v1/inventory/purchase-order/create-purchase';
    static UPDATE_PURCHASE_DETAILS = '/api/v1/inventory/purchase-order/update-purchase-details';
    static GET_PURCHASE_DETAILS = '/api/v1/inventory/purchase-order/get-purchase-details';
    static GET_PURCHASE_LIST_FOR_DROPDOWN = '/api/v1/inventory/purchase-order/get-purchase-list-for-dropdown';
    static VERIFY_PURCHASE = '/api/v1/inventory/purchase-order/verify-purchase';
    static CANCEL_PURCHASE = '/api/v1/inventory/purchase-order/cancel-purchase';
    static GET_PURCHASE_ORDER_REPORT_INVENTORY = '/api/v1/inventory/purchase-order/get-purchase-order-report';
    static GET_PURCHASE_ORDER_PRODUCTS_REPORT_INVENTORY = '/api/v1/inventory/purchase-order/get-purchase-order-products-report';

    static GET_INVENTORY_OVERVIEW_PRODUCT_LIST = '/api/v1/inventory/inventory-overview/get-product-list';
    static GET_INVENTORY_OVERVIEW_PRODUCT_DETAILS = '/api/v1/inventory/inventory-overview/get-product-details';
    static UPDATE_INVENTORY_OVERVIEW_PRICING = '/api/v1/inventory/inventory-overview/update-pricing';

    static GET_PRODUCT_LIST_FOR_OVERVIEW = '/api/v1/manager/inventory-overview/get-product-list';
    static GET_PRODUCT_DETAILS_FOR_OVERVIEW = '/api/v1/manager/inventory-overview/get-product-details';
    static UPDATE_PRICING = '/api/v1/manager/inventory-overview/update-pricing';

    static UPDATE_ATTENDANCE = '/api/v1/salesman/attendance/update-attendance';
    static GET_ATTENDANCE_LIST = '/api/v1/salesman/attendance/get-attendance-list';
    static CHECK_CURRENT_ATTENDANCE_STATUS = '/api/v1/salesman/attendance/check-current-attendance-status';

    static GET_EMPLOYEE_ATTENDANCE_LIST = '/api/v1/manager/attendance/get-employee-attendance-list';
    static GET_EMPLOYEE_ATTENDANCE_DETAILS = '/api/v1/manager/attendance/get-employee-attendance-details';
    static UPDATE_EMPLOYEE_ATTENDANCE = '/api/v1/manager/attendance/update-employee-attendance';

    static GET_PRODUCT_LIST_FOR_SALE = '/api/v1/salesman/sale/get-product-list';
    static GET_INVOICE_NUMBER_FOR_SALE = '/api/v1/salesman/sale/get-invoice-number';
    static SAVE_INVOICE_IN_DRAFT = '/api/v1/salesman/sale/save-invoice-in-draft';
    static GET_INVOICE_DETAILS = '/api/v1/salesman/sale/get-invoice-details';
    static CONFIRM_SALES_INVOICE = '/api/v1/salesman/sale/confirm-sales-invoice';

    static GET_INVOICE_LIST = '/api/v1/salesman/invoice/get-invoice-list';
    static DELETE_INVOICE = '/api/v1/salesman/invoice/delete-invoice';

    static GET_INVOICE_LIST_FOR_MANAGER = '/api/v1/manager/invoice/get-invoice-list';

    static SAVE_PRODUCT_RETURN = '/api/v1/salesman/product-return/save-product-return';
    static GET_PRODUCT_RETURN_LIST = '/api/v1/salesman/product-return/get-product-return-list';
    static GET_PRODUCT_RETURN_DETAILS = '/api/v1/salesman/product-return/get-product-return-details';

    static GET_PRODUCT_RETURN_LIST_FOR_MANAGER = '/api/v1/manager/product-return/get-product-return-list';
    static GET_PRODUCT_RETURN_DETAILS_FOR_MANAGER = '/api/v1/manager/product-return/get-product-return-details';

    // Inventory Product Dispose APIs (revamp)
    static GET_PRODUCT_DISPOSE_LIST = '/api/v1/inventory/product-dispose/get-product-dispose-list';
    static CREATE_PRODUCT_DISPOSE = '/api/v1/inventory/product-dispose/create-product-dispose';
    static UPDATE_PRODUCT_DISPOSE_DETAILS = '/api/v1/inventory/product-dispose/update-product-dispose-details';
    static GET_PRODUCT_DISPOSE_DETAILS = '/api/v1/inventory/product-dispose/get-product-dispose-details';
    static APPROVE_PRODUCT_DISPOSE = '/api/v1/inventory/product-dispose/approve-product-dispose';
    static REJECT_PRODUCT_DISPOSE = '/api/v1/inventory/product-dispose/reject-product-dispose';
    static CANCEL_PRODUCT_DISPOSE = '/api/v1/inventory/product-dispose/cancel-product-dispose';
    static REVERSE_PRODUCT_DISPOSE = '/api/v1/inventory/product-dispose/reverse-product-dispose';
    static GET_PRODUCT_LIST_FOR_DISPOSE_DROPDOWN = '/api/v1/inventory/product-dispose/get-product-list-for-dispose-dropdown';

    // Sales & Orders module (revamp) — POS + online on the `orders` spine
    static POS_GET_PRODUCT_LIST = '/api/v1/sales/pos/get-product-list';
    static POS_GET_INVOICE_NUMBER = '/api/v1/sales/pos/get-invoice-number';
    static POS_CHECKOUT = '/api/v1/sales/pos/checkout';
    static POS_SAVE_DRAFT = '/api/v1/sales/pos/save-draft';
    static ONLINE_SMART_FILL = '/api/v1/sales/online/smart-fill';
    static ONLINE_CREATE_ORDER = '/api/v1/sales/online/create-online-order';
    static ONLINE_SAVE_DRAFT = '/api/v1/sales/online/save-draft';
    static ONLINE_CREATE_PREORDER = '/api/v1/sales/online/create-preorder';
    static ONLINE_CONVERT_PREORDER = '/api/v1/sales/online/convert-preorder';
    static ONLINE_PREORDERS_FOR_PRODUCT = '/api/v1/sales/online/get-preorders-for-product';
    static ORDER_LIST = '/api/v1/sales/order/get-order-list';
    static ORDER_DETAILS = '/api/v1/sales/order/get-order-details';
    static ORDER_CONFIRM = '/api/v1/sales/order/confirm';
    static ORDER_CANCEL = '/api/v1/sales/order/cancel';
    static ORDER_DELIVER = '/api/v1/sales/order/deliver';
    static ORDER_EDIT_PENDING = '/api/v1/sales/order/edit-pending';
    static ORDER_CREATE_RETURN = '/api/v1/sales/order/create-return';
    static DELIVERY_SEND_FOR_DELIVERY = '/api/v1/sales/delivery/send-for-delivery';

    static CHANGE_PASSWORD = '/api/v1/profile/change-password/change-user-password';
    static VERIFY_OTP_FOR_PASSWORD_CHANGE = '/api/v1/profile/change-password/verify-otp-for-password-change';

    static GET_PROFILE_INFO = '/api/v1/profile/profile-info/get-profile-info';

    static GET_DASHBOARD_DATA_FOR_MANAGER = '/api/v1/manager/dashboard/get-dashboard-data-for-manager';

    static GET_CURRENT_STOCK_REPORT = '/api/v1/manager/reports/get-current-stock-report';
    static GET_LOW_STOCK_REPORT = '/api/v1/manager/reports/get-low-stock-report';
    static GET_PRODUCT_WISE_STOCK_REPORT = '/api/v1/manager/reports/get-product-wise-stock-report';

    static GET_PURCHASE_ORDER_REPORT = '/api/v1/manager/reports/get-purchase-order-report';

    static GET_USER_NOTES = '/api/v1/profile/notes/get-note-list';
    static GET_NOTE_BY_ID = '/api/v1/profile/notes/get-note-details';
    static CREATE_NOTE = '/api/v1/profile/notes/create-note';
    static UPDATE_NOTE = '/api/v1/profile/notes/update-note';
    static DELETE_NOTE = '/api/v1/profile/notes/delete-note';

    // Analytics APIs
    static GET_ANALYTICS_METRICS = '/api/v1/configuration/analytics/get-analytics-metrics';
    static GET_STOCK_TREND = '/api/v1/configuration/analytics/get-stock-trend';
    static GET_INVENTORY_VALUE_TREND = '/api/v1/configuration/analytics/get-inventory-value-trend';
    static GET_TOP_PRODUCTS = '/api/v1/configuration/analytics/get-top-products';
    static GET_PRODUCT_PERFORMANCE = '/api/v1/configuration/analytics/get-product-performance';
    static GET_STOCK_MOVEMENTS = '/api/v1/configuration/analytics/get-stock-movements';
    static EXPORT_ANALYTICS_REPORT = '/api/v1/configuration/analytics/export-analytics-report';
    static GET_CONFIGURATION_DASHBOARD_SUMMARY = '/api/v1/configuration/analytics/get-configuration-dashboard-summary';
    static GET_ACTIVITY_LOG_LIST = '/api/v1/activity-log/get-activity-log-list';
}
