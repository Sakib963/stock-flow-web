import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNzI18n, en_US } from 'ng-zorro-antd/i18n';
import { provideTranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { SubCategory } from '@app/core/models/sub-category.model';
import { SessionService } from '@app/core/services/session/session.service';
import { OVERLAY_PROVIDERS } from '@app/shared/constants/overlay-providers';
import { CodeGeneratorService } from '@app/shared/services/code-generator/code-generator.service';
import { SubCategoryFormComponent } from './sub-category-form.component';

const CATEGORIES = { code: 200, message: 'ok', data: [{ value: 'c1', label: 'Clothing' }, { value: 'c2', label: 'Footwear' }] };

const SAREES: SubCategory = { oid: 'sc-1', name: 'Sarees', category_code: 'SARE', category_oid: 'c9', category_name: 'Retired', description: null, status: 'Active' };

const settle = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const isDropdown = (r: { url: string }) => r.url.endsWith(APIEndpoint.GET_CATEGORY_LIST_FOR_DROPDOWN);
const isAvailability = (r: { url: string }) => r.url.endsWith(APIEndpoint.CHECK_SUB_CATEGORY_AVAILABILITY);

const open = async (permissions: string[] = ['configuration.category.create']): Promise<ComponentFixture<SubCategoryFormComponent>> => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
        imports: [SubCategoryFormComponent],
        providers: [
            provideHttpClient(),
            provideHttpClientTesting(),
            provideNzI18n(en_US),
            provideTranslateService({ fallbackLang: 'en' }),
            ...OVERLAY_PROVIDERS,
            { provide: CodeGeneratorService, useValue: { ask: () => of(undefined) } },
            { provide: SessionService, useValue: { can: (code: string) => permissions.includes(code) } },
        ],
    }).compileComponents();

    const fixture = TestBed.createComponent(SubCategoryFormComponent);
    fixture.detectChanges();
    TestBed.inject(HttpTestingController).expectOne(isDropdown).flush(CATEGORIES);
    fixture.detectChanges();
    return fixture;
};

describe('SubCategoryFormComponent', () => {
    afterEach(() => TestBed.inject(HttpTestingController).verify({ ignoreCancelled: true }));

    it('offers the Active categories as parents', async () => {
        const fixture = await open();
        expect(fixture.componentInstance.categories().map((c) => c.label)).toEqual(['Clothing', 'Footwear']);
        expect(fixture.componentInstance.categoriesLoading()).toBe(false);
    });

    it('offers to add a category only to someone who may add one', async () => {
        expect((await open()).componentInstance.canAddCategory()).toBe(true);
        expect((await open([])).componentInstance.canAddCategory()).toBe(false);
    });

    it('does not ask about a name until a category is picked, then asks within that category', async () => {
        const fixture = await open();
        const http = TestBed.inject(HttpTestingController);

        fixture.componentInstance.form.controls.name.setValue('Sarees');
        await settle(450);
        http.expectNone(isAvailability);

        fixture.componentInstance.form.controls.category_oid.setValue('c1');
        await settle(450);
        const asked = http.expectOne(isAvailability);
        expect(asked.request.params.get('category_oid')).toBe('c1');
        asked.flush({ code: 200, message: 'ok', data: { available: false } });

        expect(fixture.componentInstance.form.controls.name.hasError('taken')).toBe(true);
    });

    it('asks about the name again when the category changes, since a name is only unique within one', async () => {
        const fixture = await open();
        const http = TestBed.inject(HttpTestingController);
        fixture.componentInstance.form.controls.category_oid.setValue('c1');
        fixture.componentInstance.form.controls.name.setValue('Men');
        await settle(450);
        http.expectOne(isAvailability).flush({ code: 200, message: 'ok', data: { available: false } });

        fixture.componentInstance.form.controls.category_oid.setValue('c2');
        await settle(450);
        const again = http.expectOne(isAvailability);
        expect(again.request.params.get('category_oid')).toBe('c2');
        again.flush({ code: 200, message: 'ok', data: { available: true } });

        expect(fixture.componentInstance.form.controls.name.valid).toBe(true);
    });

    it('opens the drawer with whatever was typed in the category search', async () => {
        const fixture = await open();
        fixture.componentInstance.categorySearch.set('Jewellery');
        fixture.componentInstance.openQuickAdd();

        expect(fixture.componentInstance.quickAddName()).toBe('Jewellery');
    });

    it('picks a category the moment it is added, and keeps what was typed', async () => {
        const fixture = await open();
        const form = fixture.componentInstance.form;
        form.controls.name.setValue('Earrings');
        fixture.componentInstance.openQuickAdd();

        fixture.componentInstance.categoryAdded({ oid: 'c3', name: 'Accessories' });

        expect(form.controls.category_oid.value).toBe('c3');
        expect(form.controls.name.value).toBe('Earrings');
        expect(fixture.componentInstance.categories().map((c) => c.label)).toEqual(['Accessories', 'Clothing', 'Footwear']);
        expect(fixture.componentInstance.quickAddName()).toBeNull();

        await settle(450);
        TestBed.inject(HttpTestingController)
            .match(isAvailability)
            .forEach((r) => r.flush({ code: 200, message: 'ok', data: { available: true } }));
    });

    it('still names the category of a sub-category being edited after that category was turned off', async () => {
        const fixture = await open();
        fixture.componentRef.setInput('editing', SAREES);
        fixture.detectChanges();

        expect(fixture.componentInstance.categories()[0]).toEqual({ value: 'c9', label: 'Retired' });
        expect(fixture.componentInstance.form.controls.category_oid.value).toBe('c9');
        expect(fixture.componentInstance.form.dirty).toBe(false);
    });

    it('sends the code in capitals, the description as null when empty, and the parent it was given', async () => {
        const fixture = await open();
        fixture.componentInstance.form.setValue({ category_oid: 'c1', name: ' Sarees ', category_code: 'sare', description: ' ', status: 'Active' });

        expect(fixture.componentInstance.payload()).toEqual({ name: 'Sarees', category_code: 'SARE', category_oid: 'c1', description: null, status: 'Active' });
        await settle(450);
        TestBed.inject(HttpTestingController)
            .match(isAvailability)
            .forEach((r) => r.flush({ code: 200, message: 'ok', data: { available: true } }));
    });
});
