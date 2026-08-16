// Runtime snapshot of the shop settings that must be read SYNCHRONOUSLY
// (routing + sidebar menu decide which sales channels to show at build time).
// SettingsService.load() fills this in once the settings API responds; until then
// the safe defaults below apply. Async/reactive consumers should read the
// SettingsService signal instead.

export type OrderSystem = 'pos' | 'online' | 'both';

interface RuntimeSettings {
    order_system: OrderSystem;
    default_delivery_charge: number;
}

let state: RuntimeSettings = {
    order_system: 'both',
    default_delivery_charge: 60,
};

export const setSettingsState = (partial: Partial<RuntimeSettings>): void => {
    state = { ...state, ...partial };
};

export const getOrderSystem = (): OrderSystem => state.order_system;
export const getDefaultDeliveryCharge = (): number => state.default_delivery_charge;

export const isPosEnabled = (): boolean => state.order_system === 'pos' || state.order_system === 'both';
export const isOnlineEnabled = (): boolean => state.order_system === 'online' || state.order_system === 'both';
export const isMultiChannel = (): boolean => state.order_system === 'both';
