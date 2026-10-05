import QRCode from 'qrcode';
import { styled } from '@app/shared/utils/styled/styled';

/**
 * The A4 invoice of an online order (sales REQ-57, REQ-58): the business, the invoice number and
 * date, Billed to the customer and Ship to the recipient, one line per item at its price, then one
 * discount for the order, the delivery charge, the total, what was paid and what the courier
 * collects. A discount is the salesperson's business line by line; the customer sees one figure.
 */
export interface InvoiceContent {
    business: string;
    logoUrl: string | null;
    /** The public tracker page of this order, printed as a QR the customer scans. */
    track: { url: string; label: string } | null;
    /** Address and phone, each its own line. */
    contact: string[];
    title: string;
    /** Invoice number and date: label and value. */
    meta: [string, string][];
    billedTo: { label: string; lines: string[] };
    shipTo: { label: string; lines: string[] };
    columns: { item: string; quantity: string; price: string; amount: string };
    lines: { name: string; quantity: string; price: string; amount: string }[];
    /** Subtotal, discount, delivery, total, paid and to collect, as label and value. The last is the one the courier reads. */
    totals: [string, string][];
    notes: [string, string][];
    thanks: string;
    poweredBy: string;
}

const FONT = "Arial, 'Nirmala UI', 'Vrinda', Helvetica, sans-serif";

const text = (doc: Document, tag: string, value: string, style: Record<string, string> = {}): HTMLElement => {
    const element = styled(doc.createElement(tag), style);
    element.textContent = value;
    return element;
};

// The print frame is its own document with no stylesheet, so its few greys are literal values, not tokens.
const block = (doc: Document, heading: { label: string; lines: string[] }): HTMLElement => {
    const box = styled(doc.createElement('div'), { flex: '1', 'min-width': '0' });
    box.append(text(doc, 'div', heading.label, { 'font-size': '10px', 'font-weight': '700', 'text-transform': 'uppercase', 'letter-spacing': '0.06em', color: '#555', 'margin-bottom': '1.5mm' }));
    heading.lines.forEach((line, i) => box.append(text(doc, 'div', line, i === 0 ? { 'font-weight': '700' } : {})));
    return box;
};

const cell = (doc: Document, tag: 'th' | 'td', value: string, align: 'left' | 'right', style: Record<string, string> = {}): HTMLElement => text(doc, tag, value, { 'text-align': align, padding: '2mm 1.5mm', 'border-bottom': '1px solid #ddd', ...style });

