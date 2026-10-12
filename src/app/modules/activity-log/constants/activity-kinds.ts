import { ActivityArea } from '@app/core/models/activity-log.model';

/** Each area's icon and NG-Zorro tag colour, the same on the feed, the filter and the breakdown. */
export const AREA_STYLE: Record<ActivityArea, { icon: string; color: string }> = {
    sales: { icon: 'lucideShoppingBag', color: 'blue' },
    inventory: { icon: 'lucideWarehouse', color: 'green' },
    configuration: { icon: 'lucideSettings2', color: 'purple' },
    settings: { icon: 'lucideStore', color: 'orange' },
    security: { icon: 'lucideShieldCheck', color: 'red' },
    other: { icon: 'lucideCircleDot', color: 'default' },
};

export const AREAS = Object.keys(AREA_STYLE) as ActivityArea[];

/**
 * Where an entry's record opens, by the kind the server wrote, and the permission that page needs.
 * An entry links only when its record still exists and the person may open that page.
 */
export const RECORD_LINK: Record<string, { route: string; permission: string }> = {
    order: { route: '/app/sales/orders/:oid', permission: 'sales.order.view' },
    customer: { route: '/app/sales/customers/:oid', permission: 'sales.customer.view' },
    giveaway: { route: '/app/sales/giveaways/:oid', permission: 'sales.giveaway.view' },
    pre_order: { route: '/app/sales/pre-orders/:oid', permission: 'sales.pre-order.view' },
    'pre-order': { route: '/app/sales/pre-orders/:oid', permission: 'sales.pre-order.view' },
    'delivery-batch': { route: '/app/sales/delivery-batches/:oid', permission: 'sales.delivery-batch.view' },
    'product-return': { route: '/app/sales/returns/:oid', permission: 'sales.return.view' },
    'purchase-order': { route: '/app/inventory/purchase-orders/:oid', permission: 'inventory.purchase-order.view' },
    purchase: { route: '/app/inventory/purchase-orders/:oid', permission: 'inventory.purchase-order.view' },
    'product-dispose': { route: '/app/inventory/disposals/:oid', permission: 'inventory.product-dispose.view' },
    'stock-adjustment': { route: '/app/inventory/stock-adjustments/:oid', permission: 'inventory.stock-adjustment.view' },
    'product-stock': { route: '/app/inventory/overview/:oid', permission: 'inventory.overview.view' },
    product: { route: '/app/configuration/products/:oid', permission: 'configuration.product.view' },
    brand: { route: '/app/configuration/brands/:oid', permission: 'configuration.brands.view' },
    category: { route: '/app/configuration/categories/:oid', permission: 'configuration.category.view' },
    'sub-category': { route: '/app/configuration/sub-categories/:oid', permission: 'configuration.sub-category.view' },
    supplier: { route: '/app/configuration/suppliers/:oid', permission: 'configuration.supplier.view' },
    warehouse: { route: '/app/configuration/warehouses/:oid', permission: 'configuration.warehouse.view' },
    aisle: { route: '/app/configuration/aisles/:oid', permission: 'configuration.aisle.view' },
};
