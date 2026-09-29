import { PurchaseOrderLine, VerifyLinePayload } from '@app/core/models/purchase-order.model';
import { allArrived, budgetPerUnit, lineReady, marginPerUnit } from '@app/modules/inventory/purchase-order/utils/verify-line/verify-line';

const line = (overrides: Partial<PurchaseOrderLine> = {}): PurchaseOrderLine =>
    ({
        oid: 'l1',
        product_oid: 'p1',
        product_name: 'Cotton kurti',
        ordered_quantity: 80,
        ordered_unit_price: '450',
        current_selling_price: '890',
        current_maximum_discount: '50',
        ...overrides,
    }) as PurchaseOrderLine;

const counted = (overrides: Partial<VerifyLinePayload> = {}): VerifyLinePayload => ({ ...allArrived(line())!, ...overrides });

describe('checking a delivery line', () => {
    it('ticks a line as arrived at the ordered quantity and price, keeping the price it already sells at', () => {
        expect(allArrived(line())).toEqual(expect.objectContaining({ received_quantity: 80, unit_price: 450, intended_use: 'for_sale', selling_price: 890, maximum_discount: 50 }));
    });

    it('cannot tick a product that has never been priced, because a price has to be set', () => {
        expect(allArrived(line({ current_selling_price: null }))).toBeNull();
    });

    it('refuses more than was ordered', () => {
        expect(lineReady(counted({ received_quantity: 81 }), line())).toBe(false);
    });

    it('refuses a discount above the selling price', () => {
        expect(lineReady(counted({ maximum_discount: 900 }), line())).toBe(false);
    });

    it('needs no price for stock kept for internal use', () => {
        expect(lineReady(counted({ intended_use: 'internal_use', selling_price: undefined, maximum_discount: undefined }), line())).toBe(true);
    });

    it('takes the price billed and every budget off the margin', () => {
        const value = counted({ unit_price: 470, ad_run_cost: 20, gift_cost: 5 });
        expect(marginPerUnit(890, value.unit_price, budgetPerUnit(value))).toBe(395);
    });
});
