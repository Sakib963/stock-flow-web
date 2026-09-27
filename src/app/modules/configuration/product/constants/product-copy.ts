import { ProductField, ProductUnit } from '@app/core/models/product.model';

/** The copy for a field the server refused, by the field, so a Bengali reader is not handed the server's English. */
export const PRODUCT_REFUSED: Record<ProductField, string> = {
    sku: 'configuration.product.skuTaken',
    sub_category_oid: 'configuration.product.subCategoryInactive',
    brand_oid: 'configuration.product.brandInactive',
};

/** The units these shops count in, in the order someone looks for them. */
export const PRODUCT_UNITS: readonly ProductUnit[] = ['pcs', 'pair', 'set', 'dozen', 'box', 'pack', 'kg', 'g', 'l', 'm'];
