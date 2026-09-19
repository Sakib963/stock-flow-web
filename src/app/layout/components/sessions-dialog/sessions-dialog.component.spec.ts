import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideNzI18n, en_US } from 'ng-zorro-antd/i18n';
import { NzMessageService } from 'ng-zorro-antd/message';
import { provideTranslateService } from '@ngx-translate/core';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { ActiveSession } from '@app/core/models/auth.model';
import { LanguageService } from '@app/core/services/language/language.service';
import { SessionsDialogComponent } from './sessions-dialog.component';

const minutesAgo = (n: number) => new Date(Date.now() - n * 60_000).toISOString();

const here: ActiveSession = { id: 'session-here', current: true, device: { browser: 'Chrome', os: 'Windows', type: 'desktop' }, ip_address: '103.4.145.2', remember: true, signed_in_on: minutesAgo(90), last_used_on: minutesAgo(1) };
const phone: ActiveSession = { id: 'session-phone', current: false, device: { browser: 'Safari', os: 'iOS', type: 'phone' }, ip_address: null, remember: false, signed_in_on: minutesAgo(3000), last_used_on: minutesAgo(45) };

describe('SessionsDialogComponent', () => {
    let http: HttpTestingController;
    let message: NzMessageService;

    beforeEach(async () => {
        localStorage.clear();
        await TestBed.configureTestingModule({
            imports: [SessionsDialogComponent],
            providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), provideNzI18n(en_US), provideTranslateService({ fallbackLang: 'en' })],
        }).compileComponents();
        http = TestBed.inject(HttpTestingController);
        message = TestBed.inject(NzMessageService);
        vi.spyOn(message, 'success').mockImplementation((() => ({ messageId: 'x' })) as never);
        vi.spyOn(message, 'error').mockImplementation((() => ({ messageId: 'x' })) as never);
    });

    afterEach(() => localStorage.clear());

    async function open(sessions: ActiveSession[] | 'fail' = [here, phone]) {
        const fixture = TestBed.createComponent(SessionsDialogComponent);
        const request = http.expectOne((r) => r.url.includes(APIEndpoint.GET_SESSIONS));
        if (sessions === 'fail') request.flush({}, { status: 500, statusText: 'Server Error' });
        else request.flush({ code: 200, data: sessions });
        fixture.detectChanges();
        await fixture.whenStable();
        return { fixture, cmp: fixture.componentInstance };
    }

    it('lists this device first and marks it, with the sign-out button only on the others', async () => {
        const { cmp } = await open([phone, here].reverse());

        expect(cmp.rows().map((row) => row.id)).toEqual(['session-here', 'session-phone']);

        const items = document.querySelectorAll('[data-session]');
        expect(items.length).toBe(2);
        expect(items[0].querySelector('nz-tag')).not.toBeNull();
        expect(items[0].querySelector('button')).toBeNull();
        expect(items[1].querySelector('button')).not.toBeNull();
    });

    /** In the body, the title sat below the close icon instead of level with it. */
    it('puts the title in the modal header and the actions in its footer', async () => {
        await open();

        expect(document.querySelector('.ant-modal-header')?.textContent).toContain('shell.sessions.title');
        expect(document.querySelector('.ant-modal-body')?.textContent).not.toContain('shell.sessions.title');
        expect(document.querySelector('.ant-modal-footer [data-sessions="footer"]')).not.toBeNull();
    });

    it('names each device the way a person recognises it', async () => {
        const { cmp } = await open([here, { ...phone, device: { browser: null, os: null, type: 'tablet' } }]);
        const [first, second] = cmp.rows();

        expect(first.label).toEqual({ key: 'shell.sessions.browserOn', params: { browser: 'Chrome', os: 'Windows' } });
        expect(first.icon).toBe('lucideMonitor');
        expect(first.lastActive).toBe('1 minute ago');
        expect(second.label.key).toBe('shell.sessions.unknownDevice');
        expect(second.icon).toBe('lucideTablet');
    });

    it('writes times in the language the app is in', async () => {
        const { cmp } = await open();

        TestBed.inject(LanguageService).use('bn');

        expect(cmp.rows()[0].lastActive).toMatch(/মিনিট/);
    });

    it('signs out another device and takes it off the list', async () => {
        const { cmp } = await open();

        cmp.signOutDevice(phone);
        const request = http.expectOne((r) => r.url.includes(APIEndpoint.SIGN_OUT_SESSION));
        expect(request.request.body).toEqual({ session_id: 'session-phone' });
        expect(cmp.busy()).toBe('session-phone');
        request.flush({ code: 200, data: { session_id: 'session-phone' } });

        expect(cmp.rows().map((row) => row.id)).toEqual(['session-here']);
        expect(cmp.hasOthers()).toBe(false);
        expect(cmp.busy()).toBeNull();
        expect(message.success).toHaveBeenCalled();
    });

    /** Signed out somewhere else in the meantime is what the person wanted anyway. */
    it('treats a device that is already gone as done', async () => {
        const { cmp } = await open();

        cmp.signOutDevice(phone);
        http.expectOne((r) => r.url.includes(APIEndpoint.SIGN_OUT_SESSION)).flush({ code: 404 }, { status: 404, statusText: 'Not Found' });

        expect(cmp.rows().map((row) => row.id)).toEqual(['session-here']);
        expect(message.error).not.toHaveBeenCalled();
    });

    it('keeps the device on the list and says so when signing it out fails', async () => {
        const { cmp } = await open();

        cmp.signOutDevice(phone);
        http.expectOne((r) => r.url.includes(APIEndpoint.SIGN_OUT_SESSION)).error(new ProgressEvent('error'), { status: 0 });

        expect(cmp.rows().length).toBe(2);
        expect(message.error).toHaveBeenCalled();
        expect(cmp.busy()).toBeNull();
    });

    it('signs out every other device and keeps this one', async () => {
        const { cmp } = await open([here, phone, { ...phone, id: 'session-laptop' }]);

        cmp.signOutOthers();
        const request = http.expectOne((r) => r.url.includes(APIEndpoint.SIGN_OUT_EVERYWHERE));
        expect(request.request.body).toEqual({ keep_current: true });
        request.flush({ code: 200, data: { sessions_closed: 2 } });

        expect(cmp.rows().map((row) => row.id)).toEqual(['session-here']);
    });

    it('offers to try again when the list cannot be loaded', async () => {
        const { cmp } = await open('fail');
        expect(cmp.failed()).toBe(true);

        cmp.load();
        http.expectOne((r) => r.url.includes(APIEndpoint.GET_SESSIONS)).flush({ code: 200, data: [here, phone] });

        expect(cmp.failed()).toBe(false);
        expect(cmp.rows().length).toBe(2);
    });
});
