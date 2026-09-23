import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { provideNzI18n, en_US } from 'ng-zorro-antd/i18n';
import { provideTranslateService } from '@ngx-translate/core';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { OVERLAY_PROVIDERS } from '@app/shared/constants/overlay-providers';
import { CategoryEditComponent } from './category-edit.component';

const ROUTES = [{ path: 'app/configuration/categories', children: [{ path: '**', children: [] }] }];
const RECORD = { oid: 'cat-1', name: 'Saree', category_code: 'SARE', description: 'Festive', status: 'Inactive' };
const settle = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const open = async (): Promise<ComponentFixture<CategoryEditComponent>> => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
        imports: [CategoryEditComponent],
        providers: [provideRouter(ROUTES), provideHttpClient(), provideHttpClientTesting(), provideNzI18n(en_US), provideTranslateService({ fallbackLang: 'en' }), ...OVERLAY_PROVIDERS, { provide: ActivatedRoute, useValue: { snapshot: { paramMap: new Map([['oid', 'cat-1']]) } } }],
    }).compileComponents();

    const fixture = TestBed.createComponent(CategoryEditComponent);
    fixture.detectChanges();
    return fixture;
};

const loaded = async (fixture: ComponentFixture<CategoryEditComponent>) => {
    const http = TestBed.inject(HttpTestingController);
    http.expectOne((r) => r.url.includes(APIEndpoint.GET_CATEGORY_DETAILS)).flush({ code: 200, message: 'ok', data: { details: RECORD, stats: {}, activity: [] } });
    fixture.detectChanges();
    await settle(450);
    http.match((r) => r.url.endsWith(APIEndpoint.CHECK_CATEGORY_AVAILABILITY)).forEach((request) => request.flush({ code: 200, message: 'ok', data: { available: true } }));
    fixture.detectChanges();
};

describe('CategoryEditComponent', () => {
    afterEach(() => TestBed.inject(HttpTestingController).verify({ ignoreCancelled: true }));

    it('hands the record it loaded to the form, and that is not unsaved work', async () => {
        const fixture = await open();
        await loaded(fixture);

        expect(fixture.componentInstance.editor()!.form.getRawValue()).toEqual({ name: 'Saree', category_code: 'SARE', description: 'Festive', status: 'Inactive' });
        expect(fixture.componentInstance.hasUnsavedChanges()).toBe(false);
    });

    it('sends the oid of the category it is editing', async () => {
        const fixture = await open();
        await loaded(fixture);

        fixture.componentInstance.save();
        await fixture.whenStable();

        const saved = TestBed.inject(HttpTestingController).expectOne((r) => r.url.endsWith(APIEndpoint.UPDATE_CATEGORY_DETAILS));
        expect(saved.request.body.oid).toBe('cat-1');
        saved.flush({ code: 200, message: 'ok' });
        await fixture.whenStable();

        expect(TestBed.inject(Router).url).toContain('/app/configuration/categories/cat-1');
    });

    it('shows no form at all when the record could not be loaded, and offers another go', async () => {
        const fixture = await open();
        TestBed.inject(HttpTestingController)
            .expectOne((r) => r.url.includes(APIEndpoint.GET_CATEGORY_DETAILS))
            .flush({ code: 500, message: 'boom' }, { status: 500, statusText: 'Server Error' });
        fixture.detectChanges();

        const element = fixture.nativeElement as HTMLElement;
        expect(element.querySelector('category-form')).toBe(null);
        expect(element.textContent).toContain('configuration.category.loadFailed.server');
        expect(element.textContent).toContain('form.retry');
    });
});
