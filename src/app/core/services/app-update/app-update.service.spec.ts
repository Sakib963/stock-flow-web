import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { environment } from '@env/environment';
import { AppUpdateService } from './app-update.service';

const stamped = environment as { build?: string | null };

describe('AppUpdateService', () => {
    let fetchSpy: ReturnType<typeof vi.spyOn>;

    const answer = (body: unknown, ok = true) => fetchSpy.mockResolvedValue({ ok, json: async () => body } as Response);

    const start = (build: string | null) => {
        stamped.build = build;
        TestBed.configureTestingModule({
            providers: [
                provideRouter([
                    {
                        path: 'gone',
                        loadComponent: () => Promise.reject(new TypeError('Failed to fetch dynamically imported module: https://example.test/chunk-OLD.js')),
                    },
                ]),
            ],
        });
        return TestBed.inject(AppUpdateService);
    };

    beforeEach(() => {
        fetchSpy = vi.spyOn(window, 'fetch');
    });

    afterEach(() => {
        fetchSpy.mockRestore();
        stamped.build = undefined;
    });

    it('offers the new version when the deployed build is not this one', async () => {
        const update = start('aaa111');
        answer({ build: 'bbb222' });

        await update.check();

        expect(update.available()).toBe(true);
        expect(fetchSpy).toHaveBeenCalledWith('version.json', { cache: 'no-store' });
    });

    it('stays quiet when the deployed build is this one', async () => {
        const update = start('aaa111');
        answer({ build: 'aaa111' });

        await update.check();

        expect(update.available()).toBe(false);
    });

    it('stays quiet when the check cannot reach the site, and asks again next time', async () => {
        const update = start('aaa111');
        fetchSpy.mockRejectedValue(new TypeError('Failed to fetch'));

        await update.check();
        expect(update.available()).toBe(false);

        answer({ build: 'bbb222' });
        await update.check();
        expect(update.available()).toBe(true);
    });

    it('never checks in a build made on a laptop, which has no stamp', async () => {
        const update = start(null);

        await update.check();

        expect(fetchSpy).not.toHaveBeenCalled();
        expect(update.available()).toBe(false);
    });

    it('hides the offer on Later until a check sees the new version again', async () => {
        const update = start('aaa111');
        answer({ build: 'bbb222' });
        await update.check();

        update.later();
        expect(update.available()).toBe(false);

        await update.check();
        expect(update.available()).toBe(true);
    });

    it('requires a reload once a page cannot load its code', async () => {
        const update = start('aaa111');

        await TestBed.inject(Router)
            .navigateByUrl('/gone')
            .catch(() => undefined);

        expect(update.required()).toBe(true);
    });
});
