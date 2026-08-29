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
                // Points at the revamp dashboard until the single feature-based
                // /dashboard route is built. The legacy /manager/dashboard is gone.
                {
                    icon: 'assets/icons/dashboard.svg',
                    label: 'Dashboard',
                    route: '/configuration/stats',
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
                // Analytics moves to the "Analytics & Reports" group when the
                // Reports feature lands. Backlog item, not forgotten.
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
                    icon: 'assets/icons/dispose.svg',
                    label: 'Dispose',
                    route: '/inventory/product-dispose/list',
                },
            ],
        },
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
            // Becomes "Analytics & Reports" once the Reports feature is built and
            // the existing analytics page is surfaced. Both are backlog items; the
            // legacy /manager/reports page was deleted with the rest of that module.
            group: 'Analytics',
            icon: 'assets/icons/analytics.svg',
            items: [
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

    // Every entry points at a revamp route. Quick Sale became POS and the legacy
    // invoice list was replaced by the Orders list, so the two dead links this
    // list used to carry are gone rather than repaired in place.
    static salesPages: MenuItem[] = [
        {
            group: 'Sales & Orders',
            icon: 'assets/icons/purchase.svg',
            items: [
                {
                    icon: 'assets/icons/purchase.svg',
                    label: 'POS Sale',
                    route: '/sales/pos',
                },
                {
                    icon: 'assets/icons/report.svg',
                    label: 'Orders',
                    route: '/sales/orders/list',
                },
                {
                    icon: 'assets/icons/product-return.svg',
                    label: 'Returns',
                    route: '/sales/returns/list',
                },
            ],
        },
    ];
}
