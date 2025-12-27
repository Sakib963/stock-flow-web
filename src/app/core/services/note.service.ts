import { inject, Injectable, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpResponse } from '@angular/common/http';
import { HttpService } from './http.service';
import { APIEndpoint } from '../constants/api-endpoint';

export interface Note {
  oid: string;
  user_id: string;
  title: string;
  content: string;
  created_on: string;
  edited_on?: string;
}

@Injectable({
  providedIn: 'root',
})
export class NoteService {
  private readonly _httpService = inject(HttpService);

  // Signal to store notes
  notes = signal<Note[]>([]);
  isLoading = signal(false);

  /**
   * Fetch all notes for the current user
   */
  getUserNotes(): Observable<HttpResponse<any>> {
    this.isLoading.set(true);
    return this._httpService.get<any>(APIEndpoint.GET_USER_NOTES, false);
  }

  /**
   * Get a specific note by ID
   */
  getNoteById(noteOid: string): Observable<HttpResponse<any>> {
    return this._httpService.get<any>(
      `${APIEndpoint.GET_NOTE_BY_ID}/${noteOid}`
    );
  }

  /**
   * Create a new note
   */
  createNote(noteData: {
    title: string;
    content: string;
  }): Observable<HttpResponse<any>> {
    return this._httpService.post(APIEndpoint.CREATE_NOTE, noteData);
  }

  /**
   * Update an existing note
   */
  updateNote(noteData: {
    oid: string;
    title: string;
    content: string;
  }): Observable<HttpResponse<any>> {
    return this._httpService.post(`${APIEndpoint.UPDATE_NOTE}`, noteData);
  }

  /**
   * Delete a note
   */
  deleteNote(noteOid: string): Observable<HttpResponse<any>> {
    return this._httpService.delete(`${APIEndpoint.DELETE_NOTE}/${noteOid}`);
  }

  /**
   * Load notes and update signal
   */
  loadNotes(): void {
    this.isLoading.set(true);
    this.getUserNotes().subscribe({
      next: (response) => {
        if (response.body?.code === 200) {
          this.notes.set(response.body.data || []);
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      },
    });
  }

  /**
   * Clear notes from signal
   */
  clearNotes(): void {
    this.notes.set([]);
  }
}
