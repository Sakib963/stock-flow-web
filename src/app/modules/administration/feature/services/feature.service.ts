import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { FeatureDetails, FeaturePayload, FeatureSwitch, FeatureTree } from '@app/core/models/feature.model';
import { environment } from '@env/environment';
import { Observable, finalize, map } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class FeatureService {
    private readonly _http = inject(HttpClient);

    readonly saving = signal(false);

    tree(): Observable<FeatureTree> {
        return this._http.get<{ data: FeatureTree }>(`${environment.baseUrl}${APIEndpoint.GET_FEATURE_TREE}`).pipe(map((response) => response.data));
    }

    details(oid: string): Observable<FeatureDetails> {
        return this._http.get<{ data: FeatureDetails }>(`${environment.baseUrl}${APIEndpoint.GET_FEATURE_DETAILS}/${oid}`).pipe(map((response) => response.data));
    }

    /** Whether anything changed: the server writes nothing when the feature already says this. */
    update(payload: FeaturePayload): Observable<boolean> {
        return this.send(APIEndpoint.UPDATE_FEATURE_DETAILS, payload);
    }

    switch(change: FeatureSwitch): Observable<boolean> {
        return this.send(APIEndpoint.SWITCH_FEATURE, change);
    }

    private send(endpoint: string, body: object): Observable<boolean> {
        this.saving.set(true);
        return this._http.post<{ data?: { changed?: boolean } }>(`${environment.baseUrl}${endpoint}`, body).pipe(
            map((response) => response?.data?.changed !== false),
            finalize(() => this.saving.set(false))
        );
    }
}
