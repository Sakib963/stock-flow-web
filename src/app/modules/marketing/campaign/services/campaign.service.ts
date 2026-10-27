import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { CampaignDetails, CampaignMove, CampaignPayload, DeliverablePayload, CampaignStatus, PartnerChoice, PartnerPaymentPayload, PromotableProduct } from '@app/core/models/campaign.model';
import { SEARCH_PAGE } from '@app/shared/utils/server-search/server-search';
import { environment } from '@env/environment';
import { Observable, finalize, map } from 'rxjs';

const MOVE_ENDPOINT: Record<CampaignMove, string> = { start: APIEndpoint.START_CAMPAIGN, complete: APIEndpoint.COMPLETE_CAMPAIGN, cancel: APIEndpoint.CANCEL_CAMPAIGN };

@Injectable({ providedIn: 'root' })
export class CampaignService {
    private readonly _http = inject(HttpClient);
    private readonly _url = (endpoint: string) => `${environment.baseUrl}${endpoint}`;

    readonly saving = signal(false);

    details(oid: string): Observable<CampaignDetails> {
        return this._http.get<{ data: CampaignDetails }>(`${this._url(APIEndpoint.GET_CAMPAIGN_DETAILS)}/${oid}`).pipe(map((response) => response.data));
    }

    /** Fifty at a time, searched by name or handle on the server, leaving out the ones already on the campaign: names and handles only, no fees or dues. */
    partners(search: string, offset: number, exclude: readonly string[]): Observable<PartnerChoice[]> {
        return this._http.get<{ data: PartnerChoice[] }>(this._url(APIEndpoint.GET_PARTNERS_FOR_CAMPAIGN), { params: { search, offset, limit: SEARCH_PAGE, exclude: exclude.join(',') } }).pipe(map((response) => response.data));
    }

    searchBatches(search: string): Observable<PromotableProduct[]> {
        const params: Record<string, string> = search.trim() ? { search: search.trim() } : {};
        return this._http.get<{ data: PromotableProduct[] }>(this._url(APIEndpoint.GET_BATCHES_FOR_CAMPAIGN), { params }).pipe(map((response) => response.data));
    }

    /** The oid is made here, so a save repeated after a lost answer finds the campaign it made. */
    save(payload: CampaignPayload, version: string | null): Observable<string> {
        this.saving.set(true);
        return this._http.post<{ data: { oid: string } }>(this._url(version !== null ? APIEndpoint.UPDATE_CAMPAIGN : APIEndpoint.CREATE_CAMPAIGN), version === null ? payload : { ...payload, version }).pipe(
            map((response) => response.data.oid),
            finalize(() => this.saving.set(false))
        );
    }

    /** The oid is made by the caller, so a payment repeated after a lost answer is recorded once. */
    recordPayment(payload: PartnerPaymentPayload): Observable<{ paid: number; owed: number }> {
        return this._http.post<{ data: { paid: number; owed: number } }>(this._url(APIEndpoint.CREATE_PARTNER_PAYMENT), payload).pipe(map((response) => response.data));
    }

    /** Adds a promise when the payload names its partner line, otherwise changes the one it names. */
    saveDeliverable(payload: DeliverablePayload, version: string | null): Observable<unknown> {
        return this._http.post(this._url(payload.campaign_partner_oid ? APIEndpoint.CREATE_CAMPAIGN_DELIVERABLE : APIEndpoint.UPDATE_CAMPAIGN_DELIVERABLE), version === null ? payload : { ...payload, version });
    }

    removeDeliverable(oid: string): Observable<unknown> {
        return this._http.post(this._url(APIEndpoint.DELETE_CAMPAIGN_DELIVERABLE), { oid });
    }

    move(move: CampaignMove, oid: string, note?: string): Observable<CampaignStatus> {
        return this._http.post<{ data: { status: CampaignStatus } }>(this._url(MOVE_ENDPOINT[move]), note ? { oid, note } : { oid }).pipe(map((response) => response.data.status));
    }
}
