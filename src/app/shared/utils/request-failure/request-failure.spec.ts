import { HttpErrorResponse } from '@angular/common/http';
import { failureKey, failureOf } from './request-failure';

describe('failureOf', () => {
    it('tells a refusal, a network failure and a server fault apart', () => {
        expect(failureOf(new HttpErrorResponse({ status: 403 }))).toBe('forbidden');
        expect(failureOf(new HttpErrorResponse({ status: 0 }))).toBe('network');
        expect(failureOf(new HttpErrorResponse({ status: 500 }))).toBe('server');
    });

    it('treats anything that is not an HTTP failure as a server fault', () => {
        expect(failureOf(new Error('boom'))).toBe('server');
        expect(failureOf(undefined)).toBe('server');
    });

    it('builds the copy key under the feature that asked', () => {
        expect(failureKey(new HttpErrorResponse({ status: 403 }), 'form.saveFailed')).toBe('form.saveFailed.forbidden');
    });

    it('answers a form opened before someone else saved with the one shared message, whatever the feature', () => {
        const stale = new HttpErrorResponse({ status: 409, error: { data: { reason: 'changed_since_loaded' } } });
        expect(failureKey(stale, 'configuration.category.saveFailed')).toBe('form.changedSinceLoaded');
        expect(failureKey(new HttpErrorResponse({ status: 409, error: { data: { field: 'name' } } }), 'form.saveFailed')).toBe('form.saveFailed.server');
    });
});
