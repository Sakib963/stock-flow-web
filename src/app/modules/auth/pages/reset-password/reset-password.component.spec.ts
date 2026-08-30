import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideNzI18n, en_US } from 'ng-zorro-antd/i18n';
import { provideTranslateService } from '@ngx-translate/core';
import { NzMessageService } from 'ng-zorro-antd/message';
import { ForgotPasswordComponent } from '../forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './reset-password.component';
import { RecoveryService } from '@app/modules/auth/services/recovery.service';
import { APIEndpoint } from '@app/core/constants/api-endpoint';

const EMAIL = 'owner@yourshop.com';

describe('Password recovery', () => {
    beforeEach(async () => {
        sessionStorage.clear();
        await TestBed.configureTestingModule({
            imports: [ForgotPasswordComponent, ResetPasswordComponent],
            providers: [
                provideRouter([
                    { path: 'auth/forgot-password', children: [] },
                    { path: 'auth/reset-password', children: [] },
                    { path: 'auth/reset-password/done', children: [] },
                ]),
                provideHttpClient(),
                provideHttpClientTesting(),
                provideNzI18n(en_US),
                provideTranslateService({ fallbackLang: 'en' }),
            ],
        }).compileComponents();
    });

    afterEach(() => sessionStorage.clear());

    describe('request a code', () => {
        async function render() {
            const fixture = TestBed.createComponent(ForgotPasswordComponent);
            await fixture.whenStable();
            return { fixture, cmp: fixture.componentInstance };
        }

        it('does not call the API for a malformed email', async () => {
            const { fixture, cmp } = await render();
            cmp.form.controls.email.setValue('not-an-email');
            cmp.handleSubmit();
            await fixture.whenStable();

            expect(cmp.emailError()).toBe('auth.errEmailInvalid');
            TestBed.inject(HttpTestingController).expectNone(() => true);
        });

        it('advances on success', async () => {
            const { fixture, cmp } = await render();
            const router = TestBed.inject(Router);
            const spy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

            cmp.form.controls.email.setValue(EMAIL);
            cmp.handleSubmit();
            TestBed.inject(HttpTestingController)
                .expectOne((r) => r.url.includes(APIEndpoint.FORGOT_PASSWORD))
                .flush({ code: 200, data: { sent: true, expires_at: new Date(Date.now() + 900000).toISOString() } });
            await fixture.whenStable();

            expect(spy.mock.calls[0][0]).toEqual(['/auth/reset-password']);
        });

        it('stops on an unknown address and says so, rather than sending the user to wait', async () => {
            const { fixture, cmp } = await render();
            const spy = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

            cmp.form.controls.email.setValue(EMAIL);
            cmp.handleSubmit();
            TestBed.inject(HttpTestingController)
                .expectOne((r) => r.url.includes(APIEndpoint.FORGOT_PASSWORD))
                .flush({ code: 404, message: 'No account found' }, { status: 404, statusText: 'Not Found' });
            await fixture.whenStable();

            expect(cmp.emailError()).toBe('auth.reset.errNoAccount');
            expect(spy).not.toHaveBeenCalled();
        });

        it('raises the unknown address as a toast as well as inline', async () => {
            const { fixture, cmp } = await render();
            vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
            const errors: string[] = [];
            vi.spyOn(TestBed.inject(NzMessageService), 'error').mockImplementation(((text: string) => {
                errors.push(text);
                return { messageId: 'x' };
            }) as never);

            cmp.form.controls.email.setValue(EMAIL);
            cmp.handleSubmit();
            TestBed.inject(HttpTestingController)
                .expectOne((r) => r.url.includes(APIEndpoint.FORGOT_PASSWORD))
                .flush({}, { status: 404, statusText: 'Not Found' });
            await fixture.whenStable();

            expect(errors.length).toBe(1);
            expect(cmp.emailError()).toBe('auth.reset.errNoAccount');
        });

        it('clears the unknown-address message as soon as the address is edited', async () => {
            const { fixture, cmp } = await render();
            vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

            cmp.form.controls.email.setValue(EMAIL);
            cmp.handleSubmit();
            TestBed.inject(HttpTestingController)
                .expectOne((r) => r.url.includes(APIEndpoint.FORGOT_PASSWORD))
                .flush({}, { status: 404, statusText: 'Not Found' });
            await fixture.whenStable();
            expect(cmp.emailError()).toBe('auth.reset.errNoAccount');

            cmp.form.controls.email.setValue('owner@othershop.com');
            await fixture.whenStable();
            expect(cmp.emailError()).toBeNull();
        });
    });

    describe('enter the code and set a password', () => {
        async function render() {
            // The screen normally receives these from the request step.
            TestBed.inject(RecoveryService).session.set({ email: EMAIL, expiresAt: new Date(Date.now() + 900000).toISOString(), lastSentAt: Date.now() });
            const fixture = TestBed.createComponent(ResetPasswordComponent);
            await fixture.whenStable();
            return { fixture, cmp: fixture.componentInstance, el: fixture.nativeElement as HTMLElement };
        }

        it('ticks the rules off as the password is typed', async () => {
            const { fixture, cmp } = await render();
            expect(cmp.rules().every((r) => !r.met)).toBe(true);

            cmp.form.controls.password.setValue('abcdefgh');
            await fixture.whenStable();
            expect(cmp.rules().map((r) => r.met)).toEqual([true, true, false]);

            cmp.form.controls.password.setValue('abcdefg1');
            await fixture.whenStable();
            expect(cmp.passwordValid()).toBe(true);
        });

        it('stays quiet about a mismatch until the confirm field is left', async () => {
            const { fixture, cmp } = await render();
            cmp.form.controls.password.setValue('abcdefg1');
            cmp.form.controls.confirm.setValue('abc');
            await fixture.whenStable();
            expect(cmp.confirmError()).toBeNull();

            cmp.onConfirmBlur();
            await fixture.whenStable();
            expect(cmp.confirmError()).toBe('auth.reset.errMismatch');
        });

        it('strips non-digits so a pasted code still works', async () => {
            const { fixture, cmp, el } = await render();
            const input = el.querySelector('#reset-code') as HTMLInputElement;
            input.value = '12 34-56';
            cmp.onCodeInput({ target: input } as unknown as Event);
            await fixture.whenStable();
            expect(cmp.form.controls.code.value).toBe('123456');
        });

        it('keeps the typed passwords when the code is rejected', async () => {
            const { fixture, cmp } = await render();
            cmp.form.setValue({ code: '123456', password: 'abcdefg1', confirm: 'abcdefg1' });
            cmp.handleSubmit();

            TestBed.inject(HttpTestingController)
                .expectOne((r) => r.url.includes(APIEndpoint.RESET_PASSWORD))
                .flush({ message: 'That code is not right. Check the email and try again.' }, { status: 404, statusText: 'Not Found' });
            await fixture.whenStable();

            expect(cmp.codeError()).toBe('auth.reset.errCodeWrong');
            // The whole reason the code and the password share a screen.
            expect(cmp.form.controls.password.value).toBe('abcdefg1');
            expect(cmp.form.controls.confirm.value).toBe('abcdefg1');
        });

        it('separates an expired code from a wrong one', async () => {
            const { fixture, cmp } = await render();
            cmp.form.setValue({ code: '123456', password: 'abcdefg1', confirm: 'abcdefg1' });
            cmp.handleSubmit();

            TestBed.inject(HttpTestingController)
                .expectOne((r) => r.url.includes(APIEndpoint.RESET_PASSWORD))
                .flush({ message: 'That code has expired. Send a new one.' }, { status: 404, statusText: 'Not Found' });
            await fixture.whenStable();

            expect(cmp.codeError()).toBe('auth.reset.errCodeExpired');
        });

        it('locks the code field after too many wrong codes', async () => {
            const { fixture, cmp } = await render();
            cmp.form.setValue({ code: '123456', password: 'abcdefg1', confirm: 'abcdefg1' });
            cmp.handleSubmit();

            TestBed.inject(HttpTestingController)
                .expectOne((r) => r.url.includes(APIEndpoint.RESET_PASSWORD))
                .flush({ message: 'Too many incorrect codes. Start again to get a new one.' }, { status: 429, statusText: 'Too Many Requests' });
            await fixture.whenStable();

            expect(cmp.locked()).toBe(true);
            expect(cmp.codeError()).toBe('auth.reset.errLocked');
        });

        it('clears the recovery session on success so a back-navigation cannot resubmit', async () => {
            const { fixture, cmp } = await render();
            const recovery = TestBed.inject(RecoveryService);
            vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

            cmp.form.setValue({ code: '123456', password: 'abcdefg1', confirm: 'abcdefg1' });
            cmp.handleSubmit();
            TestBed.inject(HttpTestingController)
                .expectOne((r) => r.url.includes(APIEndpoint.RESET_PASSWORD))
                .flush({ code: 200, message: 'ok' });
            await fixture.whenStable();

            expect(recovery.session()).toBeNull();
        });
    });
});
