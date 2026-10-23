import { Subject, of, take, throwError } from 'rxjs';
import { TtlCache } from './ttl-cache';

describe('TtlCache', () => {
    afterEach(() => vi.useRealTimers());

    const counting = () => {
        let asked = 0;
        return {
            request: () => {
                asked += 1;
                return of(`answer ${asked}`);
            },
            asked: () => asked,
        };
    };

    it('answers from memory the second time, inside its lifetime', () => {
        const cache = new TtlCache<string>(5 * 60 * 1000);
        const server = counting();

        cache.through('cat-1', server.request).subscribe();
        let second = '';
        cache.through('cat-1', server.request).subscribe((value) => (second = value));

        expect(server.asked()).toBe(1);
        expect(second).toBe('answer 1');
    });

    it('asks again once the lifetime has passed', () => {
        vi.useFakeTimers();
        const cache = new TtlCache<string>(5 * 60 * 1000);
        const server = counting();

        cache.through('cat-1', server.request).subscribe();
        vi.advanceTimersByTime(5 * 60 * 1000);
        cache.through('cat-1', server.request).subscribe();

        expect(server.asked()).toBe(2);
    });

    // Signing out does not reload the page. On a shared counter machine the next person to sign in
    // must not be served what the last one opened.
    it('empties every cache at once, which is what signing out does', () => {
        const categories = new TtlCache<string>(5 * 60 * 1000);
        const brands = new TtlCache<string>(5 * 60 * 1000);
        const server = counting();

        categories.through('cat-1', server.request).subscribe();
        brands.through('brand-1', server.request).subscribe();
        TtlCache.clearAll();
        categories.through('cat-1', server.request).subscribe();
        brands.through('brand-1', server.request).subscribe();

        expect(server.asked()).toBe(4);
    });

    it('asks again after the entry is forgotten, which is what a save does', () => {
        const cache = new TtlCache<string>(5 * 60 * 1000);
        const server = counting();

        cache.through('cat-1', server.request).subscribe();
        cache.forget('cat-1');
        cache.through('cat-1', server.request).subscribe();

        expect(server.asked()).toBe(2);
    });
});

describe('TtlCache with a version stamp', () => {
    const asking = (answer: () => string) => {
        let asked = 0;
        return {
            request: () => {
                asked += 1;
                return of(answer());
            },
            asked: () => asked,
        };
    };

    it('drops a young entry as soon as the version it was kept at moves on', () => {
        let version = '1|100';
        const cache = new TtlCache<string>(10 * 60 * 1000, () => version);
        const server = asking(() => `suppliers at ${version}`);

        cache.through('suppliers', server.request).subscribe();
        cache.through('suppliers', server.request).subscribe();
        expect(server.asked()).toBe(1);

        version = '1|200';
        let latest = '';
        cache.through('suppliers', server.request).subscribe((value) => (latest = value));
        expect(server.asked()).toBe(2);
        expect(latest).toBe('suppliers at 1|200');
    });

    it('shares one request between two pickers asking at the same moment', () => {
        const cache = new TtlCache<string>(10 * 60 * 1000, () => '1|100');
        const answer = new Subject<string>();
        let asked = 0;
        const request = () => {
            asked += 1;
            return answer.asObservable().pipe(take(1));
        };

        const first: string[] = [];
        const second: string[] = [];
        cache.through('warehouses', request).subscribe((value) => first.push(value));
        cache.through('warehouses', request).subscribe((value) => second.push(value));
        answer.next('Main store');

        expect(asked).toBe(1);
        expect(first).toEqual(['Main store']);
        expect(second).toEqual(['Main store']);
    });

    it('keeps nothing from a failed request, so the next open asks again', () => {
        const cache = new TtlCache<string>(10 * 60 * 1000, () => '1|100');
        let asked = 0;
        const failing = () => {
            asked += 1;
            return throwError(() => new Error('offline'));
        };

        cache.through('brands', failing).subscribe({ error: () => undefined });
        cache.through('brands', failing).subscribe({ error: () => undefined });

        expect(asked).toBe(2);
    });
});
