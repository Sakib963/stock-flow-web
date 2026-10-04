import { styled } from '@app/shared/utils/styled/styled';

/**
 * The counter receipt, for a thermal roll printer.
 *
 * The old receipt printed faint, about three quarters legible. It was set in the browser's monospace
 * font, which on Windows is Courier New: hairline strokes thinner than one dot of a 203 dpi head, so
 * parts of each letter never printed. It was also 58 mm wide plus 5 mm of padding each side, so the
 * driver shrank the whole page to fit the roll and every stroke got thinner still. Here the type is
 * a heavy system font in pure black at 12px or more, nothing is grey, the content is exactly the
 * printable width so nothing is scaled, and the page is as long as the receipt so no blank roll feeds.
 */
export const RECEIPT_PAPERS = ['58', '80'] as const;
export type ReceiptPaper = (typeof RECEIPT_PAPERS)[number];

/** The roll's width and the printable width inside it, in mm. A 58 mm head prints 48 mm, an 80 mm head 72 mm. */
const PAPER: Record<ReceiptPaper, { roll: number; print: number; size: number }> = {
    '58': { roll: 58, print: 48, size: 12 },
    '80': { roll: 80, print: 72, size: 13 },
};

export interface ReceiptLine {
    name: string;
    /** "2 x 1,450.00", and the discount per unit when there is one. */
    detail: string;
    total: string;
}

export interface ReceiptContent {
    business: string;
    /** Address and phone, each its own line. */
    contact: string[];
    /** Invoice, date, cashier, customer: label and value. */
    meta: [string, string][];
    lines: ReceiptLine[];
    /** Subtotal, discount, then the total, which is drawn larger. */
    totals: [string, string][];
    total: [string, string];
    /** How it was paid: method, paid, still due, cash received, change. */
    payment: [string, string][];
    footer: string;
}

const FONT = "Arial, 'Nirmala UI', 'Vrinda', Helvetica, sans-serif";

const text = (doc: Document, value: string, style: Record<string, string> = {}): HTMLElement => {
    const element = styled(doc.createElement('div'), style);
    element.textContent = value;
    return element;
};

/**
 * A label and its value on one line. An amount never wraps and its label does; a heading such as
 * Customer stays whole and a long name under it wraps, or the label is squeezed one letter a line.
 */
const pair = (doc: Document, label: string, value: string, style: Record<string, string> = {}, keep: 'value' | 'label' = 'value'): HTMLElement => {
    const row = styled(doc.createElement('div'), { display: 'flex', 'justify-content': 'space-between', gap: '2mm', ...style });
    const whole = { 'flex-shrink': '0', 'white-space': 'nowrap' };
    row.append(text(doc, label, keep === 'label' ? whole : { 'min-width': '0' }), text(doc, value, { 'text-align': 'right', ...(keep === 'value' ? whole : { 'min-width': '0' }) }));
    return row;
};

const rule = (doc: Document): HTMLElement => styled(doc.createElement('div'), { 'border-top': '1px dashed #000', margin: '1.5mm 0' });

/**
 * The receipt, built with DOM methods and inline styles so the preview and the print are the same
 * thing and nothing a person typed (a product or customer name) can ever be read as markup.
 */
export const drawReceipt = (doc: Document, content: ReceiptContent, paper: ReceiptPaper): HTMLElement => {
    const { print, size } = PAPER[paper];
    const receipt = styled(doc.createElement('div'), {
        width: `${print}mm`,
        margin: '0 auto',
        padding: '2mm 0 4mm',
        'box-sizing': 'border-box',
        'font-family': FONT,
        'font-size': `${size}px`,
        'font-weight': '700',
        'line-height': '1.3',
        color: '#000',
        'overflow-wrap': 'anywhere',
    });
    receipt.dataset['receipt'] = paper;

    receipt.append(text(doc, content.business, { 'text-align': 'center', 'font-size': `${size + 4}px`, 'line-height': '1.2' }));
    for (const line of content.contact) receipt.append(text(doc, line, { 'text-align': 'center' }));
    receipt.append(rule(doc));
    for (const [label, value] of content.meta) receipt.append(pair(doc, label, value, {}, 'label'));
    receipt.append(rule(doc));

    for (const line of content.lines) {
        receipt.append(text(doc, line.name, { 'margin-top': '1mm' }));
        receipt.append(pair(doc, line.detail, line.total));
    }

    receipt.append(rule(doc));
    for (const [label, value] of content.totals) receipt.append(pair(doc, label, value));
    receipt.append(pair(doc, content.total[0], content.total[1], { 'font-size': `${size + 4}px`, 'margin-top': '1mm' }));
    receipt.append(rule(doc));
    for (const [label, value] of content.payment) receipt.append(pair(doc, label, value));
    if (content.footer) {
        receipt.append(rule(doc));
        for (const line of content.footer.split('\n')) receipt.append(text(doc, line, { 'text-align': 'center' }));
    }
    return receipt;
};

/**
 * Prints through a hidden frame holding only the receipt. The page is the roll's width and exactly the
 * receipt's height, measured once it is laid out, so Chrome prints one page with no scaling and no
 * blank length. The printer must still be set to its roll at 100% scale with no margins.
 */
export const printReceipt = (content: ReceiptContent, paper: ReceiptPaper): void => {
    const frame = styled(document.createElement('iframe'), { position: 'fixed', right: '0', bottom: '0', width: `${PAPER[paper].roll}mm`, height: '0', border: '0', visibility: 'hidden' });
    document.body.appendChild(frame);
    const doc = frame.contentDocument!;
    const page = doc.createElement('style');
    doc.head.appendChild(page);
    styled(doc.body, { margin: '0', padding: '0', background: '#fff', '-webkit-print-color-adjust': 'exact', 'print-color-adjust': 'exact' });
    const receipt = drawReceipt(doc, content, paper);
    doc.body.appendChild(receipt);

    const done = () => frame.remove();
    void doc.fonts.ready.then(() => {
        const height = Math.ceil((receipt.getBoundingClientRect().height * 25.4) / 96) + 2;
        page.textContent = `@page { size: ${PAPER[paper].roll}mm ${height}mm; margin: 0; } html, body { margin: 0; padding: 0; }`;
        frame.contentWindow!.addEventListener('afterprint', done);
        setTimeout(done, 120_000);
        frame.contentWindow!.focus();
        frame.contentWindow!.print();
    });
};
