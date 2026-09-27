import { HttpBackend, HttpErrorResponse, HttpEventType, HttpXhrBackend, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { PhotoUpload } from '@app/core/models/product.model';
import { ProductService } from './product.service';

const SIGNED = { cloud_name: 'stockflow', api_key: 'key', folder: 'stockflow/products', timestamp: 1790000000, signature: 'abc' };
const UPLOAD = 'https://api.cloudinary.com/v1_1/stockflow/image/upload';

const settle = () => new Promise((resolve) => setTimeout(resolve));

describe('ProductService', () => {
    let service: ProductService;
    let http: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), { provide: HttpXhrBackend, useExisting: HttpBackend }] });
        service = TestBed.inject(ProductService);
        http = TestBed.inject(HttpTestingController);
        // Canvas work is the browser's; what matters here is what happens to the bytes after it.
        vi.spyOn(service as unknown as { shrink: (file: File) => Promise<Blob> }, 'shrink').mockResolvedValue(new Blob(['photo']));
    });

    afterEach(() => http.verify());

    it('reports real upload progress, then the saved photo address', async () => {
        const seen: PhotoUpload[] = [];
        service.uploadPhoto(new File(['photo'], 'kurti.jpg', { type: 'image/jpeg' })).subscribe((event) => seen.push(event));

        http.expectOne((r) => r.url.endsWith(APIEndpoint.SIGN_PRODUCT_PHOTO_UPLOAD)).flush({ code: 200, message: 'OK', data: SIGNED });
        await settle();

        const upload = http.expectOne(UPLOAD);
        const form = upload.request.body as FormData;
        expect(form.get('signature')).toBe('abc');
        expect(form.get('folder')).toBe('stockflow/products');
        expect(upload.request.reportProgress).toBe(true);

        upload.event({ type: HttpEventType.UploadProgress, loaded: 7, total: 100 });
        upload.event({ type: HttpEventType.UploadProgress, loaded: 100, total: 100 });
        upload.flush({ secure_url: 'https://res.cloudinary.com/stockflow/image/upload/v1/stockflow/products/kurti.jpg' });

        expect(seen).toEqual([
            { state: 'uploading', progress: 0 },
            { state: 'uploading', progress: 7 },
            // Held short of 100 until Cloudinary has answered.
            { state: 'uploading', progress: 99 },
            { state: 'done', url: 'https://res.cloudinary.com/stockflow/image/upload/v1/stockflow/products/kurti.jpg' },
        ]);
    });

    it('never sends the photo when the server will not sign it', async () => {
        let failed: unknown;
        service.uploadPhoto(new File(['photo'], 'kurti.jpg', { type: 'image/jpeg' })).subscribe({ error: (error) => (failed = error) });

        http.expectOne((r) => r.url.endsWith(APIEndpoint.SIGN_PRODUCT_PHOTO_UPLOAD)).flush({ code: 503 }, { status: 503, statusText: 'Unavailable' });
        await settle();

        http.expectNone(UPLOAD);
        expect((failed as HttpErrorResponse).status).toBe(503);
    });

    it('names the field a refusal was about, and nothing for any other failure', () => {
        const refusal = (status: number, data: object) => new HttpErrorResponse({ status, error: { data } });

        expect(service.conflictOf(refusal(409, { field: 'sku' }))).toBe('sku');
        expect(service.conflictOf(refusal(400, { field: 'sub_category_oid' }))).toBe('sub_category_oid');
        expect(service.conflictOf(refusal(500, { field: 'sku' }))).toBeNull();
    });

    it('says why a delete was refused and how many units are in the way', () => {
        expect(service.deleteBlockOf(new HttpErrorResponse({ status: 409, error: { data: { reason: 'in_stock', on_hand: 4 } } }))).toEqual({ reason: 'in_stock', count: 4 });
        expect(service.deleteBlockOf(new HttpErrorResponse({ status: 409, error: { data: { reason: 'held', held: 2 } } }))).toEqual({ reason: 'held', count: 2 });
        expect(service.deleteBlockOf(new HttpErrorResponse({ status: 500 }))).toBeNull();
    });
});
