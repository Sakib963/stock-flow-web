import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, finalize, map } from 'rxjs';
import { environment } from '@env/environment';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { BusinessSettings, BusinessSettingsChanges } from '@app/core/models/business-settings.model';
import { PhotoUpload } from '@app/core/models/photo-upload.model';
import { PhotoUploadService } from '@app/shared/services/photo-upload/photo-upload.service';

/** The business's name, logo and contact details. Read fresh each time the page opens. */
@Injectable({ providedIn: 'root' })
export class BusinessSettingsService {
    private readonly _http = inject(HttpClient);
    private readonly _photos = inject(PhotoUploadService);
    private readonly _base = environment.baseUrl;

    readonly saving = signal(false);

    settings(): Observable<BusinessSettings> {
        return this._http.get<{ data: BusinessSettings }>(`${this._base}${APIEndpoint.GET_BUSINESS_SETTINGS}`).pipe(map((response) => response.data));
    }

    save(changes: BusinessSettingsChanges, version: string): Observable<BusinessSettings> {
        this.saving.set(true);
        return this._http.post<{ data: BusinessSettings }>(`${this._base}${APIEndpoint.UPDATE_BUSINESS_SETTINGS}`, { ...changes, version }).pipe(
            map((response) => response.data),
            finalize(() => this.saving.set(false))
        );
    }

    uploadLogo(file: File): Observable<PhotoUpload> {
        return this._photos.upload(APIEndpoint.SIGN_SETTINGS_LOGO_UPLOAD, file);
    }
}
