import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { MessageTemplate, MessageTemplatePayload } from '@app/core/models/message-template.model';
import { environment } from '@env/environment';
import { Observable, finalize, map } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SalesSettingsService {
    private readonly _http = inject(HttpClient);
    private readonly _base = environment.baseUrl;

    readonly saving = signal(false);

    templates(): Observable<MessageTemplate[]> {
        return this._http.get<{ data: MessageTemplate[] }>(`${this._base}${APIEndpoint.GET_MESSAGE_TEMPLATES}`).pipe(map((response) => response.data));
    }

    saveTemplate(payload: MessageTemplatePayload): Observable<MessageTemplate> {
        this.saving.set(true);
        return this._http.post<{ data: MessageTemplate }>(`${this._base}${APIEndpoint.SAVE_MESSAGE_TEMPLATE}`, payload).pipe(
            map((response) => response.data),
            finalize(() => this.saving.set(false))
        );
    }

    recordCopied(order_oid: string, template_oid: string): Observable<unknown> {
        return this._http.post(`${this._base}${APIEndpoint.RECORD_MESSAGE_COPIED}`, { order_oid, template_oid });
    }
}
