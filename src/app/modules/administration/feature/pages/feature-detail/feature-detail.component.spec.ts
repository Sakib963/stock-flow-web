import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { provideNzI18n, en_US } from 'ng-zorro-antd/i18n';
import { TranslateService, provideTranslateService } from '@ngx-translate/core';
import { Feature, FeatureDetails } from '@app/core/models/feature.model';
import { SessionService } from '@app/core/services/session/session.service';
import { FeatureDetailComponent } from './feature-detail.component';

const FEATURE: Feature = {
    oid: 'f-1',
    slug: 'marketing-partners',
    label: 'Partners',
    label_bn: 'পার্টনার',
    description_en: null,
    description_bn: null,
    tags: [],
    icon: null,
    route: '/app/marketing/partners',
    permission_code: 'marketing.partner.view',
    is_new: false,
    is_disabled: true,
    disabled_message_en: 'Being rebuilt',
    disabled_message_bn: 'নতুন করে তৈরি হচ্ছে',
    kind: 'Feature',
    state: 'Disabled',
    own_state: 'Disabled',
    locked: false,
    module_oid: 'm-1',
    module_label: 'Marketing',
    module_label_bn: 'মার্কেটিং',
    module_reason_en: null,
    module_reason_bn: null,
    created_on: '2026-10-17T06:00:00Z',
    last_action_on: '2026-10-17T06:00:00Z',
    last_action_by: 'System',
    last_action_by_name: null,
};

const open = async (details: Partial<Feature> = {}) => {
    await TestBed.configureTestingModule({
        imports: [FeatureDetailComponent],
        providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), provideNzI18n(en_US), provideTranslateService({ fallbackLang: 'en' }), { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ oid: 'f-1' }) } } }],
    }).compileComponents();
    vi.spyOn(TestBed.inject(SessionService), 'can').mockReturnValue(true);
    const fixture = TestBed.createComponent(FeatureDetailComponent);
    fixture.detectChanges();
    const data: FeatureDetails = { details: { ...FEATURE, ...details }, actions: [{ code: 'marketing.partner.view', action: 'view', roles: ['Owner'] }], features: [], activity: [] };
    TestBed.inject(HttpTestingController)
        .expectOne((r) => r.url.endsWith('/get-feature-details/f-1'))
        .flush({ data });
    fixture.detectChanges();
    return fixture;
};

const buttons = (host: HTMLElement) => [...host.querySelectorAll('[data-switch]')].map((b) => b.getAttribute('data-switch'));

describe('FeatureDetailComponent', () => {
    it('offers turning a disabled feature on or hiding it, and shows its reason', async () => {
        const host: HTMLElement = (await open()).nativeElement;
        expect(buttons(host)).toEqual(['On', 'Hidden']);
        expect(host.querySelector('[data-detail="reason"]')?.textContent).toContain('Being rebuilt');
    });

    it('never offers turning off the System module', async () => {
        const host: HTMLElement = (await open({ locked: true, state: 'On', own_state: 'On', is_disabled: false })).nativeElement;
        expect(buttons(host)).toEqual(['locked']);
    });

    it('does not disable without the reason in both languages', async () => {
        const fixture = await open({ state: 'On', own_state: 'On', is_disabled: false, disabled_message_en: null, disabled_message_bn: null });
        const page = fixture.componentInstance;
        page.openDisable();
        page.reasonForm.setValue({ reason_en: 'Being rebuilt', reason_bn: '' });
        page.toConfirm();
        expect(page.disableStep()).toBe('reason');
        TestBed.inject(HttpTestingController).expectNone((r) => r.url.endsWith('/switch-feature'));
    });
});

