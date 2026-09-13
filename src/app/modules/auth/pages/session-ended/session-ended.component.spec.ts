import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { SessionEndedComponent } from './session-ended.component';

describe('SessionEndedComponent', () => {
    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [SessionEndedComponent],
            providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), provideTranslateService({ fallbackLang: 'en' })],
        }).compileComponents();
    });

    const render = async (inputs: Record<string, string>) => {
        const fixture = TestBed.createComponent(SessionEndedComponent);
        for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value);
        fixture.detectChanges();
        await fixture.whenStable();
        return fixture.nativeElement as HTMLElement;
    };

    it('explains a sign-out from another device and offers to secure the account', async () => {
        const page = await render({ reason: 'signed-out-elsewhere' });

        expect(page.querySelector('[data-reason]')?.getAttribute('data-reason')).toBe('signedOutElsewhere');
        expect(page.textContent).toContain('auth.ended.signedOutElsewhere.title');
        expect(page.querySelector('[data-ended="reset"]')).not.toBeNull();
    });

    it('does not suggest a reset over an ordinary expiry or a turned-off account', async () => {
        for (const reason of ['expired', 'account-disabled']) {
            const page = await render({ reason });
            expect(page.querySelector('[data-ended="reset"]')).toBeNull();
        }
    });

    /** A hand-edited address must never render an alarm, or nothing at all. */
    it('reads a reason it does not know as an expiry', async () => {
        for (const reason of ['nonsense', 'constructor']) {
            const page = await render({ reason });
            expect(page.querySelector('[data-reason]')?.getAttribute('data-reason')).toBe('expired');
        }
    });

    it('takes the person back to where they were once they sign in again', async () => {
        const page = await render({ reason: 'expired', origUrl: '/app/dashboard' });

        expect(page.querySelector('[data-ended="sign-in"]')?.getAttribute('href')).toBe('/auth/login?origUrl=%2Fapp%2Fdashboard');
    });
});
