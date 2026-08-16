import type { OrderSystem } from './settings-state';

// The shop's order-channel helpers now come from the runtime settings snapshot
// (settings-state), which SettingsService fills from the DB-backed Settings.
// Re-exported here so existing imports keep working.
export { isPosEnabled, isOnlineEnabled, isMultiChannel } from './settings-state';
export type { OrderSystem } from './settings-state';

// Compile-time fallback/brand defaults. The live values are served by SettingsService
// (Settings page) once loaded; this is only the seed/fallback if settings are unavailable.
export const COMPANY_INFO = {
    appName: 'StockFlow',
    name: 'StockFlow Inc.',
    address: '123 Stock Management St., Stock City',
    phone: '+1 (555) 123-4567',
    email: 'info@stockflow.com',
    website: 'www.stockflow.com',
    // Order system default (live value comes from Settings). Fallback only.
    orderSystem: 'both' as OrderSystem,
    // Default delivery charge (BDT) fallback; live value comes from Settings.
    defaultDeliveryCharge: 60,
    demoCredentials: {
        email: 'guest@stockflow.com',
        password: 'stockflow123',
    },
};
