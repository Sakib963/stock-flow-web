export class APIEndpoint {
  static SIGN_IN = '/api/v1/auth/sign-in';
  static REFRESH_TOKEN = '/api/v1/auth/refresh-token';
  static GET_USER_INFO = '/api/v1/auth/get-user-info';

  static GET_USER_LIST = '/api/v1/admin/user/get-user-list';
  static CREATE_USER = '/api/v1/admin/user/create-user';
  static GET_USER_DETAILS = '/api/v1/admin/user/get-user-details';
  static UPDATE_USER_DETAILS = "/api/v1/admin/user/update-user-details";

  static GET_CATEGORY_LIST = '/api/v1/manager/category/get-category-list';
  static CREATE_CATEGORY = '/api/v1/manager/category/create-category';
  static GET_CATEGORY_DETAILS = '/api/v1/manager/category/get-category-details';
  static UPDATE_CATEGORY_DETAILS = "/api/v1/manager/category/update-category-details";
  static GET_CATEGORY_LIST_FOR_DROPDOWN = "/api/v1/manager/category/get-category-list-for-dropdown";

  
  static GET_SUB_CATEGORY_LIST = "/api/v1/manager/sub-category/get-sub-category-list";
  static CREATE_SUB_CATEGORY = "/api/v1/manager/sub-category/create-sub-category";
  static UPDATE_SUB_CATEGORY_DETAILS = "/api/v1/manager/sub-category/update-sub-category-details";
  static GET_SUB_CATEGORY_DETAILS = "/api/v1/manager/sub-category/get-sub-category-details";
  static GET_SUB_CATEGORY_LIST_FOR_DROPDOWN = "/api/v1/manager/sub-category/get-sub-category-list-for-dropdown";

  static GET_SUPPLIER_LIST = '/api/v1/manager/supplier/get-supplier-list';
  static CREATE_SUPPLIER = '/api/v1/manager/supplier/create-supplier';
  static GET_SUPPLIER_DETAILS = '/api/v1/manager/supplier/get-supplier-details';
  static UPDATE_SUPPLIER_DETAILS = "/api/v1/manager/supplier/update-supplier-details";
  static GET_SUPPLIER_LIST_FOR_DROPDOWN = "/api/v1/manager/supplier/get-supplier-list-for-dropdown";
  
  static GET_PRODUCT_LIST = "/api/v1/manager/product/get-product-list";
  static CREATE_PRODUCT = "/api/v1/manager/product/create-product";
  static UPDATE_PRODUCT_DETAILS = "/api/v1/manager/product/update-product-details";
  static GET_PRODUCT_DETAILS = "/api/v1/manager/product/get-product-details";
  static GET_PRODUCT_LIST_FOR_DROPDOWN = "/api/v1/manager/product/get-product-list-for-dropdown";

  
  static GET_WAREHOUSE_LIST = "/api/v1/manager/warehouse/get-warehouse-list";
  static CREATE_WAREHOUSE = "/api/v1/manager/warehouse/create-warehouse";
  static UPDATE_WAREHOUSE_DETAILS = "/api/v1/manager/warehouse/update-warehouse-details";
  static GET_WAREHOUSE_DETAILS = "/api/v1/manager/warehouse/get-warehouse-details";
  static GET_WAREHOUSE_LIST_FOR_DROPDOWN = "/api/v1/manager/warehouse/get-warehouse-list-for-dropdown";

  static GET_AISLE_LIST = "/api/v1/manager/aisle/get-aisle-list";
  static CREATE_AISLE = "/api/v1/manager/aisle/create-aisle";
  static UPDATE_AISLE_DETAILS = "/api/v1/manager/aisle/update-aisle-details";
  static GET_AISLE_DETAILS = "/api/v1/manager/aisle/get-aisle-details";
  static GET_AISLE_LIST_FOR_DROPDOWN = "/api/v1/manager/aisle/get-aisle-list-for-dropdown";

  static GET_PURCHASE_LIST = "/api/v1/manager/purchase/get-purchase-list";
  static CREATE_PURCHASE = "/api/v1/manager/purchase/create-purchase";
  static UPDATE_PURCHASE_DETAILS = "/api/v1/manager/purchase/update-purchase-details";
  static GET_PURCHASE_DETAILS = "/api/v1/manager/purchase/get-purchase-details";
  static GET_PURCHASE_LIST_FOR_DROPDOWN = "/api/v1/manager/purchase/get-purchase-list-for-dropdown";
  static VERIFY_PURCHASE = "/api/v1/manager/purchase/verify-purchase";
  static CANCEL_PURCHASE = "/api/v1/manager/purchase/cancel-purchase";

  static GET_PRODUCT_LIST_FOR_OVERVIEW = "/api/v1/manager/inventory-overview/get-product-list";
  static GET_PRODUCT_DETAILS_FOR_OVERVIEW = "/api/v1/manager/inventory-overview/get-product-details";
  static UPDATE_PRICING = "/api/v1/manager/inventory-overview/update-pricing";
  
  static UPDATE_ATTENDANCE = "/api/v1/salesman/attendance/update-attendance";
  static GET_ATTENDANCE_LIST = "/api/v1/salesman/attendance/get-attendance-list";
  static CHECK_CURRENT_ATTENDANCE_STATUS = "/api/v1/salesman/attendance/check-current-attendance-status";
  
  static GET_EMPLOYEE_ATTENDANCE_LIST = "/api/v1/manager/attendance/get-employee-attendance-list";
  static GET_EMPLOYEE_ATTENDANCE_DETAILS = "/api/v1/manager/attendance/get-employee-attendance-details";
  static UPDATE_EMPLOYEE_ATTENDANCE = "/api/v1/manager/attendance/update-employee-attendance";

  static GET_PRODUCT_LIST_FOR_SALE = "/api/v1/salesman/sale/get-product-list";
  static GET_INVOICE_NUMBER_FOR_SALE = "/api/v1/salesman/sale/get-invoice-number";
  static SAVE_INVOICE_IN_DRAFT = "/api/v1/salesman/sale/save-invoice-in-draft";
  static GET_INVOICE_DETAILS = "/api/v1/salesman/sale/get-invoice-details";
  static CONFIRM_SALES_INVOICE = "/api/v1/salesman/sale/confirm-sales-invoice";
  
  static GET_INVOICE_LIST = "/api/v1/salesman/invoice/get-invoice-list";
  static DELETE_INVOICE = "/api/v1/salesman/invoice/delete-invoice";

  static GET_INVOICE_LIST_FOR_MANAGER = "/api/v1/manager/invoice/get-invoice-list";

  static SAVE_PRODUCT_RETURN = "/api/v1/salesman/product-return/save-product-return";
  static GET_PRODUCT_RETURN_LIST = "/api/v1/salesman/product-return/get-product-return-list";
  static GET_PRODUCT_RETURN_DETAILS = "/api/v1/salesman/product-return/get-product-return-details";

  static GET_PRODUCT_RETURN_LIST_FOR_MANAGER = "/api/v1/manager/product-return/get-product-return-list";
  static GET_PRODUCT_RETURN_DETAILS_FOR_MANAGER = "/api/v1/manager/product-return/get-product-return-details";

  static GET_PRODUCT_LIST_FOR_DISPOSE_DROPDOWN = "/api/v1/manager/product-dispose/get-product-list-for-dispose-dropdown";
  static CREATE_PRODUCT_DISPOSE = "/api/v1/manager/product-dispose/create-product-dispose";
  static GET_PRODUCT_DISPOSE_LIST = "/api/v1/manager/product-dispose/get-product-dispose-list";
  static GET_PRODUCT_DISPOSE_DETAILS = "/api/v1/manager/product-dispose/get-product-dispose-details";
}