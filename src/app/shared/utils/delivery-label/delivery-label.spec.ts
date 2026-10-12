import { LabelContent, drawLabel, labelContent, printLabels } from './delivery-label';

describe('labelContent', () => {
    const order = { invoice_no: '2610110042', created_on: '2026-10-11T10:00:00.000', units: 3, courier: 'OwnRider', consignment_no: null, recipient_name: 'নুসরাত', recipient_phone: '01711000222', address: 'House 9, Mohammadpur, Dhaka', to_collect: 2450, tracking_token: 'abc' };

    it('writes the label in English, with the address as the customer gave it', () => {
        const content = labelContent(order, { name: 'Glow Store', logoUrl: null, address: null, phone: '01711000111' }, 'https://track.example/');
        expect(content.order.lines).toEqual(['11 Oct 2026', '3 items', 'Own rider']);
        expect(content.to.name).toBe('নুসরাত');
        expect(content.collect).toEqual({ label: 'Collect on delivery', value: '2,450.00 BDT' });
        expect(content.track?.url).toBe('https://track.example/abc');
    });

    it('says nothing is to be collected on a paid order', () => {
        expect(labelContent({ ...order, to_collect: 0 }, null, 'https://track.example').collect.value).toBe('Paid, collect nothing');
    });
});

const CONTENT: LabelContent = {
    business: 'Glow Store',
    logoUrl: null,
    contact: ['House 5, Road 2, Dhaka', '01711000111'],
    from: 'Shipped from',
    order: { label: 'Order', number: 'INV-2610-0042', lines: ['11 Oct 2026', '3 items'] },
    to: { label: 'Deliver to', name: '<b>Nusrat</b>', phone: '01711000222', address: 'House 9, Mohammadpur, Dhaka' },
    track: { url: 'https://track.example/abc', label: 'Scan to track' },
    collect: { label: 'Collect on delivery', value: '2,450.00 BDT' },
};

describe('drawLabel', () => {
    it('lays out sender, order, recipient with the QR, and what the courier collects', () => {
        const label = drawLabel(document, CONTENT, 'data:image/png;base64,AAAA');
        const rows = label.querySelectorAll('tr');
        expect(rows.length).toBe(3);
        expect(rows[0].textContent).toContain('Glow Store');
        expect(rows[0].textContent).toContain('INV-2610-0042');
        expect(rows[1].textContent).toContain('01711000222');
        expect(rows[1].querySelector('img')?.getAttribute('src')).toBe('data:image/png;base64,AAAA');
        expect(rows[2].textContent).toContain('2,450.00 BDT');
    });

    it('prints a typed name as text, never as markup', () => {
        const label = drawLabel(document, CONTENT);
        expect(label.querySelector('b')).toBeNull();
        expect(label.textContent).toContain('<b>Nusrat</b>');
    });

    it('leaves the QR out when the order has no tracking link', () => {
        const label = drawLabel(document, { ...CONTENT, track: null }, 'data:image/png;base64,AAAA');
        expect(label.querySelectorAll('img').length).toBe(0);
    });
});

describe('printLabels', () => {
    it('prints a batch only once every label has its QR decoded', async () => {
        const decoded: (() => void)[] = [];
        const print = vi.fn<() => void>();
        // jsdom neither decodes images nor loads fonts; a browser's print frame waits on both.
        const frames = new MutationObserver(() => {
            const frame = document.querySelector('iframe');
            if (!frame?.contentWindow) return;
            frame.contentWindow.print = print;
            (frame.contentWindow as unknown as typeof window).HTMLImageElement.prototype.decode = () => new Promise<void>((resolve) => decoded.push(resolve));
            Object.defineProperty(frame.contentDocument!, 'fonts', { value: { ready: Promise.resolve() }, configurable: true });
        });
        frames.observe(document.body, { childList: true });
        printLabels([CONTENT, { ...CONTENT, to: { ...CONTENT.to, name: 'Rafi' } }]);
        await vi.waitFor(() => expect(decoded.length).toBe(2), { timeout: 5000 });
        const frame = document.querySelector('iframe')!;
        expect(frame.contentDocument!.querySelectorAll('[data-label] img').length).toBe(2);
        expect(print).not.toHaveBeenCalled();
        decoded.forEach((done) => done());
        await vi.waitFor(() => expect(print).toHaveBeenCalledTimes(1));
        frames.disconnect();
        frame.remove();
    });
});
