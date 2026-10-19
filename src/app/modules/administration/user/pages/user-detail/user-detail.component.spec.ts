import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { provideNzI18n, en_US } from 'ng-zorro-antd/i18n';
import { provideTranslateService } from '@ngx-translate/core';
import { User, UserDetails } from '@app/core/models/user.model';
import { SessionService } from '@app/core/services/session/session.service';
import { OVERLAY_PROVIDERS } from '@app/shared/constants/overlay-providers';
import { UserDetailComponent } from './user-detail.component';

const USER: User = {
    oid: 'u-1',
    name: 'Rahim Uddin',
    email: 'rahim@example.com',
    mobile_number: '01712345678',
    designation: 'Counter salesman',
    photo: null,
    status: 'Active',
    must_change_password: false,
    role_oid: 'r-1',
    role_name: 'Counter',
    version: '2026-10-19T06:00:00.000000',
    last_sign_in_on: '2026-10-19T05:00:00Z',
    created_on: '2026-10-01T05:00:00Z',
    self: false,
    within_reach: true,
    last_owner: false,
};

const SESSION = { id: 's-1', device: { browser: 'Chrome', os: 'Windows', type: 'desktop' as const }, ip_address: '10.0.0.4', signed_in_on: '2026-10-19T05:00:00Z', last_used_on: '2026-10-19T05:30:00Z' };

const open = async (details: Partial<User> = {}, sessions = [SESSION]) => {
    await TestBed.configureTestingModule({
        imports: [UserDetailComponent],
        providers: [...OVERLAY_PROVIDERS, provideRouter([]), provideHttpClient(), provideHttpClientTesting(), provideNzI18n(en_US), provideTranslateService({ fallbackLang: 'en' }), { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ oid: 'u-1' }) } } }],
    }).compileComponents();
    vi.spyOn(TestBed.inject(SessionService), 'can').mockReturnValue(true);
    const fixture = TestBed.createComponent(UserDetailComponent);
    fixture.detectChanges();
    const data: UserDetails = { details: { ...USER, ...details }, access: { features: [], actions: [] }, sessions, activity: [] };
    TestBed.inject(HttpTestingController)
        .expectOne((r) => r.url.endsWith('/get-user-details/u-1'))
        .flush({ data });
    fixture.detectChanges();
    return fixture;
};

const button = (host: HTMLElement, role: string) => host.querySelector<HTMLButtonElement>(`[data-role="${role}"]`);

describe('UserDetailComponent', () => {
    it('offers every quick action with its icon, and lists the devices', async () => {
        const host: HTMLElement = (await open()).nativeElement;
        for (const role of ['status', 'sign-out', 'delete']) {
            expect(button(host, role)?.disabled).toBe(false);
            expect(button(host, role)?.querySelector('ng-icon svg, ng-icon')).not.toBeNull();
        }
        expect(host.querySelectorAll('[data-session]').length).toBe(1);
        expect(host.querySelector('[data-session]')?.textContent).not.toContain('[object Object]');
    });

    it('disables turning off and deleting your own account, with the reason', async () => {
        const host: HTMLElement = (await open({ self: true })).nativeElement;
        expect(button(host, 'status')?.disabled).toBe(true);
        expect(button(host, 'delete')?.disabled).toBe(true);
        expect(host.querySelector('[data-role="status-reason"]')).not.toBeNull();
        expect(host.querySelector('[data-role="delete-reason"]')).not.toBeNull();
    });

    it('disables signing out everywhere when no device is signed in', async () => {
        const host: HTMLElement = (await open({}, [])).nativeElement;
        expect(button(host, 'sign-out')?.disabled).toBe(true);
        expect(host.querySelector('[data-role="sign-out-reason"]')).not.toBeNull();
    });

    it('offers nothing to change on someone whose role reaches past the viewer, and says why', async () => {
        const host: HTMLElement = (await open({ within_reach: false })).nativeElement;
        expect(button(host, 'edit')).toBeNull();
        expect(button(host, 'status')).toBeNull();
        expect(host.querySelector('[data-role="locked-note"]')).not.toBeNull();
    });

    it('spins the pressed action and disables the others while it runs', async () => {
        const fixture = await open();
        fixture.componentInstance.pending.set('sign-out');
        fixture.detectChanges();
        const host: HTMLElement = fixture.nativeElement;
        expect(button(host, 'sign-out')?.classList.contains('ant-btn-loading')).toBe(true);
        expect(button(host, 'status')?.disabled).toBe(true);
        expect(button(host, 'delete')?.disabled).toBe(true);
        expect(button(host, 'edit')?.disabled).toBe(true);
    });
});
