import QRCode from 'qrcode';
import { styled } from '@app/shared/utils/styled/styled';

/**
 * Prints one document through a hidden frame holding only it: the invoice, the delivery label. `qrUrl`
 * is drawn as a QR first and handed to `draw`; a QR that cannot be made prints without it.
 */
export const printPage = (pageCss: string, qrUrl: string | null, draw: (doc: Document, qr: string | null) => HTMLElement): void => {
    const frame = styled(document.createElement('iframe'), { position: 'fixed', right: '0', bottom: '0', width: '210mm', height: '0', border: '0', visibility: 'hidden' });
    document.body.appendChild(frame);
    const doc = frame.contentDocument!;
    const page = doc.createElement('style');
    page.textContent = `${pageCss} html, body { margin: 0; padding: 0; }`;
    doc.head.appendChild(page);
    styled(doc.body, { margin: '0', background: '#fff', '-webkit-print-color-adjust': 'exact', 'print-color-adjust': 'exact' });
    const done = () => frame.remove();
    const qr = qrUrl ? QRCode.toDataURL(qrUrl, { margin: 0, width: 240 }).catch(() => null) : Promise.resolve(null);
    void qr.then(async (code) => {
        doc.body.appendChild(draw(doc, code));
        // The logo and the QR must be on the page before it prints; one that cannot load prints without it.
        await Promise.all([...doc.images].map((image) => (image.complete ? null : new Promise((ready) => ((image.onload = ready), (image.onerror = ready))))));
        await doc.fonts.ready;
        frame.contentWindow!.addEventListener('afterprint', done);
        setTimeout(done, 120_000);
        frame.contentWindow!.focus();
        frame.contentWindow!.print();
    });
};
