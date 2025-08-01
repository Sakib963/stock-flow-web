import { MenuItem } from '../models/menu.model';

export class Menu {
  static adminPages: MenuItem[] = [
    {
      group: 'Admin',
      items: [
        {
          icon: 'assets/icons/dashboard.svg',
          label: 'Dashboard',
          route: '/admin/dashboard',
        },
        {
          icon: 'assets/icons/user.svg',
          label: 'User',
          route: '/admin/user',
        },
      ],
    },
  ];

  static managerPages: MenuItem[] = [
    {
      group: '',
      items: [
        {
          icon: 'assets/icons/dashboard.svg',
          label: 'Dashboard',
          route: '/manager/dashboard',
        },
      ],
    },
    {
      group: 'Configuration',
      items: [
        {
          icon: 'assets/icons/category.svg',
          label: 'Category',
          route: '/manager/configuration/category',
        },
        {
          icon: 'assets/icons/sub_category.svg',
          label: 'Sub Category',
          route: '/manager/configuration/sub-category',
        },
        {
          icon: 'assets/icons/source.svg',
          label: 'Supplier',
          route: '/manager/configuration/supplier',
        },
        {
          icon: 'assets/icons/product.svg',
          label: 'Product',
          route: '/manager/configuration/product',
        },
        {
          icon: 'assets/icons/warehouse.svg',
          label: 'Warehouse',
          route: '/manager/configuration/warehouse',
        },
        {
          icon: 'assets/icons/shelf.svg',
          label: 'Aisle/Zone',
          route: '/manager/configuration/aisle',
        },
      ],
    },
    {
      group: 'Inventory',
      items: [
        {
          icon: 'assets/icons/inventory.svg',
          label: 'Overview',
          route: '/manager/inventory/overview',
        },
        {
          icon: 'assets/icons/purchase.svg',
          label: 'Purchase Order',
          route: '/manager/inventory/purchase-order',
        },
        {
          icon: 'assets/icons/invoice.svg',
          label: 'Invoice',
          route: '/manager/inventory/invoice',
        },
        {
          icon: 'assets/icons/product-return.svg',
          label: 'Product Return',
          route: '/manager/inventory/product-return',
        },
        {
          icon: 'assets/icons/dispose.svg',
          label: 'Dispose',
          route: '/manager/inventory/product-dispose',
        },
      ],
    },
    {
      group: 'Employee',
      items: [
        {
          icon: 'assets/icons/calendar.svg',
          label: 'Attendance',
          route: '/manager/employee/attendance',
        },
      ],
    },
  ];

  static salesPages: MenuItem[] = [
    {
      group: 'Sales',
      items: [
        {
          icon: 'assets/icons/purchase.svg',
          label: 'Quick Sale',
          route: '/sales/quick-sale',
        },
        {
          icon: 'assets/icons/invoice.svg',
          label: 'Invoice',
          route: '/sales/invoice',
        },
        {
          icon: 'assets/icons/dashboard.svg',
          label: 'Dashboard',
          route: '/sales/dashboard',
        },
        {
          icon: 'assets/icons/product-return.svg',
          label: 'Product Return',
          route: '/sales/product-return',
        },
      ],
    },
    {
      group: 'Shared',
      items: [
        {
          icon: 'assets/icons/calendar.svg',
          label: 'Attendance',
          route: '/shared/attendance',
        },
      ],
    },
  ];
}