describe('FeatureDetailComponent switching', () => {
    afterEach(() => document.querySelectorAll('.cdk-overlay-container').forEach((overlay) => (overlay.innerHTML = '')));

    const ok = () => document.querySelector<HTMLButtonElement>('[data-confirm="ok"]');

    it('asks before turning a feature on, with the power icon, and shows the loader until the server answers', async () => {
        const fixture = await open();
        fixture.componentInstance.turnOn();
        fixture.detectChanges();
        await fixture.whenStable();
        expect(ok()?.querySelector('ng-icon svg'), 'the icon is drawn').not.toBeNull();

        ok()!.click();
        fixture.detectChanges();
        const request = TestBed.inject(HttpTestingController).expectOne((r) => r.url.endsWith('/switch-feature'));
        expect(request.request.body).toEqual({ oid: 'f-1', state: 'On' });
        expect(fixture.componentInstance.pending()).toBe('On');
        request.flush({ data: { changed: true } });
        expect(fixture.componentInstance.pending()).toBeNull();
    });

    it('asks before hiding, with the hide icon', async () => {
        const fixture = await open();
        fixture.componentInstance.hide();
        fixture.detectChanges();
        await fixture.whenStable();
        expect(ok()?.querySelector('ng-icon svg'), 'the icon is drawn').not.toBeNull();
        TestBed.inject(HttpTestingController).expectNone((r) => r.url.endsWith('/switch-feature'));
    });

    it('takes the reasons, then asks in the same dialog with them shown, and sends both with the loader on Disable', async () => {
        const fixture = await open({ state: 'On', own_state: 'On', is_disabled: false, disabled_message_en: null, disabled_message_bn: null });
        const page = fixture.componentInstance;
        page.openDisable();
        page.reasonForm.setValue({ reason_en: 'Being rebuilt', reason_bn: 'নতুন করে তৈরি হচ্ছে' });
        page.toConfirm();
        fixture.detectChanges();
        await fixture.whenStable();
        const http = TestBed.inject(HttpTestingController);
        http.expectNone((r) => r.url.endsWith('/switch-feature'));
        expect(document.querySelectorAll('.ant-modal').length, 'one dialog, never a second').toBe(1);
        expect(document.querySelector('[data-step="confirm"]')?.textContent).toContain('নতুন করে তৈরি হচ্ছে');
        const disable = document.querySelector<HTMLButtonElement>('[data-reason="disable"]')!;
        expect(disable.querySelector('ng-icon svg'), 'the icon is drawn').not.toBeNull();

        disable.click();
        fixture.detectChanges();
        const request = http.expectOne((r) => r.url.endsWith('/switch-feature'));
        expect(request.request.body).toEqual({ oid: 'f-1', state: 'Disabled', reason_en: 'Being rebuilt', reason_bn: 'নতুন করে তৈরি হচ্ছে' });
        expect(page.pending()).toBe('Disabled');
        request.flush({ data: { changed: true } });
        expect(page.disabling()).toBe(false);
    });
});

describe('FeatureDetailComponent search words', () => {
    it('shows a search word as written, even one that names a section of the copy', async () => {
        await TestBed.configureTestingModule({
            imports: [FeatureDetailComponent],
            providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), provideNzI18n(en_US), provideTranslateService({ fallbackLang: 'en' }), { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ oid: 'f-1' }) } } }],
        }).compileComponents();
        const translate = TestBed.inject(TranslateService);
        translate.setTranslation('en', { sales: { title: 'Sales' } });
        translate.use('en');
        const fixture = TestBed.createComponent(FeatureDetailComponent);
        fixture.detectChanges();
        TestBed.inject(HttpTestingController)
            .expectOne((r) => r.url.endsWith('/get-feature-details/f-1'))
            .flush({ data: { details: { ...FEATURE, tags: ['sales', 'sell'] }, actions: [], features: [], activity: [] } });
        fixture.detectChanges();
        const text = (fixture.nativeElement as HTMLElement).querySelector('[data-detail="details"]')?.textContent ?? '';
        expect(text).toContain('sales');
        expect(text).not.toContain('[object Object]');
    });
});
