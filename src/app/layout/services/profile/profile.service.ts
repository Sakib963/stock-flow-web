import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, finalize, map } from 'rxjs';
import { environment } from '@env/environment';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { PhotoUpload } from '@app/core/models/photo-upload.model';
import { Profile, ProfileChanges } from '@app/core/models/profile.model';
import { PhotoUploadService } from '@app/shared/services/photo-upload/photo-upload.service';

/** The signed-in person's own profile and password, from the account menu. */
@Injectable({ providedIn: 'root' })
export class ProfileService {
    private readonly _http = inject(HttpClient);
    private readonly _photos = inject(PhotoUploadService);
    private readonly _base = environment.baseUrl;

    readonly saving = signal(false);

    profile(): Observable<Profile> {
        return this._http.get<{ data: Profile }>(`${this._base}${APIEndpoint.GET_PROFILE_INFO}`).pipe(map((response) => response.data));
    }

    save(changes: ProfileChanges): Observable<Profile> {
        return this.write<Profile>(APIEndpoint.UPDATE_PROFILE_INFO, changes);
    }

    uploadPhoto(file: File): Observable<PhotoUpload> {
        return this._photos.upload(APIEndpoint.SIGN_PROFILE_PHOTO_UPLOAD, file);
    }

    /** The first step: the current password proves it is them, and a code is emailed. */
    requestPasswordCode(current_password: string, new_password: string): Observable<{ otp_oid: string }> {
        return this.write(APIEndpoint.CHANGE_PASSWORD, { current_password, new_password, confirm_password: new_password });
    }

    /** The second: the emailed code changes the password and signs every other device out. */
    confirmPasswordChange(otp_oid: string, otp: string, new_password: string): Observable<{ sessions_closed: number }> {
        return this.write(APIEndpoint.VERIFY_PASSWORD_CHANGE, { otp_oid, otp, new_password });
    }

    /** The first sign-in of an account someone else created: the temporary password proves it is them. */
    setFirstPassword(current_password: string, new_password: string): Observable<unknown> {
        return this.write(APIEndpoint.SET_FIRST_PASSWORD, { current_password, new_password });
    }

    private write<T>(endpoint: string, body: object): Observable<T> {
        this.saving.set(true);
        return this._http.post<{ data: T }>(`${this._base}${endpoint}`, body).pipe(
            map((response) => response.data),
            finalize(() => this.saving.set(false))
        );
    }
}
