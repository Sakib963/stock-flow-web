import { printPage } from './print-page';

// jsdom has no font loading, which a browser's print frame waits on.
describe('printPage', () => {
    it('prints only once every image on the page has decoded, the QR included', async () => {
        let decoded!: () => void;
        let print!: ReturnType<typeof vi.fn<() => void>>;
        printPage('', 'https://track.example/abc', (doc, qr) => {
            print = vi.fn<() => void>();
            doc.defaultView!.print = print;
            Object.defineProperty(doc, 'fonts', { value: { ready: Promise.resolve() } });
            const image = doc.createElement('img');
            image.src = qr!;
            image.decode = () => new Promise<void>((resolve) => (decoded = resolve));
            return image;
        });
        await vi.waitFor(() => expect(decoded).toBeDefined());
        await new Promise((resolve) => setTimeout(resolve, 20));
        expect(print).not.toHaveBeenCalled();
        decoded();
        await vi.waitFor(() => expect(print).toHaveBeenCalledTimes(1));
    });

    it('still prints when an image cannot be decoded', async () => {
        let print!: ReturnType<typeof vi.fn<() => void>>;
        printPage('', null, (doc) => {
            print = vi.fn<() => void>();
            doc.defaultView!.print = print;
            Object.defineProperty(doc, 'fonts', { value: { ready: Promise.resolve() } });
            const image = doc.createElement('img');
            image.decode = () => Promise.reject(new Error('broken'));
            return image;
        });
        await vi.waitFor(() => expect(print).toHaveBeenCalledTimes(1));
    });
});
