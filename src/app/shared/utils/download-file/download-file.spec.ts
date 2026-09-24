import { HttpHeaders, HttpResponse } from '@angular/common/http';
import { saveDownload } from './download-file';

const response = (filename: string | null): HttpResponse<Blob> =>
    new HttpResponse({
        body: new Blob(['sheet']),
        headers: new HttpHeaders(filename === null ? {} : { 'X-Filename': filename }),
    });

describe('saveDownload', () => {
    let clicked: { download: string; href: string } | null;
    let created: string[];
    let revoked: string[];

    beforeEach(() => {
        clicked = null;
        created = [];
        revoked = [];
        URL.createObjectURL = () => {
            const url = `blob:${created.length}`;
            created.push(url);
            return url;
        };
        URL.revokeObjectURL = (url: string) => void revoked.push(url);
        HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) {
            clicked = { download: this.download, href: this.href };
        };
    });

    // Assigned raw, a category called "Home Kitchen" reached the Downloads folder as
    // `Home%20Kitchen_products.xlsx`.
    it('saves the file under the name the server sent, decoded', () => {
        saveDownload(response('Home%20Kitchen_products.xlsx'), 'fallback.xlsx');

        expect(clicked?.download).toBe('Home Kitchen_products.xlsx');
    });

    it('keeps a name the server did not encode, rather than throwing on it', () => {
        saveDownload(response('100% cotton.xlsx'), 'fallback.xlsx');

        expect(clicked?.download).toBe('100% cotton.xlsx');
    });

    it('falls back to the name the caller chose when the server sent none', () => {
        saveDownload(response(null), 'fallback.xlsx');

        expect(clicked?.download).toBe('fallback.xlsx');
    });

    // Left behind, every export held its whole spreadsheet in memory until the tab was closed.
    it('lets go of the object URL once the click has happened', () => {
        saveDownload(response('a.xlsx'), 'fallback.xlsx');

        expect(revoked).toEqual(created);
    });
});
