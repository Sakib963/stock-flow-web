import { BitArray, Code128Reader } from '@zxing/library';
import { QUIET_ZONE, code128Modules, code128Widths } from './code128';

/** Lays the bars out as printer dots, the way a sticker printer burns them, and reads them back. */
const scan = (text: string, dotsPerModule: number, damage?: (widths: number[]) => void): string => {
    const widths = code128Widths(text);
    damage?.(widths);
    const modules = code128Modules(text);
    const row = new BitArray(modules * dotsPerModule);
    let at = QUIET_ZONE * dotsPerModule;
    widths.forEach((width, index) => {
        const dots = width * dotsPerModule;
        if (index % 2 === 0) row.setRange(at, at + dots);
        at += dots;
    });
    return new Code128Reader().decodeRow(0, row, new Map()).getText();
};

describe('Code 128', () => {
    const codes = ['B-7KQ4-M2XH', 'B-JZHD-GAQ1', 'B-0000-0000', 'B-ZZZZ-ZZZZ', 'HHV-IJ9-OIA9F'];

    it('reads back every batch code on a 203 dpi printer (2 dots a module)', () => {
        for (const code of codes) expect(scan(code, 2)).toBe(code);
    });

    it('reads back every batch code on a 300 dpi printer (3 dots a module)', () => {
        for (const code of codes) expect(scan(code, 3)).toBe(code);
    });

    it('is a real check: a sticker with one bar printed too thick does not read', () => {
        expect(() => scan('B-7KQ4-M2XH', 2, (widths) => (widths[20] += 2))).toThrow();
    });

    it('fits a batch code on a 50 mm sticker at 0.25 mm a module, quiet zones included', () => {
        expect(code128Modules('B-7KQ4-M2XH')).toBe(176);
        expect(code128Modules('B-7KQ4-M2XH') * 0.25).toBeLessThanOrEqual(46);
    });

    it('draws every symbol eleven modules wide and ends on the thirteen module stop', () => {
        const widths = code128Widths('B-7KQ4-M2XH');
        expect(widths.length).toBe(6 * 13 + 7);
        expect(widths.reduce((sum, width) => sum + width, 0)).toBe(11 * 13 + 13);
    });

    it('refuses a character the barcode cannot carry, rather than print one nobody can scan', () => {
        expect(() => code128Widths('বাংলা')).toThrow();
        expect(() => code128Widths('')).toThrow();
    });
});
