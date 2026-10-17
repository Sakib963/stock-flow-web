import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { provideNzI18n, en_US } from 'ng-zorro-antd/i18n';
import { provideTranslateService } from '@ngx-translate/core';
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
        page.confirmDisable();
        TestBed.inject(HttpTestingController).expectNone((r) => r.url.endsWith('/switch-feature'));
    });
});
