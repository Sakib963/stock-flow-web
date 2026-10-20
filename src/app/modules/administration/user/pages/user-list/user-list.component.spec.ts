import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideNzI18n, en_US } from 'ng-zorro-antd/i18n';
import { provideTranslateService } from '@ngx-translate/core';
import { OVERLAY_PROVIDERS } from '@app/shared/constants/overlay-providers';
import { USER_LIST } from '@app/modules/administration/user/config/user-list.config';
import { UserListComponent } from './user-list.component';

const open = async () => {
    await TestBed.configureTestingModule({
        imports: [UserListComponent],
        providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), provideNzI18n(en_US), provideTranslateService({ fallbackLang: 'en' }), ...OVERLAY_PROVIDERS],
    }).compileComponents();
    const fixture = TestBed.createComponent(UserListComponent);
    fixture.detectChanges();
    return fixture;
};

const ok = () => document.querySelector<HTMLButtonElement>('[data-confirm="ok"]');

describe('UserListComponent', () => {
    it('asks before signing everyone out, with the sign-out icon, and sends it only when confirmed', async () => {
        const fixture = await open();
        const action = USER_LIST.header!.actions!.find((a) => a.key === 'sign-out-everyone')!;
        fixture.componentInstance.onAction({ action, rows: [] });
        fixture.detectChanges();
        await fixture.whenStable();
        const http = TestBed.inject(HttpTestingController);
        expect(ok()?.querySelector('ng-icon svg'), 'the icon is drawn').not.toBeNull();
        http.expectNone((r) => r.url.endsWith('/sign-out-everyone'));

        ok()!.click();
        fixture.detectChanges();
        const request = http.expectOne((r) => r.url.endsWith('/sign-out-everyone'));
        expect(ok()?.disabled || ok()?.classList.contains('ant-btn-loading')).toBe(true);
        request.flush({ data: { people: 3, devices: 5 } });
    });
});
