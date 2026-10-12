import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, finalize, map } from 'rxjs';
import { environment } from '@env/environment';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { Note, NoteTag } from '@app/core/models/note.model';

/** The signed-in person's own notes. The list is read whenever the panel opens, never kept between visits. */
@Injectable({ providedIn: 'root' })
export class NotesService {
    private readonly _http = inject(HttpClient);
    private readonly _base = environment.baseUrl;

    readonly saving = signal(false);

    list(): Observable<Note[]> {
        return this._http.get<{ data: Note[] }>(`${this._base}${APIEndpoint.GET_USER_NOTE_LIST}`).pipe(map((response) => response.data ?? []));
    }

    /** The oid is made here, so a save repeated after a lost answer finds the note it made. */
    create(oid: string, note_title: string | null, note_text: string | null, tags: NoteTag[] | null): Observable<unknown> {
        return this.write(APIEndpoint.CREATE_USER_NOTE, { oid, note_title, note_text, tags });
    }

    update(oid: string, note_title: string | null, note_text: string | null, tags: NoteTag[] | null): Observable<unknown> {
        return this.write(APIEndpoint.UPDATE_USER_NOTE, { oid, note_title, note_text, tags });
    }

    remove(oid: string): Observable<unknown> {
        return this.write(APIEndpoint.DELETE_USER_NOTE, { oid });
    }

    private write(endpoint: string, body: object): Observable<unknown> {
        this.saving.set(true);
        return this._http.post(`${this._base}${endpoint}`, body).pipe(finalize(() => this.saving.set(false)));
    }
}
