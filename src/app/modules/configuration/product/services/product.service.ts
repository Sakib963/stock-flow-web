import { HttpClient, HttpErrorResponse, HttpEventType, HttpXhrBackend } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { PhotoUpload, PhotoUploadSignature, ProductDetails, ProductField, ProductPayload, SubCategoryChoice } from '@app/core/models/product.model';
import { StockMovementRow } from '@app/core/models/stock-movement.model';
import { environment } from '@env/environment';
import { Observable, filter, finalize, from, map, switchMap } from 'rxjs';

/** A phone photo is 4000px across; 1600 is sharper than any screen here shows a product, and a tenth of the upload. */
const LONGEST_EDGE = 1600;
const JPEG_QUALITY = 0.82;

@Injectable({ providedIn: 'root' })
export class ProductService {
    private readonly _http = inject(HttpClient);
    // The app's client runs on fetch, which reports no upload progress at all: the bar sat at 0% until
    // the photo was done. The upload alone goes through XHR, which does. It also skips the app's
    // interceptors, which have nothing to add to a request for Cloudinary.
    private readonly _xhr = new HttpClient(inject(HttpXhrBackend));

    readonly saving = signal(false);

    /** Never cached: the record carries the product's stock by batch, which moves with every sale. */
    details(oid: string): Observable<ProductDetails> {
        return this._http.get<{ data: ProductDetails }>(`${environment.baseUrl}${APIEndpoint.GET_PRODUCT_DETAILS}/${oid}`).pipe(map((response) => response.data));
    }

    /** The product's latest stock movements, newest first. Never cached, for the same reason as details. */
    movements(oid: string, limit = 10): Observable<StockMovementRow[]> {
        return this._http.get<{ data: { rows: StockMovementRow[] } }>(`${environment.baseUrl}${APIEndpoint.GET_STOCK_MOVEMENT_LIST}`, { params: { product_oid: oid, limit } }).pipe(map((response) => response.data.rows));
    }

    create(payload: ProductPayload): Observable<string> {
        this.saving.set(true);
        return this._http.post<{ data: { oid: string } }>(`${environment.baseUrl}${APIEndpoint.CREATE_PRODUCT}`, payload).pipe(
            map((response) => response.data.oid),
            finalize(() => this.saving.set(false))
        );
    }

    /** Whether anything changed: the server writes nothing when the record already says this. */
    update(payload: ProductPayload): Observable<boolean> {
        this.saving.set(true);
        return this._http.post<{ data?: { changed?: boolean } }>(`${environment.baseUrl}${APIEndpoint.UPDATE_PRODUCT_DETAILS}`, payload).pipe(
            map((response) => response?.data?.changed !== false),
            finalize(() => this.saving.set(false))
        );
    }

    /** Active sub-categories under Active categories, each with its category's name for grouping the picker. */
    subCategories(): Observable<SubCategoryChoice[]> {
        return this._http.get<{ data: SubCategoryChoice[] }>(`${environment.baseUrl}${APIEndpoint.GET_SUB_CATEGORY_LIST_FOR_DROPDOWN}`).pipe(map((response) => response.data));
    }

    remove(oid: string): Observable<void> {
        return this._http.post<void>(`${environment.baseUrl}${APIEndpoint.DELETE_PRODUCT}`, { oid });
    }

    /** Is this SKU free? A courtesy to the person typing: the database refuses a duplicate whatever this said. */
    isAvailable(value: string, oid?: string): Observable<boolean> {
        const params = { value, ...(oid ? { oid } : {}) };
        return this._http.get<{ data: { available: boolean } }>(`${environment.baseUrl}${APIEndpoint.CHECK_PRODUCT_AVAILABILITY}`, { params }).pipe(map((response) => response.data.available));
    }

    generateSku(name: string, oid?: string): Observable<string> {
        const params = { name, ...(oid ? { oid } : {}) };
        return this._http.get<{ data: { sku: string } }>(`${environment.baseUrl}${APIEndpoint.GENERATE_PRODUCT_SKU}`, { params }).pipe(map((response) => response.data.sku));
    }

