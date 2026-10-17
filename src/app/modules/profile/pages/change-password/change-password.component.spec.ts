import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideNzI18n, en_US } from 'ng-zorro-antd/i18n';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalRef, NzModalService } from 'ng-zorro-antd/modal';
import { of } from 'rxjs';
import { provideTranslateService } from '@ngx-translate/core';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { SessionService } from '@app/core/services/session/session.service';
import { OVERLAY_PROVIDERS } from '@app/shared/constants/overlay-providers';
import { provideRouter } from '@angular/router';
import { ChangePasswordComponent } from './change-password.component';

const open = async (answer = true) => {
    await TestBed.configureTestingModule({
        imports: [ChangePasswordComponent],
        providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), provideNzI18n(en_US), provideTranslateService({ fallbackLang: 'en' }), ...OVERLAY_PROVIDERS, { provide: SessionService, useValue: { user: () => ({ email: 'nusrat@shop.test' }), menu: () => [], can: () => true } }],
    }).compileComponents();
    const fixture = TestBed.createComponent(ChangePasswordComponent);
    const confirm = vi.spyOn(fixture.debugElement.injector.get(NzModalService), 'confirm').mockImplementation(() => ({ afterClose: of(answer) }) as unknown as NzModalRef);
    const success = vi.spyOn(fixture.debugElement.injector.get(NzMessageService), 'success');
    fixture.detectChanges();
    return { fixture, page: fixture.componentInstance, http: TestBed.inject(HttpTestingController), confirm, success };
};

const fill = (page: ChangePasswordComponent, next = 'NewPass-2026', confirm = next) => {
    page.current.set('Old-pass-1');
    page.next.set(next);
    page.confirm.set(confirm);
};

