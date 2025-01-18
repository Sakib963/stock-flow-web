import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs'; // To handle errors gracefully

@Injectable({
  providedIn: 'root',
})
export class FileService {
  private uploadUrl = `https://api.cloudinary.com/v1_1/${environment.cloudinary.cloudName}/image/upload`;

  constructor(private http: HttpClient) {}

  uploadImage(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', environment.cloudinary.uploadPreset);
    formData.append('cloud_name', environment.cloudinary.cloudName);
    formData.append('folder', 'stockflow');

    return this.http.post(this.uploadUrl, formData).pipe(
      catchError((error) => {
        console.error('Upload failed', error);
        return of({ error: 'Upload failed, please try again later.' });
      })
    );
  }
}
