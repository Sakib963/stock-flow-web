import { Breadcrumb } from "@app/shared/components/page-header/page-header.component";
import { CONFIGURATION_BREADCRUMBS, ModuleBreadcrumbConfig } from "@app/modules/configuration/config/configuration-breadcrumb.config";
import { MANAGER_BREADCRUMBS } from "@app/modules/manager/config/breadcrumb.config";
import { ADMIN_BREADCRUMBS } from "@app/modules/admin/config/breadcrumb.config";

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
export function getGlobalBreadcrumbs(
  module: string,
  feature: string,
  pageType: string = 'list'
): Breadcrumb[] {
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
 * @param key - Format: 'module.feature-pageType' (e.g., 'configuration.category-list')
 * @returns Complete breadcrumb array
 */
export function getBreadcrumbsByKey(key: string): Breadcrumb[] {
  // Support both formats: 'module.feature-pageType' or 'module.feature.pageType'
  let module: string, feature: string, pageType: string;
  
  if (key.includes('-')) {
    // Format: 'module.feature-pageType'
    const [moduleFeature, page] = key.split('-');
    const parts = moduleFeature.split('.');
    module = parts[0];
    feature = parts[1];
    pageType = page || 'list';
  } else {
    // Format: 'module.feature.pageType'
    const parts = key.split('.');
    module = parts[0];
    feature = parts[1];
    pageType = parts[2] || 'list';
  }
  
  if (!module || !feature) {
    console.warn(`Invalid breadcrumb key format: '${key}'. Expected format: 'module.feature-pageType' or 'module.feature.pageType'`);
    return [];
  }
  
  return getGlobalBreadcrumbs(module, feature, pageType);
}
