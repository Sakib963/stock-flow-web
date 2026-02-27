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
 * Breadcrumb configuration for Configuration module
 * Organized by features with parent-child structure
 */
export const CONFIGURATION_BREADCRUMBS: ModuleBreadcrumbConfig = {
    // Dashboard Feature - Module landing page
    dashboard: {
        parent: [
            { label: 'Home', url: '/', icon: 'home' },
            { label: 'Configuration', url: '/configuration/stats' },
        ],
        pages: {
            main: [], // No additional breadcrumb - stays at 2 levels
        },
    },

    // Category Feature
    category: {
        parent: [
            { label: 'Home', url: '/', icon: 'home' },
            { label: 'Configuration', url: '/configuration/stats' },
            { label: 'Category', url: '/configuration/category/list' },
        ],
        pages: {
            list: [{ label: 'List', url: '/configuration/category/list' }],
            create: [{ label: 'Create' }],
            view: [{ label: 'View' }],
            edit: [{ label: 'Edit' }],
        },
    },

    // Sub-Category Feature
    'sub-category': {
        parent: [
            { label: 'Home', url: '/', icon: 'home' },
            { label: 'Configuration', url: '/configuration/stats' },
            { label: 'Sub Category', url: '/configuration/sub-category/list' },
        ],
        pages: {
            list: [{ label: 'List', url: '/configuration/sub-category/list' }],
            create: [{ label: 'Create' }],
            view: [{ label: 'View' }],
            edit: [{ label: 'Edit' }],
        },
    },

    // Brand Feature
    brand: {
        parent: [
            { label: 'Home', url: '/', icon: 'home' },
            { label: 'Configuration', url: '/configuration/stats' },
            { label: 'Brand', url: '/configuration/brand/list' },
        ],
        pages: {
            list: [{ label: 'List', url: '/configuration/brand/list' }],
            create: [{ label: 'Create' }],
            view: [{ label: 'View' }],
            edit: [{ label: 'Edit' }],
        },
    },

    // Supplier Feature
    supplier: {
        parent: [
            { label: 'Home', url: '/', icon: 'home' },
            { label: 'Configuration', url: '/configuration/stats' },
            { label: 'Supplier', url: '/configuration/supplier/list' },
        ],
        pages: {
            list: [{ label: 'List', url: '/configuration/supplier/list' }],
            create: [{ label: 'Create' }],
            view: [{ label: 'View' }],
            edit: [{ label: 'Edit' }],
        },
    },

    // Aisle Feature
    aisle: {
        parent: [{ label: 'Home', url: '/', icon: 'home' }, { label: 'Configuration', url: '/configuration/stats' }, { label: 'Aisle' }],
        pages: {
            list: [{ label: 'List', url: '/configuration/aisle/list' }],
            create: [{ label: 'Create' }],
            view: [{ label: 'View' }],
            edit: [{ label: 'Edit' }],
        },
    },

    // Analytics Feature
    analytics: {
        parent: [
            { label: 'Home', url: '/', icon: 'home' },
            { label: 'Configuration', url: '/configuration/stats' },
            { label: 'Analytics', url: '/configuration/analytics' },
        ],
        pages: {
            main: [{ label: 'Reports' }],
        },
    },

    // Add more features as needed
    // product: { parent: [...], pages: {...} },
};
