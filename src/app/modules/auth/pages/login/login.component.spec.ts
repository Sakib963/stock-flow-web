import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideNzI18n, en_US } from 'ng-zorro-antd/i18n';
import { provideTranslateService } from '@ngx-translate/core';
import { NzMessageService } from 'ng-zorro-antd/message';
import { LoginComponent } from './login.component';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { Constants } from '@app/core/constants/constants';
import { environment } from '@env/environment';

describe('LoginComponent', () => {
    beforeEach(async () => {
        localStorage.clear();
        await TestBed.configureTestingModule({
            imports: [LoginComponent],
            providers: [provideRouter([{ path: 'app', children: [] }]), provideHttpClient(), provideHttpClientTesting(), provideNzI18n(en_US), provideTranslateService({ fallbackLang: 'en' })],
        }).compileComponents();
    });

    afterEach(() => localStorage.clear());

    async function render() {
        const fixture = TestBed.createComponent(LoginComponent);
        await fixture.whenStable();
        return { fixture, el: fixture.nativeElement as HTMLElement, cmp: fixture.componentInstance };
    }

    it('renders both fields and the submit button', async () => {
        const { el } = await render();
        expect(el.querySelector('#login-email')).toBeTruthy();
        expect(el.querySelector('#login-password')).toBeTruthy();
        expect(el.querySelector('button[type="submit"]')).toBeTruthy();
    });

    it('tells the person what goes in each field before they type', async () => {
        const { el } = await render();
        expect(el.querySelector('#login-email')?.getAttribute('placeholder')).toBe('auth.emailPlaceholder');
        expect(el.querySelector('#login-password')?.getAttribute('placeholder')).toBe('auth.passwordPlaceholder');
    });

    it('projects the leading icons into the input wrapper', async () => {
        const { el } = await render();
        // Guards the ng-zorro v22 projection API: a wrong attribute silently drops the icon.
        expect(el.querySelectorAll('nz-input-wrapper ng-icon svg').length).toBeGreaterThanOrEqual(2);
    });

    it('shows no error before a submit attempt', async () => {
        const { cmp } = await render();
        expect(cmp.emailError()).toBeNull();
        expect(cmp.passwordError()).toBeNull();
    });

    it('reports both required fields on an empty submit, and does not call the API', async () => {
        const { fixture, cmp } = await render();
        cmp.handleSubmit();
        await fixture.whenStable();

        expect(cmp.emailError()).toBe('auth.errEmailRequired');
        expect(cmp.passwordError()).toBe('auth.errPasswordRequired');
        TestBed.inject(HttpTestingController).expectNone(() => true);
    });

    it('flags a malformed email while it is being typed, with no submit', async () => {
        const { fixture, cmp } = await render();
        cmp.form.controls.email.setValue('abc');
        await fixture.whenStable();

        expect(cmp.submitted()).toBe(false);
        expect(cmp.emailError()).toBe('auth.errEmailInvalid');
    });

    it('clears the live email error the moment the address becomes valid', async () => {
        const { fixture, cmp } = await render();
        cmp.form.controls.email.setValue('abc');
        await fixture.whenStable();
        expect(cmp.emailError()).toBe('auth.errEmailInvalid');

        cmp.form.controls.email.setValue('abc@shop.com');
        await fixture.whenStable();
        expect(cmp.emailError()).toBeNull();
    });

    it('stays quiet on an untouched empty field, and asks for it once left', async () => {
        const { fixture, cmp } = await render();
        expect(cmp.emailError()).toBeNull();
        expect(cmp.passwordError()).toBeNull();

        cmp.onEmailBlur();
        cmp.onPasswordBlur();
        await fixture.whenStable();

        expect(cmp.emailError()).toBe('auth.errEmailRequired');
        expect(cmp.passwordError()).toBe('auth.errPasswordRequired');
    });

    it('rejects a malformed email with its own message', async () => {
        const { fixture, cmp } = await render();
        cmp.form.setValue({ email: 'not-an-email', password: 'secret', remember: true });
        cmp.handleSubmit();
        await fixture.whenStable();
        expect(cmp.emailError()).toBe('auth.errEmailInvalid');
    });

    it('toggles password visibility', async () => {
        const { fixture, el, cmp } = await render();
        const input = el.querySelector('#login-password') as HTMLInputElement;
        expect(input.type).toBe('password');

        cmp.togglePasswordVisible();
        await fixture.whenStable();
        expect((el.querySelector('#login-password') as HTMLInputElement).type).toBe('text');
    });

    it('signs in with the keep-signed-in choice and keeps only the refresh token on the machine', async () => {
        const { fixture, cmp } = await render();
        cmp.form.setValue({ email: 'owner@shop.com', password: 'secret', remember: true });
        cmp.handleSubmit();

        const http = TestBed.inject(HttpTestingController);
        const request = http.expectOne((r) => r.url.includes(APIEndpoint.SIGN_IN));
        expect(request.request.body.remember).toBe(true);
        request.flush({ code: 200, message: 'ok', data: { access_token: 'a', expires_in: 900, session_id: 's', refresh_transport: 'body', refresh_token: 'r', user: { id: 'u1', email: 'owner@shop.com', name: 'Test', role: 'Owner' } } });
        await fixture.whenStable();

        expect(JSON.parse(localStorage.getItem(Constants.AUTH_STORE_KEY) ?? '{}')).toEqual({ transport: 'body', refresh_token: 'r', session_id: 's', remember: true });
    });

    it('asks the person to wait when sign-in is throttled', async () => {
        const { fixture, cmp } = await render();
        cmp.form.setValue({ email: 'owner@shop.com', password: 'secret', remember: true });
        cmp.handleSubmit();

        TestBed.inject(HttpTestingController)
            .expectOne((r) => r.url.includes(APIEndpoint.SIGN_IN))
            .flush({ message: 'Too many sign-in attempts.' }, { status: 429, statusText: 'Too Many Requests' });
        await fixture.whenStable();

        expect(cmp.failureKey()).toBe('auth.errThrottled');
    });

    it('raises a failure through the message service, not an inline alert', async () => {
        const { fixture, cmp, el } = await render();
        const message = TestBed.inject(NzMessageService);
        const errors: string[] = [];
        vi.spyOn(message, 'error').mockImplementation(((text: string) => {
            errors.push(text);
            return { messageId: 'x' };
        }) as never);

        cmp.form.setValue({ email: 'owner@shop.com', password: 'wrong', remember: true });
        cmp.handleSubmit();
        TestBed.inject(HttpTestingController)
            .expectOne((r) => r.url.includes(APIEndpoint.SIGN_IN))
            .flush({}, { status: 401, statusText: 'Unauthorized' });
        await fixture.whenStable();

        expect(errors.length).toBe(1);
        expect(el.querySelector('.login__alert')).toBeNull();
        // The toast fades, so the fields must keep carrying the error state on their own.
        expect(cmp.credentialsRejected()).toBe(true);
    });

    it('on a wrong password clears the password and keeps the email', async () => {
        const { fixture, cmp } = await render();
        cmp.form.setValue({ email: 'owner@shop.com', password: 'wrong', remember: true });
        cmp.handleSubmit();

        const http = TestBed.inject(HttpTestingController);
        http.expectOne((r) => r.url.includes(APIEndpoint.SIGN_IN)).flush({ message: 'nope' }, { status: 401, statusText: 'Unauthorized' });
        await fixture.whenStable();

        expect(cmp.failureKey()).toBe('auth.errBadCredentials');
        expect(cmp.form.controls.email.value).toBe('owner@shop.com');
        expect(cmp.form.controls.password.value).toBe('');

        // The cleared field must be reported as empty on a second submit, or the form silently
        // refuses to send with nothing on screen explaining why.
        cmp.handleSubmit();
        await fixture.whenStable();
        expect(cmp.passwordError()).toBe('auth.errPasswordRequired');
    });

    it('distinguishes an unreachable server from bad credentials', async () => {
        const { fixture, cmp } = await render();
        cmp.form.setValue({ email: 'owner@shop.com', password: 'secret', remember: true });
        cmp.handleSubmit();

        const http = TestBed.inject(HttpTestingController);
        http.expectOne((r) => r.url.includes(APIEndpoint.SIGN_IN)).error(new ProgressEvent('error'), { status: 0 });
        await fixture.whenStable();

        expect(cmp.failureKey()).toBe('auth.errNetwork');
    });

    describe('a guest visit', () => {
        const isGuest = (r: { url: string }) => r.url.endsWith(APIEndpoint.GUEST_SIGN_IN);

        it('offers the guest visit only in a build that has it, asking the server nothing to decide', async () => {
            const { el } = await render();
            expect(el.querySelector('[data-login="guest"]')).toBeTruthy();
            TestBed.inject(HttpTestingController).expectNone(isGuest);

            const kept = environment.guestAccess;
            (environment as { guestAccess: boolean }).guestAccess = false;
            const off = await render();
            expect(off.el.querySelector('[data-login="guest"]')).toBeNull();
            (environment as { guestAccess: boolean }).guestAccess = kept;
        });

        it('signs a guest in with one press, greets them by name and opens the app', async () => {
            const { cmp } = await render();
            const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
            const success = vi.spyOn(TestBed.inject(NzMessageService), 'success');

            cmp.continueAsGuest();
            expect(cmp.guestLoading()).toBe(true);
            const request = TestBed.inject(HttpTestingController).expectOne(isGuest);
            expect(request.request.withCredentials).toBe(true);
            request.flush({ code: 200, message: 'ok', data: { access_token: 'a', expires_in: 900, session_id: 's', refresh_transport: 'body', refresh_token: 'r', user: { id: 'g1', email: 'guest-1@guest.invalid', name: 'Rizz Rickshaw', role: 'Guest' }, guest: { hours: 24 } } });

            expect(success).toHaveBeenCalledWith('auth.guest.welcome', expect.anything());
            expect(navigate).toHaveBeenCalledWith(Constants.APP_ROUTE);
        });

        it('says what to do when a guest visit is refused, and the button asks again', async () => {
            const { cmp } = await render();
            const http = TestBed.inject(HttpTestingController);

            cmp.continueAsGuest();
            http.expectOne(isGuest).flush({ code: 429 }, { status: 429, statusText: 'Too Many Requests' });
            expect(cmp.guestFailureKey()).toBe('auth.guest.errThrottled');
            expect(cmp.guestLoading()).toBe(false);

            cmp.continueAsGuest();
            http.expectOne(isGuest).flush({ code: 503 }, { status: 503, statusText: 'Service Unavailable' });
            expect(cmp.guestFailureKey()).toBe('auth.guest.errUnavailable');

            cmp.continueAsGuest();
            http.expectOne(isGuest).error(new ProgressEvent('error'));
            expect(cmp.guestFailureKey()).toBe('auth.errNetwork');
        });
    });
});
