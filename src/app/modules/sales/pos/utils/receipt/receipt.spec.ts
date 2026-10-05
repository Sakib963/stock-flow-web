import { ReceiptContent, drawReceipt } from './receipt';

const content = (over: Partial<ReceiptContent> = {}): ReceiptContent => ({
    business: 'A boutique',
    contact: ['House 5, Road 2, Dhaka', '01711000000'],
    meta: [['Invoice', '2610040001'], ['Customer', 'A customer with a rather long name']],
    lines: [{ name: 'Floral print kurti x2', amount: '2,900.00' }],
    totals: [['Subtotal', '2,900.00'], ['Discount', '-100.00']],
    total: ['Total', '2,800.00 BDT'],
    payment: [['Paid by', 'Cash']],
    thanks: 'Thank you!',
    poweredBy: 'Powered by StockFlow',
    ...over,
});

describe('drawReceipt', () => {
    it('prints within the roll, in heavy black type and never in monospace', () => {
        const receipt = drawReceipt(document, content(), '58');
        expect(receipt.style.width).toBe('48mm');
        expect(receipt.style.fontWeight).toBe('700');
        expect(receipt.style.color).toMatch(/^(#000|rgb\(0, 0, 0\))$/);
        expect(receipt.style.fontFamily).not.toMatch(/mono|courier/i);
        expect(parseInt(receipt.style.fontSize, 10)).toBeGreaterThanOrEqual(12);
        expect(drawReceipt(document, content(), '80').style.width).toBe('72mm');
    });

    it('shows a product or customer name as text, never as markup', () => {
        const receipt = drawReceipt(document, content({ lines: [{ name: '<img src=x onerror=alert(1)>', amount: '10.00' }] }), '58');
        expect(receipt.querySelector('img')).toBeNull();
        expect(receipt.textContent).toContain('<img src=x onerror=alert(1)>');
    });

    it('keeps the Customer label whole when the name under it is long', () => {
        const receipt = drawReceipt(document, content(), '58');
        const label = [...receipt.querySelectorAll('div')].find((el) => el.textContent === 'Customer') as HTMLElement;
        expect(label.style.whiteSpace).toBe('nowrap');
        expect(label.style.flexShrink).toBe('0');
    });

    it('carries the sale: business, items at their price, one discount for the sale, total in BDT, thanks and Powered by', () => {
        const text = drawReceipt(document, content(), '58').textContent ?? '';
        for (const part of ['A boutique', '2610040001', 'Floral print kurti x2', '2,900.00', 'Discount', '-100.00', '2,800.00 BDT', 'Cash', 'Thank you!', 'Powered by StockFlow']) expect(text).toContain(part);
        expect(text).not.toContain('each');
    });
});
