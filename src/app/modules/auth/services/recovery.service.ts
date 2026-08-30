import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { environment } from '@env/environment';
import { Observable, tap } from 'rxjs';

/** Which message the recovery screens should show. Never says whether the address exists. */
export type RecoveryFailure = 'code' | 'expired' | 'locked' | 'throttled' | 'network' | 'server';

interface RecoverySession {
    email: string;
    /** ISO timestamp from the server, so the countdown does not start at page load. */
    expiresAt: string;
    /** Epoch millis of the last send, for the resend cooldown. */
    lastSentAt: number;
}

const SESSION_KEY = 'sf_recovery';
export const RESEND_COOLDOWN_SECONDS = 60;

@Injectable({ providedIn: 'root' })
export class RecoveryService {
    private readonly _http = inject(HttpClient);

    readonly sending = signal(false);
    readonly resetting = signal(false);

    /**
     * The in-flight recovery, held in sessionStorage rather than localStorage.
     *
     * A counter machine is shared, so this must not survive into the next person's attempt. It is
     * in storage at all only so the 60 second resend cooldown and the expiry countdown survive a
     * reload of the middle screen.
     */
    readonly session = signal<RecoverySession | null>(this.restore());

    requestCode(email: string): Observable<{ data: { expires_at: string } }> {
        this.sending.set(true);
        return this._http.post<{ data: { expires_at: string } }>(`${environment.baseUrl}${APIEndpoint.FORGOT_PASSWORD}`, { email }).pipe(
            tap({
                next: (response) => {
                    this.sending.set(false);
                    this.remember({ email, expiresAt: response?.data?.expires_at, lastSentAt: Date.now() });
                },
                error: () => this.sending.set(false),
            })
        );
    }

    resetPassword(input: { email: string; otp: string; password: string }): Observable<unknown> {
        this.resetting.set(true);
        return this._http
            .post(`${environment.baseUrl}${APIEndpoint.RESET_PASSWORD}`, {
                email: input.email,
                otp: input.otp,
                // The server checks the confirmation too. Sending both keeps that check meaningful
                // rather than trusting the client to have compared them.
                new_password: input.password,
                confirm_password: input.password,
            })
            .pipe(
                tap({
                    next: () => this.resetting.set(false),
                    error: () => this.resetting.set(false),
                })
            );
    }

    /**
     * Sorts a failed reset into the cases the screen has copy for.
     *
     * The server answers 404 for both a wrong code and an expired one, deliberately, so they are
     * separated here on the message text. Getting it wrong only picks the less specific of two
     * true statements, which is why this reads the message rather than inventing a status code.
     */
    classify(error: HttpErrorResponse): RecoveryFailure {
        if (error.status === 0) return 'network';
        if (error.status === 429) return String(error.error?.message ?? '').includes('incorrect codes') ? 'locked' : 'throttled';
        if (error.status === 404) return String(error.error?.message ?? '').includes('expired') ? 'expired' : 'code';
        if (error.status >= 500) return 'server';
        return 'code';
    }

    secondsUntilResend(): number {
        const last = this.session()?.lastSentAt ?? 0;
        const elapsed = Math.floor((Date.now() - last) / 1000);
        return Math.max(0, RESEND_COOLDOWN_SECONDS - elapsed);
    }

    clear(): void {
        this.session.set(null);
        try {
            sessionStorage.removeItem(SESSION_KEY);
        } catch {
            // Storage blocked. The screens still work, they just lose the cooldown on reload.
        }
    }

    private remember(session: RecoverySession): void {
        this.session.set(session);
        try {
            sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
        } catch {
            // As above: the countdown falls back to whatever is in memory.
        }
    }

    private restore(): RecoverySession | null {
        try {
            const raw = sessionStorage.getItem(SESSION_KEY);
            if (!raw) return null;
            const parsed = JSON.parse(raw) as RecoverySession;
            return parsed?.email ? parsed : null;
        } catch {
            return null;
        }
    }
}
