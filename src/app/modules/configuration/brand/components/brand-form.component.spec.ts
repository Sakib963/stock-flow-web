import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNzI18n, en_US } from 'ng-zorro-antd/i18n';
import { provideTranslateService } from '@ngx-translate/core';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { Brand } from '@app/core/models/brand.model';
import { LanguageService } from '@app/core/services/language/language.service';
import { BrandFormComponent } from './brand-form.component';

const SAREE: Brand = { oid: 'cat-1', name: 'Saree', origin_country: 'IN', description: 'Festive', status: 'Inactive' };

const settle = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const open = async (): Promise<ComponentFixture<BrandFormComponent>> => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
        imports: [BrandFormComponent],
        providers: [provideHttpClient(), provideHttpClientTesting(), provideNzI18n(en_US), provideTranslateService({ fallbackLang: 'en' })],
    }).compileComponents();

    const fixture = TestBed.createComponent(BrandFormComponent);
    fixture.detectChanges();
    return fixture;
};

describe('BrandFormComponent', () => {
    afterEach(() => TestBed.inject(HttpTestingController).verify({ ignoreCancelled: true }));

    it('renders its fields through ng-zorro form items rather than a hand-rolled label', async () => {
        const element = (await open()).nativeElement as HTMLElement;

        expect(element.querySelectorAll('nz-form-item').length).toBe(4);
        expect(element.querySelector('nz-form-label[nzrequired]') ?? element.querySelector('.ant-form-item-required')).toBeTruthy();
    });

    it('fills itself from the record it is given, and does not count that as typing', async () => {
        const fixture = await open();
        fixture.componentRef.setInput('editing', SAREE);
        fixture.detectChanges();

        expect(fixture.componentInstance.form.getRawValue()).toEqual({ name: 'Saree', origin_country: 'IN', description: 'Festive', status: 'Inactive' });
        expect(fixture.componentInstance.form.dirty).toBe(false);
    });

    it('asks the server whether a name is free, once typing settles', async () => {
        const fixture = await open();
        const http = TestBed.inject(HttpTestingController);

        fixture.componentInstance.form.controls.name.setValue('Saree');
        http.expectNone((r) => r.url.endsWith(APIEndpoint.CHECK_BRAND_AVAILABILITY));

        await settle(450);
        const asked = http.expectOne((r) => r.url.endsWith(APIEndpoint.CHECK_BRAND_AVAILABILITY));
        expect(asked.request.params.get('value')).toBe('Saree');
        asked.flush({ code: 200, message: 'ok', data: { available: false } });

        expect(fixture.componentInstance.form.controls.name.hasError('taken')).toBe(true);
    });

    it('does not ask about the name the brand being edited already has', async () => {
        const fixture = await open();
        fixture.componentRef.setInput('editing', SAREE);
        fixture.detectChanges();
        fixture.componentInstance.form.controls.name.setValue('saree');
        await settle(450);

        TestBed.inject(HttpTestingController).expectNone((r) => r.url.endsWith(APIEndpoint.CHECK_BRAND_AVAILABILITY));
        expect(fixture.componentInstance.form.status).toBe('VALID');
    });

    it('asks once the name is changed, excluding the brand being edited so it cannot collide with itself', async () => {
        const fixture = await open();
        fixture.componentRef.setInput('editing', SAREE);
        fixture.detectChanges();
        fixture.componentInstance.form.controls.name.setValue('Sarees');
        await settle(450);

        const asked = TestBed.inject(HttpTestingController).expectOne((r) => r.url.endsWith(APIEndpoint.CHECK_BRAND_AVAILABILITY));
        expect(asked.request.params.get('value')).toBe('Sarees');
        expect(asked.request.params.get('oid')).toBe('cat-1');
        asked.flush({ code: 200, message: 'ok', data: { available: true } });
    });

    it('puts every helper in its label tooltip', async () => {
        const element = (await open()).nativeElement as HTMLElement;

        expect(element.querySelectorAll('.ant-form-item-extra').length).toBe(0);
        expect(element.querySelectorAll('.ant-form-item-tooltip').length).toBe(4);
    });

    it('sends a trimmed name and an empty description as nothing at all', async () => {
        const fixture = await open();
        fixture.componentInstance.form.setValue({ name: '  Saree  ', origin_country: null, description: '   ', status: 'Active' });

        expect(fixture.componentInstance.payload()).toEqual({ name: 'Saree', origin_country: null, description: null, status: 'Active' });
    });

    it('finds a country by its English name or code while the page is in Bengali', async () => {
        const fixture = await open();
        TestBed.inject(LanguageService).use('bn');
        const korea = { nzValue: 'KR', nzLabel: 'দক্ষিণ কোরিয়া' } as never;
        const match = fixture.componentInstance.matchCountry;

        expect(match('korea', korea)).toBe(true);
        expect(match('kr', korea)).toBe(true);
        expect(match('কোরিয়া', korea)).toBe(true);
        expect(match('india', korea)).toBe(false);
    });

    it('marks the field the server says collided as taken, so the refusal reads in both languages', async () => {
        const fixture = await open();
        fixture.componentInstance.reject('name');

        expect(fixture.componentInstance.form.controls.name.hasError('taken')).toBe(true);
    });

    it('points every field at a helper that is really on the page', async () => {
        const fixture = await open();
        const element = fixture.nativeElement as HTMLElement;

        for (const control of element.querySelectorAll('[aria-describedby]')) {
            const id = control.getAttribute('aria-describedby')!;
            expect(element.querySelector(`#${id}`), `${id} is described by nothing`).toBeTruthy();
        }
    });

    // nz-select passes only nzId to its inner input, so a describedby on the host reached no one.
    it('describes the status on the input that takes focus, not on the select around it', async () => {
        const element = (await open()).nativeElement as HTMLElement;
        const input = element.querySelector('#brand-status')!;

        expect(input.getAttribute('aria-describedby')).toBe('brand-status-help');
        expect(element.querySelector('#brand-status-help')?.textContent).toContain('configuration.brand.statusHelper');
        expect(element.querySelector('nz-select')?.hasAttribute('aria-describedby')).toBe(false);
    });

    // A label may only be `for` a labelable element. On the <nz-select> host it named nothing, so
    // the control had no accessible name and clicking the label did not focus it.
    it('gives the status label a control to point at', async () => {
        const element = (await open()).nativeElement as HTMLElement;
        const target = element.querySelector('#brand-status');

        expect(target).toBeTruthy();
        expect(target!.tagName).toBe('INPUT');
    });
});
