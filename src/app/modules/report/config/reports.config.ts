import { ReportDefinition, ReportGroup } from '@app/core/models/report.model';

/** The permission each group's pages and downloads need (docs/report REQ-01). */
export const REPORT_PERMISSION: Record<ReportGroup, { view: string; export: string }> = {
    sales: { view: 'report.sales.view', export: 'report.sales.export' },
    stock: { view: 'report.stock.view', export: 'report.stock.export' },
    customer: { view: 'report.customer.view', export: 'report.customer.export' },
    marketing: { view: 'report.marketing.view', export: 'report.marketing.export' },
};

/** Each group's reports in the order the group page lists them, with the filters each one takes. */
export const REPORTS: Record<ReportGroup, readonly ReportDefinition[]> = {
    sales: [
        { key: 'sales-register', icon: 'lucideReceiptText', filters: ['period', 'channel'], extraTotals: ['sales_count'], hidden: ['payment_method', 'goods', 'discount', 'returns', 'customer_total', 'cost'] },
        { key: 'daily-sales', icon: 'lucideCalendarDays', filters: ['period', 'channel'] },
        { key: 'sales-by-product', icon: 'lucidePackage', filters: ['period', 'channel', 'category'], hidden: ['sku'] },
        { key: 'profit-by-category', icon: 'lucideFolderTree', filters: ['period', 'channel'] },
        { key: 'returns', icon: 'lucideUndo2', filters: ['period', 'channel'], hidden: ['customer'] },
        { key: 'customer-dues', icon: 'lucideHandCoins', filters: ['channel'], hidden: ['payment_status', 'customer_total'] },
        { key: 'cod-with-couriers', icon: 'lucideTruck', filters: [], hidden: ['customer'] },
        { key: 'pre-order-deposits', icon: 'lucideCalendarClock', filters: [], requires: 'sales.pre-order.view' },
    ],
    stock: [
        { key: 'stock-on-hand', icon: 'lucideBoxes', filters: ['warehouse', 'category'], hidden: ['sku', 'aisle', 'expiry', 'batch_status', 'selling_price', 'cost_price'] },
        { key: 'stock-movement-summary', icon: 'lucideArrowLeftRight', filters: ['period', 'warehouse', 'category'], hidden: ['sku', 'category'] },
        { key: 'reorder-list', icon: 'lucideShoppingCart', filters: ['category'] },
        { key: 'expiring-stock', icon: 'lucideCalendarClock', filters: ['expires-by', 'warehouse', 'category'], hidden: ['sku', 'category', 'cost_price'] },
        { key: 'purchases-received', icon: 'lucideTruck', filters: ['period', 'supplier'] },
        { key: 'supplier-dues', icon: 'lucideWallet', filters: ['supplier'], requires: 'inventory.stock-value.view' },
        { key: 'disposals', icon: 'lucideTrash2', filters: ['period', 'dispose-reason'], hidden: ['cost_price'] },
        { key: 'stock-adjustments', icon: 'lucideSlidersHorizontal', filters: ['period', 'adjustment-reason'], hidden: ['cost_price'] },
    ],
    customer: [
        { key: 'customer-list', icon: 'lucideUsers', filters: ['customer-status', 'gender', 'age-band'], hidden: ['customer_status', 'first_source', 'first_purchase'] },
        { key: 'customers-by-district', icon: 'lucideMapPin', filters: ['period'], requires: 'sales.online.view' },
        { key: 'customers-by-age-gender', icon: 'lucideUserRound', filters: ['period'] },
        { key: 'customers-gone-quiet', icon: 'lucideUserX', filters: ['quiet-days'] },
    ],
    marketing: [
        { key: 'sales-by-source', icon: 'lucideGlobe', filters: ['period'] },
        { key: 'campaign-costs', icon: 'lucideRocket', filters: ['period', 'campaign-status'] },
        { key: 'partner-payments', icon: 'lucideHandCoins', filters: ['period'], requires: 'marketing.partner-payment.view' },
        { key: 'partner-dues', icon: 'lucideWallet', filters: [], requires: 'marketing.partner-payment.view' },
        { key: 'giveaways', icon: 'lucideGift', filters: ['period'] },
    ],
};

export const DISPOSE_REASONS = ['damaged', 'expired', 'spoiled', 'sample', 'quality_reject', 'other'] as const;
export const ADJUSTMENT_REASONS = ['opening_stock', 'found', 'lost', 'theft', 'entry_error'] as const;
