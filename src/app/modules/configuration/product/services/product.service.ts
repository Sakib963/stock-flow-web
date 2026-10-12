import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { PhotoUpload } from '@app/core/models/photo-upload.model';
import { ProductDetails, ProductField, ProductPayload, SubCategoryChoice } from '@app/core/models/product.model';
import { PhotoUploadService } from '@app/shared/services/photo-upload/photo-upload.service';
import { StockMovementRow } from '@app/core/models/stock-movement.model';
import { environment } from '@env/environment';
import { Observable, finalize, map } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ProductService {
    private readonly _http = inject(HttpClient);
    private readonly _photos = inject(PhotoUploadService);

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

    /** Uploads one photo the moment it is picked, so a failure shows while the person is still on the photo. */
    uploadPhoto(file: File): Observable<PhotoUpload> {
        return this._photos.upload(APIEndpoint.SIGN_PRODUCT_PHOTO_UPLOAD, file);
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
}
