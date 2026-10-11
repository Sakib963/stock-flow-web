import QRCode from 'qrcode';
import { printPage } from '@app/shared/utils/print-page/print-page';
import { styled } from '@app/shared/utils/styled/styled';

/**
 * The parcel's own label, courier-agnostic: who sends it, the order, who receives it with a QR to the
 * public tracker, and what the courier collects. A courier's own label, with its consignment and
 * routing codes, is printed by the courier and cannot be made here.
 *
 * It is always English, as the courier's file is: riders and hubs read English. Only what the
 * customer typed (the name, the address) prints as it was written (the user, 2026-10-11).
 */
export interface LabelContent {
    business: string;
    logoUrl: string | null;
    /** Address and phone, each its own line. */
    contact: string[];
    from: string;
    order: { label: string; number: string; lines: string[] };
    to: { label: string; name: string; phone: string; address: string };
    track: { url: string; label: string } | null;
    /** What the courier collects, or that nothing is to be collected. */
    collect: { label: string; value: string };
}

const FONT = "Arial, 'Nirmala UI', 'Vrinda', Helvetica, sans-serif";
// The print frame has no stylesheet, so its few greys are literal values, not tokens.
const LINE = '1.5px solid #000';

const text = (doc: Document, tag: string, value: string, style: Record<string, string> = {}): HTMLElement => {
    const element = styled(doc.createElement(tag), style);
    element.textContent = value;
    return element;
};

const key = (doc: Document, value: string): HTMLElement => text(doc, 'div', value, { 'font-size': '9px', 'letter-spacing': '0.09em', 'text-transform': 'uppercase', color: '#555', 'font-weight': '700' });

const cell = (doc: Document, style: Record<string, string> = {}): HTMLTableCellElement => styled(doc.createElement('td'), { border: LINE, padding: '3mm 3.5mm', 'vertical-align': 'top', ...style }) as HTMLTableCellElement;

/**
 * A table with collapsed borders, so every junction is one clean line (the old label's flex boxes
 * doubled some lines and dropped others). Drawn with DOM methods, so nothing typed can be read as markup.
 */
export const drawLabel = (doc: Document, content: LabelContent, qr: string | null = null): HTMLElement => {
    const table = styled(doc.createElement('table'), { width: '100%', 'border-collapse': 'collapse', 'table-layout': 'fixed', border: LINE, 'font-family': FONT, 'font-size': '12px', color: '#000', 'overflow-wrap': 'anywhere' });
    table.dataset['label'] = 'delivery';

    const head = doc.createElement('tr');
    const from = cell(doc);
    from.append(key(doc, content.from));
    const sender = styled(doc.createElement('div'), { display: 'flex', gap: '3mm', 'align-items': 'center', 'margin-top': '1mm' });
    if (content.logoUrl) {
        const logo = styled(doc.createElement('img'), { 'max-height': '11mm', 'max-width': '28mm', 'object-fit': 'contain' }) as HTMLImageElement;
        logo.src = content.logoUrl;
        logo.alt = '';
        sender.append(logo);
    }
    const who = doc.createElement('div');
    who.append(text(doc, 'div', content.business, { 'font-weight': '700', 'font-size': '13px' }));
    for (const line of content.contact) who.append(text(doc, 'div', line, { 'font-size': '11px', color: '#333' }));
    sender.append(who);
    from.append(sender);
    const order = cell(doc, { width: '38%' });
    order.append(key(doc, content.order.label), text(doc, 'div', content.order.number, { 'font-weight': '800', 'font-size': '17px', 'margin-top': '0.5mm' }));
    for (const line of content.order.lines) order.append(text(doc, 'div', line, { 'font-size': '11px', color: '#333' }));
    head.append(from, order);

    const body = doc.createElement('tr');
    const to = cell(doc);
    to.append(key(doc, content.to.label), text(doc, 'div', content.to.name, { 'font-weight': '800', 'font-size': '21px', 'line-height': '1.15', margin: '1.5mm 0 1mm' }), text(doc, 'div', content.to.phone, { 'font-size': '14px', 'font-weight': '700' }), text(doc, 'div', content.to.address, { 'font-size': '13px', 'line-height': '1.5', 'margin-top': '1mm' }));
    const code = cell(doc, { width: '38%', 'text-align': 'center', 'vertical-align': 'middle' });
    if (qr && content.track) {
        const image = styled(doc.createElement('img'), { width: '30mm', height: '30mm', display: 'block', margin: '0 auto' }) as HTMLImageElement;
        image.src = qr;
        image.alt = '';
        code.append(image, text(doc, 'div', content.track.label, { 'font-size': '9px', color: '#555', 'margin-top': '1.5mm', 'text-transform': 'uppercase', 'letter-spacing': '0.06em' }));
    }
    body.append(to, code);

    const foot = doc.createElement('tr');
    const collect = cell(doc);
    collect.colSpan = 2;
    const strip = styled(doc.createElement('div'), { display: 'flex', 'align-items': 'center', 'justify-content': 'space-between', gap: '4mm' });
    strip.append(text(doc, 'div', content.collect.label, { 'font-size': '11px', 'text-transform': 'uppercase', 'letter-spacing': '0.08em', 'font-weight': '700' }), text(doc, 'div', content.collect.value, { 'font-weight': '800', 'font-size': '24px', 'white-space': 'nowrap' }));
    collect.append(strip);
    foot.append(collect);

    table.append(head, body, foot);
    return table;
};