describe('ChangePasswordComponent', () => {
    it('warns before anything is sent that every other device will be signed out', async () => {
        await open();
        expect(document.querySelector('[data-password="warning"]')?.textContent).toContain('shell.password.othersSignedOut');
    });

    it('sends nothing while the new password breaks a rule or the two do not match', async () => {
        const { page, http } = await open();
        fill(page, 'short');
        page.sendCode();
        fill(page, 'NewPass-2026', 'NewPass-2027');
        page.sendCode();
        expect(page.mismatch()).toBe(true);
        http.expectNone((r) => r.url.includes(APIEndpoint.CHANGE_PASSWORD));
    });

    it('refuses the password in use now as the new one, before and after the server is asked', async () => {
        const { page, http } = await open();
        fill(page, 'Old-pass-1');
        expect(page.sameAsCurrent()).toBe(true);
        page.sendCode();
        http.expectNone((r) => r.url.includes(APIEndpoint.CHANGE_PASSWORD));

        fill(page);
        page.sendCode();
        http.expectOne((r) => r.url.includes(APIEndpoint.CHANGE_PASSWORD)).flush({ code: 400, data: { field: 'new_password' } }, { status: 400, statusText: 'Bad Request' });
        expect(page.newError()).toBe('shell.password.sameAsCurrent');
        expect(page.step()).toBe('details');
    });

    it('ticks each rule as it is met, a special character included, and grades the strength', async () => {
        const { page } = await open();
        page.next.set('newpass1');
        expect(page.rules().map((rule) => rule.met)).toEqual([true, true, true, false]);
        const weakish = page.strength().percent;
        page.next.set('New-pass-2026!');
        expect(page.rules().every((rule) => rule.met)).toBe(true);
        expect(page.strength().percent).toBeGreaterThan(weakish);
        expect(page.strength().level).toBe('strong');
    });

    it('lights the strength meter from none, to one segment for a weak password, to all four for a strong one', async () => {
        const { fixture, page } = await open();
        const lit = () => {
            fixture.detectChanges();
            return document.querySelectorAll('[data-password="strength"] [data-lit="true"]').length;
        };
        expect(lit()).toBe(0);
        page.next.set('abc');
        expect(lit()).toBe(1);
        page.next.set('New-pass-2026!');
        expect(lit()).toBe(4);
    });

    it('keeps only the digits of a pasted code', async () => {
        const { page } = await open();
        page.setCode(' 123-456 ');
        expect(page.code()).toBe('123456');
    });

    it('marks the current password when the server says it is wrong, and stays on the first step', async () => {
        const { page, http } = await open();
        fill(page);
        page.sendCode();
        http.expectOne((r) => r.url.includes(APIEndpoint.CHANGE_PASSWORD)).flush({ code: 400, data: { field: 'current_password' } }, { status: 400, statusText: 'Bad Request' });
        expect(page.currentError()).toBe('shell.password.currentWrong');
        expect(page.step()).toBe('details');
    });

    it('changes the password with the emailed code and says how many devices were signed out', async () => {
        const { page, http } = await open();
        fill(page);
        page.sendCode();
        const first = http.expectOne((r) => r.url.includes(APIEndpoint.CHANGE_PASSWORD));
        expect(first.request.body).toEqual({ current_password: 'Old-pass-1', new_password: 'NewPass-2026', confirm_password: 'NewPass-2026' });
        first.flush({ code: 200, data: { otp_oid: 'otp-1' } });
        expect(page.step()).toBe('code');

        page.code.set('12');
        page.changePassword();
        expect(page.codeError()).toBe('shell.password.codeShape');

        page.code.set('654321');
        page.changePassword();
        const second = http.expectOne((r) => r.url.includes(APIEndpoint.VERIFY_PASSWORD_CHANGE));
        expect(second.request.body).toEqual({ otp_oid: 'otp-1', otp: '654321', new_password: 'NewPass-2026' });
        second.flush({ code: 200, data: { sessions_closed: 2 } });
        expect(page.step()).toBe('done');
        expect(page.sessionsClosed()).toBe(2);
    });

    it('tells a wrong code from an expired one and from too many tries', async () => {
        const { page, http } = await open();
        fill(page);
        page.sendCode();
        http.expectOne((r) => r.url.includes(APIEndpoint.CHANGE_PASSWORD)).flush({ code: 200, data: { otp_oid: 'otp-1' } });
        const answer = (status: number) => {
            page.code.set('111111');
            page.changePassword();
            http.expectOne((r) => r.url.includes(APIEndpoint.VERIFY_PASSWORD_CHANGE)).flush({ code: status }, { status, statusText: 'x' });
        };
        answer(400);
        expect(page.codeError()).toBe('shell.password.codeWrong');
        answer(404);
        expect(page.stepError()).toBe('shell.password.codeExpired');
        answer(429);
        expect(page.stepError()).toBe('shell.password.codeTooMany');
    });

    it('asks before emailing the code, and sends nothing when the answer is no', async () => {
        const { page, http, confirm } = await open(false);
        fill(page);
        page.sendCode();
        expect(confirm).toHaveBeenCalledTimes(1);
        http.expectNone((r) => r.url.includes(APIEndpoint.CHANGE_PASSWORD));
        expect(page.step()).toBe('details');
    });

    it('asks before changing the password, and changes nothing when the answer is no', async () => {
        const { page, http, confirm } = await open();
        fill(page);
        page.sendCode();
        http.expectOne((r) => r.url.includes(APIEndpoint.CHANGE_PASSWORD)).flush({ code: 200, data: { otp_oid: 'otp-1' } });
        confirm.mockImplementation(() => ({ afterClose: of(undefined) }) as unknown as NzModalRef);
        page.code.set('654321');
        page.changePassword();
        expect(confirm).toHaveBeenCalledTimes(2);
        http.expectNone((r) => r.url.includes(APIEndpoint.VERIFY_PASSWORD_CHANGE));
        expect(page.step()).toBe('code');
    });

    it('waits a minute before a new code, then sends one without asking again and says so', async () => {
        vi.useFakeTimers();
        try {
            const { page, http, confirm, success } = await open();
            fill(page);
            page.sendCode();
            http.expectOne((r) => r.url.includes(APIEndpoint.CHANGE_PASSWORD)).flush({ code: 200, data: { otp_oid: 'otp-1' } });
            expect(page.resendIn()).toBe(60);
            page.sendAgain();
            http.expectNone((r) => r.url.includes(APIEndpoint.CHANGE_PASSWORD));

            vi.advanceTimersByTime(60_000);
            expect(page.resendIn()).toBe(0);
            page.sendAgain();
            http.expectOne((r) => r.url.includes(APIEndpoint.CHANGE_PASSWORD)).flush({ code: 200, data: { otp_oid: 'otp-2' } });
            expect(confirm).toHaveBeenCalledTimes(1);
            expect(success).toHaveBeenCalledWith('shell.password.codeResent');
            expect(page.resendIn()).toBe(60);

            page.code.set('654321');
            page.changePassword();
            expect(http.expectOne((r) => r.url.includes(APIEndpoint.VERIFY_PASSWORD_CHANGE)).request.body.otp_oid).toBe('otp-2');
        } finally {
            vi.useRealTimers();
        }
    });

    it('says to wait when the server refuses another code, and goes back to the password when it no longer matches', async () => {
        vi.useFakeTimers();
        try {
            const { page, http } = await open();
            fill(page);
            page.sendCode();
            http.expectOne((r) => r.url.includes(APIEndpoint.CHANGE_PASSWORD)).flush({ code: 200, data: { otp_oid: 'otp-1' } });

            vi.advanceTimersByTime(60_000);
            page.sendAgain();
            http.expectOne((r) => r.url.includes(APIEndpoint.CHANGE_PASSWORD)).flush({ code: 429 }, { status: 429, statusText: 'Too Many Requests' });
            expect(page.stepError()).toBe('shell.password.sendTooMany');
            expect(page.step()).toBe('code');

            page.sendAgain();
            http.expectOne((r) => r.url.includes(APIEndpoint.CHANGE_PASSWORD)).flush({ code: 400, data: { field: 'current_password' } }, { status: 400, statusText: 'Bad Request' });
            expect(page.step()).toBe('details');
            expect(page.currentError()).toBe('shell.password.currentWrong');
        } finally {
            vi.useRealTimers();
        }
    });
});
