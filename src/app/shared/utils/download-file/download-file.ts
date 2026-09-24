import { HttpResponse } from '@angular/common/http';

/**
 * Hands a downloaded file to the browser under the name the server gave it.
 *
 * The name travels in `X-Filename` because `Content-Disposition` is not readable from JavaScript.
 * It arrives percent-encoded, so it is decoded here: assigned raw, a category called "Home Kitchen"
 * reached the Downloads folder as `Home%20Kitchen_products.xlsx`.
 *
 * The object URL is revoked straight after the click. Left behind, every export held its whole
 * spreadsheet in memory until the tab was closed.
 */
export const saveDownload = (response: HttpResponse<Blob>, fallback: string): void => {
    const body = response.body;
    if (!body) return;

    const url = URL.createObjectURL(body);
    const link = document.createElement('a');
    link.href = url;
    link.download = filenameOf(response, fallback);
    link.click();
    URL.revokeObjectURL(url);
};

const filenameOf = (response: HttpResponse<Blob>, fallback: string): string => {
    const sent = response.headers.get('X-Filename');
    if (!sent) return fallback;
    try {
        return decodeURIComponent(sent);
    } catch {
        // A name the server did not encode, which decodeURIComponent throws on rather than passing
        // through. It is already readable, so it is used as it stands.
        return sent;
    }
};
