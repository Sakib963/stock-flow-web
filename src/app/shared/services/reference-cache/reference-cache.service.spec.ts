import { TestBed } from '@angular/core/testing';
import { ConfigVersionService } from '@app/core/services/config-version/config-version.service';
import { of } from 'rxjs';
import { ReferenceCache } from './reference-cache.service';

describe('ReferenceCache', () => {
    let cache: ReferenceCache;
    let versions: ConfigVersionService;
    let asked: number;
    const suppliers = () => {
        asked += 1;
        return of(['Mill']);
    };

    beforeEach(() => {
        TestBed.configureTestingModule({});
        cache = TestBed.inject(ReferenceCache);
        versions = TestBed.inject(ConfigVersionService);
        asked = 0;
    });

    it('serves one list to every page that asks while nothing has changed', () => {
        cache.keep('suppliers', suppliers).subscribe();
        cache.keep('suppliers', suppliers).subscribe();
        expect(asked).toBe(1);
    });

    it('asks again after a colleague changed a list, an own save or a sign-out', () => {
        cache.keep('suppliers', suppliers).subscribe();
        versions.seenReference('200');
        cache.keep('suppliers', suppliers).subscribe();
        versions.dropReferenceLists();
        cache.keep('suppliers', suppliers).subscribe();
        expect(asked).toBe(3);
    });

    it('asks again for one list it was told to forget, and only that one', () => {
        const warehouses = () => of(['Main store']);
        cache.keep('suppliers', suppliers).subscribe();
        cache.keep('warehouses', warehouses).subscribe();
        cache.forget('suppliers');
        cache.keep('suppliers', suppliers).subscribe();
        expect(asked).toBe(2);
    });
});
