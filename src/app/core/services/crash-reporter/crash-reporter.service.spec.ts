import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { SessionService } from '@app/core/services/session/session.service';
import { CrashReporterService } from './crash-reporter.service';

const reporter = (signedIn: boolean) => {
    TestBed.configureTestingModule({
        providers: [provideHttpClient(), provideHttpClientTesting(), CrashReporterService, { provide: SessionService, useValue: { user: () => (signedIn ? { name: 'Rafi' } : null) } }],
    });
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    return { service: TestBed.inject(CrashReporterService), http: TestBed.inject(HttpTestingController) };
};

describe('CrashReporterService', () => {
    it('sends a broken page once with the page, the message and the stack', () => {
        const { service, http } = reporter(true);
        service.handleError(new TypeError("Cannot read properties of undefined (reading 'oid')"));
        service.handleError(new TypeError("Cannot read properties of undefined (reading 'oid')"));
        const sent = http.match((r) => r.url.endsWith('/report-crash'));
        expect(sent.length).toBe(1);
        expect(sent[0].request.body.message).toContain("reading 'oid'");
        expect(sent[0].request.body.page).toBe(location.pathname);
        expect(sent[0].request.body.stack).toBeTruthy();
    });

    it('scrubs a token or password out of the message before sending it', () => {
        const { service, http } = reporter(true);
        service.handleError(new Error('Refresh failed for token=abc123 with password: hunter2'));
        const body = http.expectOne((r) => r.url.endsWith('/report-crash')).request.body;
        expect(body.message).not.toContain('abc123');
        expect(body.message).not.toContain('hunter2');
    });

    it('leaves a failed request to the server, and sends nothing for someone signed out', () => {
        const { service, http } = reporter(true);
        service.handleError(new HttpErrorResponse({ status: 500 }));
        http.expectNone((r) => r.url.endsWith('/report-crash'));

        TestBed.resetTestingModule();
        const signedOut = reporter(false);
        signedOut.service.handleError(new Error('boom'));
        signedOut.http.expectNone((r) => r.url.endsWith('/report-crash'));
    });
});
