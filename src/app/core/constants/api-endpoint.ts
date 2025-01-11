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

  static GET_SUPPLIER_DEALER_LIST = '/api/v1/manager/supplier-dealer/get-supplier-dealer-list';
  static CREATE_SUPPLIER_DEALER = '/api/v1/manager/supplier-dealer/create-supplier-dealer';
  static GET_SUPPLIER_DEALER_DETAILS = '/api/v1/manager/supplier-dealer/get-supplier-dealer-details';
  static UPDATE_SUPPLIER_DEALER_DETAILS = "/api/v1/manager/supplier-dealer/update-supplier-dealer-details";
  static GET_SUPPLIER_DEALER_LIST_FOR_DROPDOWN = "/api/v1/manager/supplier-dealer/get-supplier-dealer-list-for-dropdown";
  
  static GET_PRODUCT_LIST = "/api/v1/manager/product/get-product-list";
  static CREATE_PRODUCT = "/api/v1/manager/product/create-product";
  static UPDATE_PRODUCT_DETAILS = "/api/v1/manager/product/update-product-details";
  static GET_PRODUCT_DETAILS = "/api/v1/manager/product/get-product-details";
  static GET_PRODUCT_LIST_FOR_DROPDOWN = "/api/v1/manager/product/get-product-list-for-dropdown";
}
