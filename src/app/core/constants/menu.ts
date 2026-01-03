import { MenuItem } from '../models/menu.model';

export class Menu {
  static adminPages: MenuItem[] = [
    {
      group: 'Admin',
      icon: 'assets/icons/dashboard.svg',
      items: [
        {
          icon: 'assets/icons/dashboard.svg',
          label: 'Dashboard',
          route: '/admin/dashboard',
        },
      ],
    },
    {
      group: 'User Management',
      items: [
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
      icon: 'assets/icons/configuration-group.svg',
      items: [
        {
          icon: 'assets/icons/category.svg',
          label: 'Category',
          route: '/configuration/category',
        },
        {
          icon: 'assets/icons/sub_category.svg',
          label: 'Sub Category',
          route: '/configuration/sub-category',
        },
        {
          icon: 'assets/icons/brands.svg',
          label: 'Brands',
          route: '/configuration/brands',
        },
        {
          icon: 'assets/icons/source.svg',
          label: 'Supplier',
          route: '/configuration/supplier',
        },
        {
          icon: 'assets/icons/product.svg',
          label: 'Product',
          route: '/configuration/product',
        },
        {
          icon: 'assets/icons/warehouse.svg',
          label: 'Warehouse',
          route: '/configuration/warehouse',
        },
        {
          icon: 'assets/icons/shelf.svg',
          label: 'Aisle/Zone',
          route: '/configuration/aisle',
        },
      ],
    },
    {
      group: 'Inventory',
      icon: 'assets/icons/inventory-group.svg',
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
    {
      group: 'Analytics',
      items: [
        {
          icon: 'assets/icons/report.svg',
          label: 'Reports',
          route: '/manager/reports',
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
      ],
    },
    {
      group: 'Invoice',
      items: [
        {
          icon: 'assets/icons/invoice.svg',
          label: 'Invoice',
          route: '/sales/invoice',
        },
      ],
    },
    {
      group: 'Product Return',
      items: [
        {
          icon: 'assets/icons/product-return.svg',
          label: 'Product Return',
          route: '/sales/product-return',
        },
      ],
    },
    {
      group: 'Employee',
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
