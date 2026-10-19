import { FilterValues } from '@app/core/models/filter.model';
import { AttentionKey } from '@app/core/models/dashboard.model';

export interface AttentionLink {
    icon: string;
    tone: 'neutral' | 'warning' | 'danger';
    route: string;
    filters?: FilterValues;
}

/** Where each waiting kind leads. The order here is the order on the page: work first, stock after. */
export const ATTENTION: Record<AttentionKey, AttentionLink> = {
    orders_to_confirm: { icon: 'lucideClipboardCheck', tone: 'warning', route: '/app/sales/orders', filters: { status: 'Pending' } },
    orders_to_dispatch: { icon: 'lucidePackage', tone: 'neutral', route: '/app/sales/orders', filters: { status: 'Confirmed', delivery_status: 'Preparing,Packed' } },
    parcels_with_courier: { icon: 'lucideTruck', tone: 'neutral', route: '/app/sales/orders', filters: { delivery_status: 'WithCourier' } },
    returns_to_confirm: { icon: 'lucideUndo2', tone: 'warning', route: '/app/sales/returns', filters: { status: 'Pending' } },
    pre_orders_ready: { icon: 'lucidePackageCheck', tone: 'neutral', route: '/app/sales/pre-orders', filters: { ready: 'true' } },
    pre_orders_overdue: { icon: 'lucideCalendarX', tone: 'warning', route: '/app/sales/pre-orders', filters: { overdue: 'true' } },
    purchase_orders_to_verify: { icon: 'lucideClipboardList', tone: 'neutral', route: '/app/inventory/purchase-orders', filters: { status: 'Submitted' } },
    disposals_to_approve: { icon: 'lucideTrash2', tone: 'neutral', route: '/app/inventory/disposals', filters: { status: 'Submitted' } },
    adjustments_to_verify: { icon: 'lucideScale', tone: 'neutral', route: '/app/inventory/stock-adjustments', filters: { status: 'Submitted' } },
    out_of_stock: { icon: 'lucideCircleX', tone: 'danger', route: '/app/inventory/overview', filters: { stock_status: 'out' } },
    low_on_stock: { icon: 'lucideCircleAlert', tone: 'warning', route: '/app/inventory/overview', filters: { stock_status: 'low' } },
    expiring: { icon: 'lucideCalendarClock', tone: 'warning', route: '/app/inventory/overview', filters: { expiry_state: 'expired,soon' } },
    posts_past_due: { icon: 'lucideMegaphone', tone: 'warning', route: '/app/marketing/campaigns' },
};

export interface QuickAction {
    key: string;
    icon: string;
    route: string;
    permission: string;
}

export const QUICK_ACTIONS: readonly QuickAction[] = [
    { key: 'counterSale', icon: 'lucideShoppingCart', route: '/app/sales/pos', permission: 'sales.pos.create' },
    { key: 'onlineOrder', icon: 'lucideSend', route: '/app/sales/online-order', permission: 'sales.online.create' },
    { key: 'preOrder', icon: 'lucideCalendarPlus', route: '/app/sales/pre-orders/new', permission: 'sales.pre-order.create' },
    { key: 'purchaseOrder', icon: 'lucideClipboardPlus', route: '/app/inventory/purchase-orders/new', permission: 'inventory.purchase-order.create' },
];

export const PERIOD_STORAGE_KEY = 'sf.dashboard.period';
