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
 * Breadcrumb configuration for Inventory module
 * Organized by features with parent-child structure
 */
export const INVENTORY_BREADCRUMBS: ModuleBreadcrumbConfig = {
    // Dashboard Feature - Module landing page
    dashboard: {
        parent: [{ label: 'Home', url: '/', icon: 'home' }],
        pages: {
            main: [], // No additional breadcrumb - stays at 2 levels
        },
    },

    // Inventory Overview Feature
    overview: {
        parent: [
            { label: 'Home', url: '/', icon: 'home' },
            { label: 'Inventory', url: '/inventory/overview' },
            { label: 'Inventory Overview', url: '/inventory/overview/list' },
        ],
        pages: {
            list: [{ label: 'List', url: '/inventory/overview/list' }],
            view: [{ label: 'View' }],
        },
    },

    // Purchase Order Feature
    'purchase-order': {
        parent: [
            { label: 'Home', url: '/', icon: 'home' },
            { label: 'Inventory', url: '/inventory/overview' },
            { label: 'Purchase Orders', url: '/inventory/purchase-order/list' },
        ],
        pages: {
            list: [{ label: 'List', url: '/inventory/purchase-order/list' }],
            create: [{ label: 'Create' }],
            view: [{ label: 'View' }],
            edit: [{ label: 'Edit' }],
        },
    },

    // Product Dispose Feature
    'product-dispose': {
        parent: [
            { label: 'Home', url: '/', icon: 'home' },
            { label: 'Inventory', url: '/inventory/overview' },
            { label: 'Product Dispose', url: '/inventory/product-dispose/list' },
        ],
        pages: {
            list: [{ label: 'List', url: '/inventory/product-dispose/list' }],
            create: [{ label: 'Create' }],
            view: [{ label: 'View' }],
            edit: [{ label: 'Edit' }],
        },
    },
};
