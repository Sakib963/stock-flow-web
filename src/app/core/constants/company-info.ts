// Which order channels this shop runs. Drives which intake routes/menu items are
// rendered and whether the Orders list needs channel filtering:
//   'pos'    -> counter sales only (no Online Order route)
//   'online' -> online/social selling only (no POS Sale route)
//   'both'   -> both channels; the Orders list gets a channel filter + column
export type OrderSystem = 'pos' | 'online' | 'both';

export const COMPANY_INFO = {
    appName: 'StockFlow',
    name: 'StockFlow Inc.',
    address: '123 Stock Management St., Stock City',
    phone: '+1 (555) 123-4567',
    email: 'info@stockflow.com',
    website: 'www.stockflow.com',
    // Order system this shop uses. Change to 'pos' or 'online' for a single-channel shop.
    orderSystem: 'both' as OrderSystem,
    // Default delivery charge (BDT) pre-filled on a new online order.
    defaultDeliveryCharge: 60,
    demoCredentials: {
        email: 'guest@stockflow.com',
        password: 'stockflow123',
    },
};

export const isPosEnabled = (): boolean => COMPANY_INFO.orderSystem === 'pos' || COMPANY_INFO.orderSystem === 'both';
export const isOnlineEnabled = (): boolean => COMPANY_INFO.orderSystem === 'online' || COMPANY_INFO.orderSystem === 'both';
export const isMultiChannel = (): boolean => COMPANY_INFO.orderSystem === 'both';