/** A label is for a parcel still on its way out: confirmed, and not delivered, failed or back in the shop. */
export const isLabelable = (status: string, delivery_status: string | null): boolean => status === 'Confirmed' && delivery_status !== 'Delivered' && delivery_status !== 'Failed' && delivery_status !== 'BackInShop';

/** One parcel, as the order record and a delivery batch both know it. */
export interface LabelOrder {
    invoice_no: string;
    created_on: string;
    units: number;
    courier: string | null;
    consignment_no: string | null;
    recipient_name: string | null;
    recipient_phone: string | null;
    /** The address line, area, thana, district and post code, in English names. */
    address: string;
    to_collect: number;
    tracking_token: string | null;
}

export interface LabelSender {
    name: string;
    logoUrl: string | null;
    address: string | null;
    phone: string | null;
}

const COURIER_NAMES: Record<string, string> = { OwnRider: 'Own rider' };
const money = (amount: number): string => `${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} BDT`;
const day = (value: string): string => new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

export const labelContent = (order: LabelOrder, sender: LabelSender | null, trackerUrl: string): LabelContent => ({
    business: sender?.name ?? '',
    logoUrl: sender?.logoUrl ?? null,
    contact: [sender?.address, sender?.phone].filter((line): line is string => !!line),
    from: 'Shipped from',
    order: {
        label: 'Order',
        number: order.invoice_no,
        lines: [day(order.created_on), `${order.units} ${order.units === 1 ? 'item' : 'items'}`, order.courier ? [COURIER_NAMES[order.courier] ?? order.courier, order.consignment_no].filter(Boolean).join(' · ') : ''].filter(Boolean),
    },
    to: { label: 'Deliver to', name: order.recipient_name ?? '', phone: order.recipient_phone ?? '', address: order.address },
    track: order.tracking_token ? { url: `${trackerUrl.replace(/\/+$/, '')}/${order.tracking_token}`, label: 'Scan to track' } : null,
    collect: order.to_collect > 0 ? { label: 'Collect on delivery', value: money(order.to_collect) } : { label: 'Payment', value: 'Paid, collect nothing' },
});

/** Prints across the top of an A4 sheet, the width the old label had. */
export const printLabel = (content: LabelContent): void => printLabels([content]);

/** Several parcels, each label on a page of its own so it can be cut and stuck on its box. */
export const printLabels = (contents: LabelContent[]): void => {
    if (!contents.length) return;
    void Promise.all(contents.map((content) => (content.track ? QRCode.toDataURL(content.track.url, { margin: 0, width: 240 }).catch(() => null) : Promise.resolve(null)))).then((codes) =>
        printPage('@page { size: A4; margin: 8mm; }', null, (doc) => {
            const sheet = doc.createElement('div');
            contents.forEach((content, i) => {
                const page = styled(doc.createElement('div'), i < contents.length - 1 ? { 'break-after': 'page' } : {});
                page.append(drawLabel(doc, content, codes[i]));
                sheet.append(page);
            });
            return sheet;
        })
    );
};
