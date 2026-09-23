import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNzI18n, en_US } from 'ng-zorro-antd/i18n';
import { provideTranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { Category } from '@app/core/models/category.model';
import { CodeGeneratorService } from '@app/shared/services/code-generator/code-generator.service';
import { CategoryFormComponent } from './category-form.component';

const SAREE: Category = { oid: 'cat-1', name: 'Saree', category_code: 'SARE', description: 'Festive', status: 'Inactive' };

const settle = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const open = async (applied?: string): Promise<ComponentFixture<CategoryFormComponent>> => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
        imports: [CategoryFormComponent],
        providers: [provideHttpClient(), provideHttpClientTesting(), provideNzI18n(en_US), provideTranslateService({ fallbackLang: 'en' }), { provide: CodeGeneratorService, useValue: { ask: () => of(applied) } }],
    }).compileComponents();

    const fixture = TestBed.createComponent(CategoryFormComponent);
    fixture.detectChanges();
    return fixture;
};

describe('CategoryFormComponent', () => {
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

        expect(fixture.componentInstance.form.getRawValue()).toEqual({ name: 'Saree', category_code: 'SARE', description: 'Festive', status: 'Inactive' });
        expect(fixture.componentInstance.form.dirty).toBe(false);
    });

    it('asks the server whether a name is free, once typing settles', async () => {
        const fixture = await open();
        const http = TestBed.inject(HttpTestingController);

        fixture.componentInstance.form.controls.name.setValue('Saree');
        http.expectNone((r) => r.url.endsWith(APIEndpoint.CHECK_CATEGORY_AVAILABILITY));

        await settle(450);
        const asked = http.expectOne((r) => r.url.endsWith(APIEndpoint.CHECK_CATEGORY_AVAILABILITY));
        expect(asked.request.params.get('value')).toBe('Saree');
        asked.flush({ code: 200, message: 'ok', data: { available: false } });

        expect(fixture.componentInstance.form.controls.name.hasError('taken')).toBe(true);
    });

    it('excludes the category being edited, so its own name is not reported as taken', async () => {
        const fixture = await open();
        fixture.componentRef.setInput('editing', SAREE);
        fixture.detectChanges();
        await settle(450);

        // Filling the form is what triggers the check, with the record's own oid excluded.
        const asked = TestBed.inject(HttpTestingController).match((r) => r.url.endsWith(APIEndpoint.CHECK_CATEGORY_AVAILABILITY));
        expect(asked.length).toBeGreaterThan(0);
        asked.forEach((request) => {
            expect(request.request.params.get('oid')).toBe('cat-1');
            request.flush({ code: 200, message: 'ok', data: { available: true } });
        });
    });

    it('sends the code in capitals and an empty description as nothing at all', async () => {
        const fixture = await open();
        fixture.componentInstance.form.setValue({ name: '  Saree  ', category_code: 'sare', description: '   ', status: 'Active' });

        expect(fixture.componentInstance.payload()).toEqual({ name: 'Saree', category_code: 'SARE', description: null, status: 'Active' });
    });

    // Nothing reaches the field unless the person applied it in the modal.
    it('takes a generated code only when one comes back', async () => {
        const applied = await open('TRADCLO');
        applied.componentInstance.generateCode();
        expect(applied.componentInstance.form.controls.category_code.value).toBe('TRADCLO');

        const dismissed = await open(undefined);
        dismissed.componentInstance.form.controls.category_code.setValue('MINE');
        dismissed.componentInstance.generateCode();
        expect(dismissed.componentInstance.form.controls.category_code.value).toBe('MINE');
    });

    it("marks the field the server says collided, with the server's own words", async () => {
        const fixture = await open();
        fixture.componentInstance.reject('name', 'A category with this name already exists.');

        expect(fixture.componentInstance.form.controls.name.getError('server')).toContain('already exists');
    });
});