/** Drawn with DOM methods and inline styles, so nothing a person typed (a name, an address) can be read as markup. */
export const drawInvoice = (doc: Document, content: InvoiceContent, qr: string | null = null): HTMLElement => {
    const page = styled(doc.createElement('div'), { width: '186mm', margin: '0 auto', 'font-family': FONT, 'font-size': '12px', 'line-height': '1.45', color: '#000', 'overflow-wrap': 'anywhere' });
    page.dataset['invoice'] = 'a4';

    const head = styled(doc.createElement('div'), { display: 'flex', 'justify-content': 'space-between', gap: '8mm', 'padding-bottom': '4mm', 'border-bottom': '2px solid #000' });
    const business = styled(doc.createElement('div'), { 'min-width': '0' });
    if (content.logoUrl) {
        const logo = styled(doc.createElement('img'), { 'max-height': '16mm', 'max-width': '50mm', 'margin-bottom': '2mm', display: 'block' }) as HTMLImageElement;
        logo.src = content.logoUrl;
        logo.alt = '';
        business.append(logo);
    }
    business.append(text(doc, 'div', content.business, { 'font-size': '20px', 'font-weight': '700' }));
    for (const line of content.contact) business.append(text(doc, 'div', line));
    const meta = styled(doc.createElement('div'), { 'text-align': 'right', 'flex-shrink': '0' });
    meta.append(text(doc, 'div', content.title, { 'font-size': '18px', 'font-weight': '700', 'letter-spacing': '0.08em' }));
    for (const [label, value] of content.meta) meta.append(text(doc, 'div', `${label}: ${value}`));
    if (qr && content.track) {
        const code = styled(doc.createElement('img'), { width: '22mm', height: '22mm', display: 'block', 'margin-left': 'auto', 'margin-top': '2mm' }) as HTMLImageElement;
        code.src = qr;
        code.alt = '';
        meta.append(code, text(doc, 'div', content.track.label, { 'font-size': '9px' }));
    }
    head.append(business, meta);

    const parties = styled(doc.createElement('div'), { display: 'flex', gap: '8mm', margin: '6mm 0' });
    parties.append(block(doc, content.billedTo), block(doc, content.shipTo));

    const table = styled(doc.createElement('table'), { width: '100%', 'border-collapse': 'collapse' });
    const header = doc.createElement('tr');
    const th = { 'font-size': '10px', 'text-transform': 'uppercase', 'letter-spacing': '0.06em', 'border-bottom': '2px solid #000' };
    header.append(cell(doc, 'th', '#', 'left', th), cell(doc, 'th', content.columns.item, 'left', th), cell(doc, 'th', content.columns.quantity, 'right', th), cell(doc, 'th', content.columns.price, 'right', th), cell(doc, 'th', content.columns.amount, 'right', th));
    table.append(header);
    content.lines.forEach((line, i) => {
        const row = doc.createElement('tr');
        row.append(cell(doc, 'td', String(i + 1), 'left'), cell(doc, 'td', line.name, 'left'), cell(doc, 'td', line.quantity, 'right'), cell(doc, 'td', line.price, 'right'), cell(doc, 'td', line.amount, 'right', { 'white-space': 'nowrap' }));
        table.append(row);
    });

    const totals = styled(doc.createElement('div'), { 'margin-left': 'auto', width: '80mm', 'margin-top': '4mm' });
    content.totals.forEach(([label, value], i) => {
        const last = i === content.totals.length - 1;
        const row = styled(doc.createElement('div'), { display: 'flex', 'justify-content': 'space-between', gap: '4mm', padding: '1mm 0', ...(last ? { 'border-top': '2px solid #000', 'margin-top': '1mm', 'padding-top': '2mm', 'font-size': '15px', 'font-weight': '700' } : {}) });
        row.append(text(doc, 'span', label), text(doc, 'span', value, { 'white-space': 'nowrap' }));
        totals.append(row);
    });

    page.append(head, parties, table, totals);
    if (content.notes.length) {
        const notes = styled(doc.createElement('div'), { 'margin-top': '6mm' });
        for (const [label, value] of content.notes) notes.append(text(doc, 'div', `${label}: ${value}`));
        page.append(notes);
    }
    page.append(text(doc, 'div', content.thanks, { 'text-align': 'center', 'margin-top': '10mm', 'font-weight': '700' }), text(doc, 'div', content.poweredBy, { 'text-align': 'center', color: '#555', 'font-size': '10px' }));
    return page;
};

/** Prints on A4 through a hidden frame holding only the invoice. */
export const printInvoice = (content: InvoiceContent): void => {
    const frame = styled(document.createElement('iframe'), { position: 'fixed', right: '0', bottom: '0', width: '210mm', height: '0', border: '0', visibility: 'hidden' });
    document.body.appendChild(frame);
    const doc = frame.contentDocument!;
    const page = doc.createElement('style');
    page.textContent = '@page { size: A4; margin: 12mm; } html, body { margin: 0; padding: 0; }';
    doc.head.appendChild(page);
    styled(doc.body, { margin: '0', background: '#fff', '-webkit-print-color-adjust': 'exact', 'print-color-adjust': 'exact' });
    const done = () => frame.remove();
    const qr = content.track ? QRCode.toDataURL(content.track.url, { margin: 0, width: 240 }).catch(() => null) : Promise.resolve(null);
    void qr.then(async (code) => {
        doc.body.appendChild(drawInvoice(doc, content, code));
        // The logo and the QR must be on the page before it prints; one that cannot load prints without it.
        await Promise.all([...doc.images].map((image) => (image.complete ? null : new Promise((ready) => ((image.onload = ready), (image.onerror = ready))))));
        await doc.fonts.ready;
        frame.contentWindow!.addEventListener('afterprint', done);
        setTimeout(done, 120_000);
        frame.contentWindow!.focus();
        frame.contentWindow!.print();
    });
};
