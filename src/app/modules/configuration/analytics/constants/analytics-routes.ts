import { AISLE_ROUTES } from '@app/modules/configuration/aisle/constants/aisle-routes';
import { BRAND_ROUTES } from '@app/modules/configuration/brand/constants/brand-routes';
import { CATEGORY_ROUTES } from '@app/modules/configuration/category/constants/category-routes';
import { PRODUCT_ROUTES } from '@app/modules/configuration/product/constants/product-routes';
import { SUB_CATEGORY_ROUTES } from '@app/modules/configuration/sub-category/constants/sub-category-routes';
import { SUPPLIER_ROUTES } from '@app/modules/configuration/supplier/constants/supplier-routes';
import { WAREHOUSE_ROUTES } from '@app/modules/configuration/warehouse/constants/warehouse-routes';
import { AnalyticsFeature, AttentionKey, SpreadGroup } from '@app/core/models/configuration-analytics.model';

interface FeatureRoutes {
    list: string;
    detail: (oid: string) => string;
}

const FEATURE: Record<AnalyticsFeature, FeatureRoutes> = {
    product: PRODUCT_ROUTES,
    category: CATEGORY_ROUTES,
    subCategory: SUB_CATEGORY_ROUTES,
    brand: BRAND_ROUTES,
    supplier: SUPPLIER_ROUTES,
    warehouse: WAREHOUSE_ROUTES,
    aisle: AISLE_ROUTES,
};

/** The five tiles, in menu order. A sub-feature shows as a second line under its parent. */
export const ANALYTICS_TILES: readonly { feature: AnalyticsFeature; child?: AnalyticsFeature; icon: string; routes: FeatureRoutes }[] = [
    { feature: 'product', icon: 'lucidePackage', routes: FEATURE.product },
    { feature: 'category', child: 'subCategory', icon: 'lucideFolderTree', routes: FEATURE.category },
    { feature: 'brand', icon: 'lucideTag', routes: FEATURE.brand },
    { feature: 'supplier', icon: 'lucideFactory', routes: FEATURE.supplier },
    { feature: 'warehouse', child: 'aisle', icon: 'lucideWarehouse', routes: FEATURE.warehouse },
];

/** Where each check's records open, and the icon that says what kind of record they are. */
export const ATTENTION_CHECKS: Record<AttentionKey, { icon: string; routes: FeatureRoutes }> = {
    productsWithoutPhoto: { icon: 'lucideImageOff', routes: FEATURE.product },
    productsWithoutBrand: { icon: 'lucideTag', routes: FEATURE.product },
    productsWithoutThreshold: { icon: 'lucideBellOff', routes: FEATURE.product },
    emptyCategories: { icon: 'lucideFolderTree', routes: FEATURE.category },
    emptySubCategories: { icon: 'lucideFolder', routes: FEATURE.subCategory },
    emptyBrands: { icon: 'lucideTag', routes: FEATURE.brand },
    emptyAisles: { icon: 'lucideRows3', routes: FEATURE.aisle },
    suppliersNeverBoughtFrom: { icon: 'lucideFactory', routes: FEATURE.supplier },
    inactiveCategoriesInUse: { icon: 'lucideEyeOff', routes: FEATURE.category },
    inactiveBrandsInUse: { icon: 'lucideEyeOff', routes: FEATURE.brand },
};

export const SPREAD_GROUPS: readonly SpreadGroup[] = ['category', 'brand', 'supplier'];

export const SPREAD_ROUTES: Record<SpreadGroup, FeatureRoutes> = {
    category: FEATURE.category,
    brand: FEATURE.brand,
    supplier: FEATURE.supplier,
};

/** The activity log's reference types, to the record page each one opens. */
export const CHANGE_ROUTES: Record<string, FeatureRoutes> = {
    product: FEATURE.product,
    category: FEATURE.category,
    'sub-category': FEATURE.subCategory,
    brand: FEATURE.brand,
    supplier: FEATURE.supplier,
    warehouse: FEATURE.warehouse,
    aisle: FEATURE.aisle,
};

/** One group holding this share of the catalogue or more is worth a sentence. */
export const CONCENTRATED_SHARE = 40;