    /**
     * Uploads one photo the moment it is picked, so a failure shows while the person is still on
     * the photo, never after they have filled the whole form.
     *
     * The server signs, the browser sends the file straight to Cloudinary. Progress needs
     * `reportProgress` with `observe: 'events'`; a plain post reports nothing until it is over,
     * which is why the old progress bar never moved.
     */
    uploadPhoto(file: File): Observable<PhotoUpload> {
        return this._http.post<{ data: PhotoUploadSignature }>(`${environment.baseUrl}${APIEndpoint.SIGN_PRODUCT_PHOTO_UPLOAD}`, {}).pipe(
            switchMap(({ data }) => from(this.shrink(file)).pipe(map((blob) => ({ signed: data, blob })))),
            switchMap(({ signed, blob }) => {
                const form = new FormData();
                form.append('file', blob, file.name);
                form.append('api_key', signed.api_key);
                form.append('timestamp', String(signed.timestamp));
                form.append('folder', signed.folder);
                form.append('signature', signed.signature);
                return this._xhr.post<{ secure_url: string }>(APIEndpoint.CLOUDINARY_UPLOAD.replace('{cloud}', signed.cloud_name), form, { reportProgress: true, observe: 'events' });
            }),
            filter((event) => event.type === HttpEventType.Sent || event.type === HttpEventType.UploadProgress || event.type === HttpEventType.Response),
            map((event): PhotoUpload => {
                if (event.type === HttpEventType.Response) return { state: 'done', url: event.body!.secure_url };
                // Sent is the moment the file starts to travel: signing and shrinking are behind it.
                if (event.type === HttpEventType.Sent) return { state: 'uploading', progress: 0 };
                // Held under 100 until Cloudinary answers: the bytes arriving is not the photo being saved.
                const total = (event as { total?: number }).total ?? 0;
                return { state: 'uploading', progress: total ? Math.min(99, Math.round(((event as { loaded: number }).loaded / total) * 100)) : 0 };
            })
        );
    }

    /**
     * Which field the server refused, or null for any other failure. Only the field is taken: the
     * server's sentence is English, and the screen has the words in both languages.
     */
    conflictOf(error: unknown): ProductField | null {
        if (!(error instanceof HttpErrorResponse) || (error.status !== 409 && error.status !== 400)) return null;
        const field = error.error?.data?.field;
        return field === 'sku' || field === 'sub_category_oid' || field === 'brand_oid' ? field : null;
    }

    /** Why a delete was refused: on the shelf, promised to an online order, or on a purchase order not yet received. */
    deleteBlockOf(error: unknown): { reason: 'in_stock' | 'held' | 'on_order'; count: number } | null {
        if (!(error instanceof HttpErrorResponse) || error.status !== 409) return null;
        const data = error.error?.data;
        if (data?.reason === 'in_stock') return { reason: 'in_stock', count: data.on_hand };
        if (data?.reason === 'held') return { reason: 'held', count: data.held };
        if (data?.reason === 'on_order') return { reason: 'on_order', count: data.on_order };
        return null;
    }

    /** A smaller JPEG when the photo is larger than it needs to be, the file itself otherwise. */
    private async shrink(file: File): Promise<Blob> {
        const bitmap = await createImageBitmap(file);
        const scale = Math.min(1, LONGEST_EDGE / Math.max(bitmap.width, bitmap.height));
        if (scale === 1 && file.size < 1_000_000) {
            bitmap.close();
            return file;
        }
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(bitmap.width * scale);
        canvas.height = Math.round(bitmap.height * scale);
        const context = canvas.getContext('2d')!;
        // JPEG has no transparency, and a transparent PNG would otherwise come out on black.
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        bitmap.close();
        return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob ?? file), 'image/jpeg', JPEG_QUALITY));
    }
}
