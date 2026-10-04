import { StickerContent } from '@app/core/models/stock-overview.model';
import { QUIET_ZONE, code128Modules, code128Widths } from '@app/modules/inventory/stock-overview/utils/code128/code128';
import { styled } from '@app/shared/utils/styled/styled';

/**
 * A 50 x 25 mm thermal sticker (decided by the user, 2026-09-30). A module of 0.25 mm is 2 dots on a
 * 203 dpi printer and 3 on a 300 dpi one, so every bar lands on whole dots and prints sharp. The
 * batch code with its quiet zones is 176 modules, 44 mm, which leaves 3 mm each side.
 */
export const STICKER = { width: 50, height: 25, module: 0.25, barHeight: 8 } as const;

const SVG = 'http://www.w3.org/2000/svg';

const line = (doc: Document, text: string, style: Record<string, string>): HTMLElement => {
    const element = styled(doc.createElement('div'), { 'text-align': 'center', overflow: 'hidden', ...style });
    element.textContent = text;
    return element;
};

/** The barcode as vector bars sized in millimetres, one viewBox unit a module. */
const barcode = (doc: Document, code: string): SVGSVGElement => {
    const modules = code128Modules(code);
    const svg = doc.createElementNS(SVG, 'svg');
    svg.setAttribute('viewBox', `0 0 ${modules} 1`);
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.setAttribute('shape-rendering', 'crispEdges');
    svg.setAttribute('width', `${modules * STICKER.module}mm`);
    svg.setAttribute('height', `${STICKER.barHeight}mm`);
    svg.style.setProperty('display', 'block');
    svg.style.setProperty('flex-shrink', '0');
    svg.style.setProperty('margin-top', '0.6mm');
    let at = QUIET_ZONE;
    code128Widths(code).forEach((width, index) => {
        if (index % 2 === 0) {
            const bar = doc.createElementNS(SVG, 'rect');
            bar.setAttribute('x', String(at));
            bar.setAttribute('y', '0');
            bar.setAttribute('width', String(width));
            bar.setAttribute('height', '1');
            bar.setAttribute('fill', 'black');
            svg.appendChild(bar);
        }
        at += width;
    });
    return svg;
};

/**
 * One sticker, built with DOM methods and inline styles so the preview and the print draw exactly the
 * same thing, and a product name can never be read as markup. System fonts only: nothing is fetched
 * while printing.
 */
export const drawSticker = (doc: Document, content: StickerContent): HTMLElement => {
    const sticker = styled(doc.createElement('div'), {
        width: `${STICKER.width}mm`,
        height: `${STICKER.height}mm`,
        'box-sizing': 'border-box',
        padding: '1mm 3mm 0.8mm',
        display: 'flex',
        'flex-direction': 'column',
        'align-items': 'center',
        overflow: 'hidden',
        'font-family': 'Arial, Helvetica, sans-serif',
        color: 'black',
        background: 'white',
    });
    sticker.setAttribute('data-sticker', content.code);
    sticker.append(line(doc, content.business, { width: '100%', 'font-size': '6pt', 'font-weight': 'bold', 'line-height': '1.15', 'white-space': 'nowrap', 'text-overflow': 'ellipsis' }));
    sticker.append(line(doc, content.product, { width: '100%', 'font-size': '7pt', 'font-weight': 'bold', 'line-height': '1.15', 'max-height': '2.3em' }));
    sticker.append(barcode(doc, content.code));
    sticker.append(line(doc, content.code, { 'font-family': "'Courier New', monospace", 'font-size': '7pt', 'letter-spacing': '0.3pt', 'line-height': '1.2' }));
    const foot = styled(doc.createElement('div'), { width: '100%', display: 'flex', 'justify-content': content.price === null ? 'center' : 'space-between', 'align-items': 'baseline', 'margin-top': 'auto' });
    if (content.price !== null) foot.append(line(doc, `Tk ${content.price.toLocaleString('en-US')}`, { 'font-size': '8pt', 'font-weight': 'bold' }));
    if (content.expiry) foot.append(line(doc, `EXP ${content.expiry}`, { 'font-size': '6pt' }));
    sticker.append(foot);
    return sticker;
};

const PAGE_STYLE = `@page { size: ${STICKER.width}mm ${STICKER.height}mm; margin: 0; }
html, body { margin: 0; padding: 0; }
[data-sticker] { break-after: page; page-break-after: always; }
[data-sticker]:last-child { break-after: auto; page-break-after: auto; }`;

/**
 * Prints `count` copies through a hidden frame holding only the stickers: one sticker a page, the page
 * the sticker's exact size with no margin. The printer must still be set to the same size at 100%,
 * which the dialog says, because no web page can choose the printer's paper.
 */
export const printStickers = (content: StickerContent, count: number): void => {
    const frame = document.createElement('iframe');
    styled(frame, { position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: '0' });
    document.body.appendChild(frame);
    const doc = frame.contentDocument!;
    const style = doc.createElement('style');
    style.textContent = PAGE_STYLE;
    doc.head.appendChild(style);
    for (let i = 0; i < count; i++) doc.body.appendChild(drawSticker(doc, content));
    const done = () => frame.remove();
    frame.contentWindow!.addEventListener('afterprint', done);
    setTimeout(done, 120_000);
    frame.contentWindow!.focus();
    frame.contentWindow!.print();
};
