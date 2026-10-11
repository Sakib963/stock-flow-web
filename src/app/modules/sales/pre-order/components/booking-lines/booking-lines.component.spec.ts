import { TestBed } from '@angular/core/testing';
import { provideNzI18n, en_US } from 'ng-zorro-antd/i18n';
import { provideTranslateService } from '@ngx-translate/core';
import { ConversionLine } from '@app/core/models/pre-order.model';
import { OVERLAY_PROVIDERS } from '@app/shared/constants/overlay-providers';
import { BookingLinesComponent } from './booking-lines.component';

const line = (n: number, quantity = 1, sellable = 0): ConversionLine => ({
    oid: `l-${n}`,
    product_oid: `p-${n}`,
    product_name: `Product ${n}`,
    sku: null,
    quantity,
    unit_price: 1300,
    batches: sellable ? [{ product_oid: `p-${n}`, product_name: `Product ${n}`, image_url: null, sku: null, inventory_oid: `i-${n}`, batch_code: `B-${n}`, expiry_date: null, quantity_available: sellable, sellable_quantity: sellable, selling_price: 1450, maximum_discount: 100 }] : [],
});

const open = async (lines: ConversionLine[], inOrder: Map<string, number>) => {
    await TestBed.configureTestingModule({ imports: [BookingLinesComponent], providers: [provideNzI18n(en_US), provideTranslateService({ fallbackLang: 'en' }), ...OVERLAY_PROVIDERS] }).compileComponents();
    const fixture = TestBed.createComponent(BookingLinesComponent);
    fixture.componentRef.setInput('preorderNo', 'PRE-2610-0001');
    fixture.componentRef.setInput('lines', lines);
    fixture.componentRef.setInput('inOrder', inOrder);
    fixture.detectChanges();
    return { lines: fixture.componentInstance, element: fixture.nativeElement as HTMLElement };
};

describe('BookingLinesComponent', () => {
    it('takes one bar however many products were pre-ordered, and lists none of them until asked', async () => {
        const six = [line(1, 2, 5), line(2, 1, 5), line(3, 3, 5), line(4), line(5), line(6)];
        const { lines, element } = await open(six, new Map([['p-1', 2]]));
        expect(element.querySelectorAll('[data-booked]').length).toBe(0);
        expect(lines.left()).toBe(5);
        expect(element.querySelector('[data-booking="see-all"]')).not.toBeNull();
    });

    it('with 4 of 5 in the order, counts the one left and lists it first', async () => {
        const five = [line(1, 1, 5), line(2, 1, 5), line(3, 1, 5), line(4, 1, 5), line(5, 2, 5)];
        const { lines } = await open(
            five,
            new Map([
                ['p-1', 1],
                ['p-2', 1],
                ['p-3', 1],
                ['p-4', 1],
            ])
        );
        expect(lines.left()).toBe(1);
        expect(lines.ordered().map((wanted) => wanted.oid)).toEqual(['l-5', 'l-1', 'l-2', 'l-3', 'l-4']);
    });

    it('names the products without enough stock, since all products go together', async () => {
        const { lines, element } = await open([line(1, 2, 1), line(2, 1, 5), line(3, 1)], new Map());
        expect(lines.notInStock()).toEqual(['Product 1', 'Product 3']);
        expect(element.querySelector('[data-booking="not-ready"]')).not.toBeNull();
    });

    it('puts the products that can be added now before the ones with no stock', async () => {
        const { lines } = await open([line(1), line(2, 1, 5), line(3)], new Map());
        expect(lines.waiting().map((wanted) => wanted.oid)).toEqual(['l-2', 'l-1', 'l-3']);
    });

    it('closes the list and asks to search when a product is picked, and says all is in once it is', async () => {
        const { lines } = await open([line(1, 1, 5), line(2, 1, 5)], new Map([['p-1', 1]]));
        const asked: string[] = [];
        lines.find.subscribe((wanted) => asked.push(wanted.oid));
        lines.listOpen.set(true);
        lines.pick(lines.ordered()[0]);
        expect(asked).toEqual(['l-2']);
        expect(lines.listOpen()).toBe(false);
    });
});
