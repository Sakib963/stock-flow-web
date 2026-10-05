import { InvoiceContent, drawInvoice } from './invoice';

const content = (over: Partial<InvoiceContent> = {}): InvoiceContent => ({
    business: 'A boutique',
    logoUrl: null,
    track: { url: 'https://tracker.example/abc', label: 'Scan to track your order' },
    contact: ['House 5, Road 2, Dhaka', '01711000000'],
    title: 'INVOICE',
    meta: [
        ['Invoice', '2610050001'],
        ['Date', '5 Oct 2026'],
    ],
    billedTo: { label: 'Billed to', lines: ['Person A', '01987654321'] },
    shipTo: { label: 'Ship to', lines: ['Person B', '01811000000', '5/5 Gaznabi Road, Mohammadpur, Dhaka'] },
    columns: { item: 'Item', quantity: 'Qty', price: 'Price', amount: 'Amount' },
    lines: [{ name: 'Floral print kurti', quantity: '2', price: '1,450.00', amount: '2,900.00' }],
    totals: [
        ['Subtotal', '2,900.00'],
        ['Discount', '-100.00'],
        ['Delivery charge', '60.00'],
        ['Total', '2,860.00'],
        ['To collect', '2,860.00 BDT'],
    ],
    notes: [['Payment', 'COD']],
    thanks: 'Thank you for your order!',
    poweredBy: 'Powered by StockFlow',
    ...over,
});

describe('drawInvoice', () => {
    it('carries the order: billed to the customer, shipped to the recipient, items at their price, one discount and what the courier collects', () => {
        const text = drawInvoice(document, content()).textContent ?? '';
        for (const part of ['A boutique', '2610050001', 'Person A', 'Person B', 'Gaznabi Road', 'Floral print kurti', '2,900.00', '-100.00', '2,860.00 BDT']) expect(text).toContain(part);
        expect(text).not.toContain('each');
    });

    it('prints the business logo and the tracker QR when it has them', () => {
        const invoice = drawInvoice(document, content({ logoUrl: 'https://cdn.example/logo.png' }), 'data:image/png;base64,AAAA');
        expect([...invoice.querySelectorAll('img')].map((img) => img.getAttribute('src'))).toEqual(['https://cdn.example/logo.png', 'data:image/png;base64,AAAA']);
        expect(invoice.textContent).toContain('Scan to track your order');
    });

    it('shows a name or an address as text, never as markup', () => {
        const invoice = drawInvoice(document, content({ shipTo: { label: 'Ship to', lines: ['<img src=x onerror=alert(1)>'] } }));
        expect(invoice.querySelector('img')).toBeNull();
    });
});
