import { drawSticker, STICKER } from './sticker';

const CONTENT = { business: 'StockFlow', product: 'Radiance Glow Serum <b>30ml</b>', code: 'B-7KQ4-M2XH', price: 1200, expiry: '31/03/2027' };

describe('a barcode sticker', () => {
    it('is exactly 50 x 25 mm, with the barcode 44 mm wide so every bar is 0.25 mm', () => {
        const sticker = drawSticker(document, CONTENT);
        expect([sticker.style.width, sticker.style.height]).toEqual([`${STICKER.width}mm`, `${STICKER.height}mm`]);
        expect(sticker.querySelector('svg')?.getAttribute('width')).toBe('44mm');
        expect(sticker.querySelector('svg')?.getAttribute('viewBox')).toBe('0 0 176 1');
    });

    it('carries the business, the product, the code, the price and the expiry', () => {
        const text = drawSticker(document, CONTENT).textContent;
        for (const part of ['StockFlow', 'Radiance Glow Serum', 'B-7KQ4-M2XH', 'Tk 1,200', 'EXP 31/03/2027']) expect(text).toContain(part);
    });

    it('prints a product name as text, never as markup', () => {
        const sticker = drawSticker(document, CONTENT);
        expect(sticker.querySelector('b')).toBeNull();
        expect(sticker.textContent).toContain('<b>30ml</b>');
    });

    it('leaves the price off a batch that has none', () => {
        const text = drawSticker(document, { ...CONTENT, price: null, expiry: null }).textContent;
        expect(text).not.toContain('Tk');
        expect(text).not.toContain('EXP');
    });
});
