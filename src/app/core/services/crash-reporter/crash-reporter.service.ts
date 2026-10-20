import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ErrorHandler, Injectable, Injector, inject } from '@angular/core';
import { environment } from '@env/environment';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { SessionService } from '@app/core/services/session/session.service';

const MAX_PER_VISIT = 10;

// The log keeps keys like "password" out by name only, so free text is scrubbed before it leaves.
const scrub = (text: string): string => text.replace(/(token|password|otp|secret)(["']?\s*[:=]\s*["']?)[^\s"'&,}]+/gi, '$1$2[redacted]').replace(/Bearer\s+\S+/gi, 'Bearer [redacted]');

@Injectable()
export class CrashReporterService implements ErrorHandler {
    private readonly _injector = inject(Injector);
    private readonly _sent = new Set<string>();

    handleError(error: unknown): void {
        console.error(error);
        if (error instanceof HttpErrorResponse) return;
        const message = scrub(error instanceof Error ? error.message : String(error)).slice(0, 1000) || 'Unknown error';
        if (this._sent.has(message) || this._sent.size >= MAX_PER_VISIT) return;
        // Read, not injected: the error handler is built before these services exist.
        if (!this._injector.get(SessionService).user()) return;
        this._sent.add(message);
        const stack = error instanceof Error && error.stack ? scrub(error.stack).slice(0, 8000) : null;
        this._injector
            .get(HttpClient)
            .post(`${environment.baseUrl}${APIEndpoint.REPORT_CRASH}`, { page: location.pathname, message, stack, version: environment.version })
            .subscribe({ error: (failure: unknown) => console.error('The crash could not be reported', failure) });
    }
}
