import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, shareReplay } from 'rxjs';
import { APIEndpoint } from '@app/core/constants/api-endpoint';

/** The district boundaries the map draws: a file that never changes while the app runs. */
export interface BoundaryFile {
    width: number;
    height: number;
    credit: string;
    districts: { oid: string; d: string; x: number; y: number }[];
}

/** Fetches the boundary file once per visit and shares it with every map. */
@Injectable({ providedIn: 'root' })
export class MapBoundariesService {
    readonly districts$: Observable<BoundaryFile> = inject(HttpClient).get<BoundaryFile>(APIEndpoint.BD_DISTRICT_MAP).pipe(shareReplay(1));
}
