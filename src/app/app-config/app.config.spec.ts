import { createApplication } from '@angular/platform-browser';
import { appConfig } from './app.config';
import { Constants } from '@app/core/constants/constants';

/**
 * Boots the real provider graph, initializers and all.
 *
 * The unit tests around it each provide a slice of that graph, and a circular dependency is
 * invisible in a slice: it only appears when the whole ring is present at once. That is how an
 * NG0200 reached the browser and left the app sitting on its loading skeleton, so this test is
 * here to catch the next one before a deploy does.
 */
describe('appConfig', () => {
    afterEach(() => localStorage.clear());

    it('boots with a stored session', async () => {
        localStorage.setItem(Constants.AUTH_STORE_KEY, JSON.stringify({ access_token: 'token', refresh_token: 'refresh' }));

        const app = await createApplication(appConfig);
        expect(app.injector).toBeTruthy();
        app.destroy();
    });

    it('boots with no session at all', async () => {
        localStorage.clear();

        const app = await createApplication(appConfig);
        expect(app.injector).toBeTruthy();
        app.destroy();
    });
});
