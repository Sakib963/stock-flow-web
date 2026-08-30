import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideNzI18n, en_US } from 'ng-zorro-antd/i18n';
import { provideTranslateService } from '@ngx-translate/core';
import { NzMessageService } from 'ng-zorro-antd/message';
import { LoginComponent } from './login.component';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { Constants } from '@app/core/constants/constants';

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

    it('stores tokens and keeps them on a successful sign in', async () => {
        const { fixture, cmp } = await render();
        cmp.form.setValue({ email: 'owner@shop.com', password: 'secret', remember: true });
        cmp.handleSubmit();

        const http = TestBed.inject(HttpTestingController);
        http.expectOne((r) => r.url.includes(APIEndpoint.SIGN_IN)).flush({ code: 200, message: 'ok', data: { access_token: 'a', refresh_token: 'r' } });
        await fixture.whenStable();

        expect(JSON.parse(localStorage.getItem(Constants.AUTH_STORE_KEY) ?? '{}').access_token).toBe('a');
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
});
