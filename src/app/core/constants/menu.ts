import { MenuItem } from '../models/menu.model';
import { isOnlineEnabled, isPosEnabled } from './company-info';

export class Menu {
    // Getter so channel-dependent items (Sales & Orders) re-evaluate against the
    // runtime settings (order_system) each time the sidebar reads the menu.
    static get adminPages(): MenuItem[] {
        return [
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
            {
                group: 'Settings',
                icon: 'assets/icons/configuration-group.svg',
                items: [
                    {
                        icon: 'assets/icons/configuration-group.svg',
                        label: 'Settings',
                        route: '/settings',
                    },
                ],
            },
            {
                group: 'Activity',
                items: [
                    {
                        icon: 'assets/icons/report.svg',
                        label: 'Activity Log',
                        route: '/activity-log',
                    },
                ],
            },
        ];
    }

    static get managerPages(): MenuItem[] {
        return [
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
                    icon: 'assets/icons/stats.svg',
                    label: 'Stats',
                    route: '/configuration/stats',
                },
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
                // {
                //     icon: 'assets/icons/alert.svg',
                //     label: 'Alerts & Low Stock',
                //     route: '/configuration/alerts',
                // },
                // {
                //     icon: 'assets/icons/analytics.svg',
                //     label: 'Analytics',
                //     route: '/configuration/analytics',
                // },
            ],
        },
        {
            group: 'Inventory',
            icon: 'assets/icons/inventory-group.svg',
            items: [
                {
                    icon: 'assets/icons/inventory.svg',
                    label: 'Overview',
                    route: '/inventory/overview/list',
                },
                {
                    icon: 'assets/icons/purchase.svg',
                    label: 'Purchase Order',
                    route: '/inventory/purchase-order',
                },
                {
                    icon: 'assets/icons/invoice.svg',
                    label: 'Invoice',
                    route: '/manager/inventory/invoice',
                },
                {
                    icon: 'assets/icons/dispose.svg',
                    label: 'Dispose',
                    route: '/inventory/product-dispose/list',
                },
            ],
        },
        // {
        //     group: 'Employee',
        //     items: [
        //         {
        //             icon: 'assets/icons/calendar.svg',
        //             label: 'Attendance',
        //             route: '/manager/employee/attendance',
        //         },
        //     ],
        // },
        {
            group: 'Sales & Orders',
            icon: 'assets/icons/purchase.svg',
            // POS link depends on the shop's order system (company-info). New online orders
            // are created from the Orders page ("New Order"), so there is no separate menu item.
            items: [
                ...(isPosEnabled()
                    ? [
                          {
                              icon: 'assets/icons/purchase.svg',
                              label: 'POS Sale',
                              route: '/sales/pos',
                          },
                      ]
                    : []),
                {
                    icon: 'assets/icons/report.svg',
                    label: 'Orders',
                    route: '/sales/orders/list',
                },
                // Returns live here rather than under Inventory: a return is
                // rooted in an order and its refund is sales money. The stock
                // consequence still shows up in Inventory (Overview + Dispose).
                {
                    icon: 'assets/icons/product-return.svg',
                    label: 'Returns',
                    route: '/sales/returns/list',
                },
                // Pre-orders are bookings, not orders, so they get their own entry
                // rather than a filter on the Orders list. Online-only for now.
                ...(isOnlineEnabled()
                    ? [
                          {
                              icon: 'assets/icons/report.svg',
                              label: 'Pre-Orders',
                              route: '/sales/pre-order/list',
                          },
                      ]
                    : []),
            ],
        },
        {
            group: 'Analytics',
            icon: 'assets/icons/analytics.svg',
            items: [
                {
                    icon: 'assets/icons/report.svg',
                    label: 'Reports',
                    route: '/manager/reports',
                },
                {
                    icon: 'assets/icons/activity-log.svg',
                    label: 'Activity Log',
                    route: '/activity-log',
                },
            ],
        },
        {
            group: 'Settings',
            icon: 'assets/icons/configuration-group.svg',
            items: [
                {
                    icon: 'assets/icons/configuration-group.svg',
                    label: 'Settings',
                    route: '/settings',
                },
            ],
        },
        ];
    }

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
            group: 'Returns',
            items: [
                {
                    icon: 'assets/icons/product-return.svg',
                    label: 'Returns',
                    route: '/sales/returns/list',
                },
            ],
        },
        // {
        //     group: 'Employee',
        //     items: [
        //         {
        //             icon: 'assets/icons/calendar.svg',
        //             label: 'Attendance',
        //             route: '/shared/attendance',
        //         },
        //     ],
        // },
    ];
}
