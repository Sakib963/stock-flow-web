import { of } from 'rxjs';
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
