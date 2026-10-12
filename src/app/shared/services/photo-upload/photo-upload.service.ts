import { HttpClient, HttpEventType, HttpXhrBackend } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { PhotoUpload, PhotoUploadSignature } from '@app/core/models/photo-upload.model';
import { environment } from '@env/environment';
import { Observable, filter, from, map, switchMap } from 'rxjs';

/** A phone photo is 4000px across; 1600 is sharper than any screen here shows a photo, and a tenth of the upload. */
const LONGEST_EDGE = 1600;
const JPEG_QUALITY = 0.82;

/** One photo straight to Cloudinary, signed by whichever endpoint owns the folder it lands in: a product's, a person's. */
@Injectable({ providedIn: 'root' })
export class PhotoUploadService {
    private readonly _http = inject(HttpClient);
    // The app's client runs on fetch, which reports no upload progress at all: the bar sat at 0% until
    // the photo was done. The upload alone goes through XHR, which does. It also skips the app's
    // interceptors, which have nothing to add to a request for Cloudinary.
    private readonly _xhr = new HttpClient(inject(HttpXhrBackend));

    /**
     * Uploads one photo the moment it is picked, so a failure shows while the person is still on
     * the photo, never after they have filled the whole form.
     *
     * The server signs, the browser sends the file straight to Cloudinary. Progress needs
     * `reportProgress` with `observe: 'events'`; a plain post reports nothing until it is over,
     * which is why the old progress bar never moved.
     */
    upload(signEndpoint: string, file: File): Observable<PhotoUpload> {
        return this._http.post<{ data: PhotoUploadSignature }>(`${environment.baseUrl}${signEndpoint}`, {}).pipe(
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
