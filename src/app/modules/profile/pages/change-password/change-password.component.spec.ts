import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideNzI18n, en_US } from 'ng-zorro-antd/i18n';
import { provideTranslateService } from '@ngx-translate/core';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { SessionService } from '@app/core/services/session/session.service';
import { OVERLAY_PROVIDERS } from '@app/shared/constants/overlay-providers';
import { PasswordDialogComponent } from './password-dialog.component';

const open = async () => {
    await TestBed.configureTestingModule({
        imports: [PasswordDialogComponent],
        providers: [provideHttpClient(), provideHttpClientTesting(), provideNzI18n(en_US), provideTranslateService({ fallbackLang: 'en' }), ...OVERLAY_PROVIDERS, { provide: SessionService, useValue: { user: () => ({ email: 'nusrat@shop.test' }) } }],
    }).compileComponents();
    const fixture = TestBed.createComponent(PasswordDialogComponent);
    fixture.detectChanges();
    return { fixture, page: fixture.componentInstance, http: TestBed.inject(HttpTestingController) };
};

const fill = (page: PasswordDialogComponent, next = 'NewPass2026', confirm = next) => {
    page.current.set('Old-pass-1');
    page.next.set(next);
    page.confirm.set(confirm);
};

describe('PasswordDialogComponent', () => {
    it('warns before anything is sent that every other device will be signed out', async () => {
        await open();
        expect(document.querySelector('[data-password="warning"]')?.textContent).toContain('shell.password.othersSignedOut');
    });

    it('sends nothing while the new password breaks a rule or the two do not match', async () => {
        const { page, http } = await open();
        fill(page, 'short');
        page.sendCode();
        fill(page, 'NewPass2026', 'NewPass2027');
        page.sendCode();
        expect(page.mismatch()).toBe(true);
        http.expectNone((r) => r.url.includes(APIEndpoint.CHANGE_PASSWORD));
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
        expect(first.request.body).toEqual({ current_password: 'Old-pass-1', new_password: 'NewPass2026', confirm_password: 'NewPass2026' });
        first.flush({ code: 200, data: { otp_oid: 'otp-1' } });
        expect(page.step()).toBe('code');

        page.code.set('12');
        page.changePassword();
        expect(page.codeError()).toBe('shell.password.codeShape');

        page.code.set('654321');
        page.changePassword();
        const second = http.expectOne((r) => r.url.includes(APIEndpoint.VERIFY_PASSWORD_CHANGE));
        expect(second.request.body).toEqual({ otp_oid: 'otp-1', otp: '654321', new_password: 'NewPass2026' });
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
});
