import { Breadcrumb } from '@app/shared/components/page-header/page-header.component';

export interface FeatureBreadcrumbs {
    parent: Breadcrumb[];
    pages: {
        [pageType: string]: Breadcrumb[];
    };
}

export interface ModuleBreadcrumbConfig {
    [featureName: string]: FeatureBreadcrumbs;
}

/**
 * Breadcrumb configuration for the Sales & Orders module.
 * Keyed as 'sales.<feature>.<pageType>' (e.g. 'sales.orders.list', 'sales.orders.view').
 */
export const SALES_BREADCRUMBS: ModuleBreadcrumbConfig = {
    orders: {
        parent: [
            { label: 'Home', url: '/', icon: 'home' },
            { label: 'Orders', url: '/sales/orders/list' },
        ],
        pages: {
            list: [{ label: 'List' }],
            view: [{ label: 'Details' }],
        },
    },

    online: {
        parent: [
            { label: 'Home', url: '/', icon: 'home' },
            { label: 'Orders', url: '/sales/orders/list' },
        ],
        pages: {
            create: [{ label: 'New Order' }],
            edit: [{ label: 'Edit Order' }],
        },
    },

    pos: {
        parent: [
            { label: 'Home', url: '/', icon: 'home' },
            { label: 'POS Sale', url: '/sales/pos' },
        ],
        pages: {
            main: [],
        },
    },

    // Pre-orders are bookings, not orders, so they get their own trail rather
    // than hanging off Orders.
    'pre-order': {
        parent: [
            { label: 'Home', url: '/', icon: 'home' },
            { label: 'Pre-Orders', url: '/sales/pre-order/list' },
        ],
        pages: {
            list: [{ label: 'List' }],
            create: [{ label: 'New Pre-Order' }],
            view: [{ label: 'Details' }],
            edit: [{ label: 'Edit' }],
        },
    },
};
