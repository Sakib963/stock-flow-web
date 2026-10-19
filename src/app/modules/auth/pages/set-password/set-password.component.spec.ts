import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { provideNzI18n, en_US } from 'ng-zorro-antd/i18n';
import { provideTranslateService } from '@ngx-translate/core';
import { SessionService } from '@app/core/services/session/session.service';
import { SetPasswordComponent } from './set-password.component';

const open = async () => {
    await TestBed.configureTestingModule({
        imports: [SetPasswordComponent],
        providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), provideNzI18n(en_US), provideTranslateService({ fallbackLang: 'en' })],
    }).compileComponents();
    const fixture = TestBed.createComponent(SetPasswordComponent);
    fixture.detectChanges();
    return fixture;
};

const sent = () => TestBed.inject(HttpTestingController).match((r) => r.url.endsWith('/set-first-password'));

describe('SetPasswordComponent', () => {
    it('sends nothing until the temporary password is typed and the new one meets every rule and differs from it', async () => {
        const page = (await open()).componentInstance;
        page.form.setValue({ current: '', password: 'Mine-2026!', confirm: 'Mine-2026!' });
        page.submit();
        page.form.setValue({ current: 'Welcome-2026', password: 'Welcome-2026', confirm: 'Welcome-2026' });
        page.submit();
        page.form.setValue({ current: 'Welcome-2026', password: 'short', confirm: 'short' });
        page.submit();
        page.form.setValue({ current: 'Welcome-2026', password: 'Mine-2026!', confirm: 'Mine-2026?' });
        page.submit();
        expect(sent().length).toBe(0);
        expect(page.sameAsCurrent()).toBe(false);
        expect(page.confirmError()).toBe('auth.setPassword.mismatch');
    });

    it('sets the password, clears the block and opens the app', async () => {
        const fixture = await open();
        const page = fixture.componentInstance;
        const updateUser = vi.spyOn(TestBed.inject(SessionService), 'updateUser');
        const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
        page.form.setValue({ current: 'Welcome-2026', password: 'Mine-2026!', confirm: 'Mine-2026!' });
        page.submit();
        const [request] = sent();
        expect(request.request.body).toEqual({ current_password: 'Welcome-2026', new_password: 'Mine-2026!' });
        expect(page.saving()).toBe(true);
        request.flush({ code: 200 });
        expect(updateUser).toHaveBeenCalledWith({ mustChangePassword: false });
        expect(navigate).toHaveBeenCalledWith('/app');
    });

    it('marks a wrong temporary password under its own field and keeps what was typed', async () => {
        const page = (await open()).componentInstance;
        page.form.setValue({ current: 'Wrong-2026', password: 'Mine-2026!', confirm: 'Mine-2026!' });
        page.submit();
        sent()[0].flush({ code: 400, data: { field: 'current_password' } }, { status: 400, statusText: 'Bad Request' });
        expect(page.currentError()).toBe('auth.setPassword.wrongTemporary');
        expect(page.form.getRawValue().password).toBe('Mine-2026!');
    });
});
