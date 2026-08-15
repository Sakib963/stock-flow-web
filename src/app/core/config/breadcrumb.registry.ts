import { Breadcrumb } from '@app/shared/components/page-header/page-header.component';
import { CONFIGURATION_BREADCRUMBS, ModuleBreadcrumbConfig } from '@app/modules/configuration/config/configuration-breadcrumb.config';
import { MANAGER_BREADCRUMBS } from '@app/modules/manager/config/breadcrumb.config';
import { ADMIN_BREADCRUMBS } from '@app/modules/admin/config/breadcrumb.config';
import { INVENTORY_BREADCRUMBS } from '@app/modules/inventory/config/inventory-breadcrumb.config';
import { SALES_BREADCRUMBS } from '@app/modules/sales/config/sales-breadcrumb.config';

/**
 * Global breadcrumb registry that holds all module configurations
 */
export interface BreadcrumbRegistry {
    [moduleName: string]: ModuleBreadcrumbConfig;
}

/**
 * Central breadcrumb registry
 * Each module registers its breadcrumb configuration here
 */
export const BREADCRUMB_REGISTRY: BreadcrumbRegistry = {
    configuration: CONFIGURATION_BREADCRUMBS,
    inventory: INVENTORY_BREADCRUMBS,
    sales: SALES_BREADCRUMBS,
    manager: MANAGER_BREADCRUMBS,
    admin: ADMIN_BREADCRUMBS,
    // Add other modules as they are created
    // profile: PROFILE_BREADCRUMBS,
    // shared: SHARED_BREADCRUMBS,
};

/**
 * Get breadcrumbs from the global registry
 * @param module - Module name (e.g., 'configuration', 'manager')
 * @param feature - Feature name (e.g., 'category', 'product')
 * @param pageType - Page type (e.g., 'list', 'create', 'view', 'edit')
 * @returns Complete breadcrumb array
 */
export function getGlobalBreadcrumbs(module: string, feature: string, pageType: string = 'list'): Breadcrumb[] {
    const moduleConfig = BREADCRUMB_REGISTRY[module];

    if (!moduleConfig) {
        console.warn(`Module '${module}' not found in breadcrumb registry`);
        return [];
    }

    const featureConfig = moduleConfig[feature];

    if (!featureConfig) {
        console.warn(`Feature '${feature}' not found in module '${module}'`);
        return [];
    }

    // Combine parent breadcrumbs with page-specific breadcrumb
    return [...featureConfig.parent, ...(featureConfig.pages[pageType] || [])];
}

/**
 * Get breadcrumbs using compound key format
 * @param key - Format: 'module.feature.pageType' (e.g., 'configuration.category.list', 'configuration.sub-category.view')
 * @returns Complete breadcrumb array
 */
export function getBreadcrumbsByKey(key: string): Breadcrumb[] {
    // Format: 'module.feature.pageType'
    const parts = key.split('.');
    const module = parts[0];
    const feature = parts.slice(1, -1).join('.'); // Handle multi-part feature names like 'sub-category'
    const pageType = parts[parts.length - 1] || 'list';

    if (!module || !feature) {
        console.warn(`Invalid breadcrumb key format: '${key}'. Expected format: 'module.feature.pageType'`);
        return [];
    }

    return getGlobalBreadcrumbs(module, feature, pageType);
}
