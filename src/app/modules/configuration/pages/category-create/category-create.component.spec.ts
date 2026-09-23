import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideNzI18n, en_US } from 'ng-zorro-antd/i18n';
import { provideTranslateService } from '@ngx-translate/core';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { OVERLAY_PROVIDERS } from '@app/shared/constants/overlay-providers';
import { CategoryCreateComponent } from './category-create.component';

const ROUTES = [{ path: 'app/configuration/categories', children: [{ path: '**', children: [] }] }];

const open = async (): Promise<ComponentFixture<CategoryCreateComponent>> => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
        imports: [CategoryCreateComponent],
        providers: [provideRouter(ROUTES), provideHttpClient(), provideHttpClientTesting(), provideNzI18n(en_US), provideTranslateService({ fallbackLang: 'en' }), ...OVERLAY_PROVIDERS],
    }).compileComponents();

    const fixture = TestBed.createComponent(CategoryCreateComponent);
    fixture.detectChanges();
    return fixture;
};

const settle = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Fills the form and answers the availability checks it sets off, so it settles out of PENDING. */
const fill = async (fixture: ComponentFixture<CategoryCreateComponent>) => {
    fixture.componentInstance.editor()!.form.setValue({ name: 'Saree', category_code: 'SARE', description: '', status: 'Active' });
    await settle(450);
    TestBed.inject(HttpTestingController)
        .match((r) => r.url.endsWith(APIEndpoint.CHECK_CATEGORY_AVAILABILITY))
        .forEach((request) => request.flush({ code: 200, message: 'ok', data: { available: true } }));
    fixture.detectChanges();
};

describe('CategoryCreateComponent', () => {
    afterEach(() => TestBed.inject(HttpTestingController).verify({ ignoreCancelled: true }));

    // The Save button is a submit with no click handler, so pressing it is one write and one only.
    it('sends exactly one create for one press of Save', async () => {
        const fixture = await open();
        await fill(fixture);

        const save = [...(fixture.nativeElement as HTMLElement).querySelectorAll('button')].find((b) => b.textContent?.includes('form.save'))!;
        save.click();
        await fixture.whenStable();

        const sent = TestBed.inject(HttpTestingController).match((r) => r.url.endsWith(APIEndpoint.CREATE_CATEGORY));
        expect(sent.length).toBe(1);
        sent[0].flush({ code: 200, message: 'ok', data: { oid: 'new-1' } });
    });

    it('will not start a second save while the first is still in flight', async () => {
        const fixture = await open();
        await fill(fixture);

        fixture.componentInstance.save();
        fixture.componentInstance.save();
        await fixture.whenStable();

        const sent = TestBed.inject(HttpTestingController).match((r) => r.url.endsWith(APIEndpoint.CREATE_CATEGORY));
        expect(sent.length).toBe(1);
        sent[0].flush({ code: 200, message: 'ok', data: { oid: 'new-1' } });
    });

    it('opens the category it just created', async () => {
        const fixture = await open();
        await fill(fixture);
        fixture.componentInstance.save();
        await fixture.whenStable();

        TestBed.inject(HttpTestingController)
            .expectOne((r) => r.url.endsWith(APIEndpoint.CREATE_CATEGORY))
            .flush({ code: 200, message: 'ok', data: { oid: 'new-1' } });
        await fixture.whenStable();

        expect(TestBed.inject(Router).url).toContain('/app/configuration/categories/new-1');
    });

    it('marks the field the server says collided and keeps everything typed', async () => {
        const fixture = await open();
        await fill(fixture);
        fixture.componentInstance.save();
        await fixture.whenStable();

        TestBed.inject(HttpTestingController)
            .expectOne((r) => r.url.endsWith(APIEndpoint.CREATE_CATEGORY))
            .flush({ code: 409, message: 'A category with this name already exists.', data: { field: 'name' } }, { status: 409, statusText: 'Conflict' });
        fixture.detectChanges();

        const form = fixture.componentInstance.editor()!.form;
        expect(form.controls.name.getError('server')).toContain('already exists');
        expect(form.controls.name.value).toBe('Saree');
        expect(form.controls.category_code.value).toBe('SARE');
    });

    // An availability check is still running when Save is pressed, so the form is PENDING and not
    // yet valid. Reading validity at that instant would silently do nothing.
    it('waits for a check still in flight rather than ignoring the press', async () => {
        const fixture = await open();
        const http = TestBed.inject(HttpTestingController);
        fixture.componentInstance.editor()!.form.setValue({ name: 'Saree', category_code: 'SARE', description: '', status: 'Active' });
        await settle(450);

        fixture.componentInstance.save();
        await fixture.whenStable();
        http.expectNone((r) => r.url.endsWith(APIEndpoint.CREATE_CATEGORY));

        http.match((r) => r.url.endsWith(APIEndpoint.CHECK_CATEGORY_AVAILABILITY)).forEach((request) => request.flush({ code: 200, message: 'ok', data: { available: true } }));
        await fixture.whenStable();

        http.expectOne((r) => r.url.endsWith(APIEndpoint.CREATE_CATEGORY)).flush({ code: 200, message: 'ok', data: { oid: 'new-1' } });
    });

    it('sends nothing at all when the form is not filled in', async () => {
        const fixture = await open();
        fixture.componentInstance.save();
        await fixture.whenStable();

        TestBed.inject(HttpTestingController).expectNone((r) => r.url.endsWith(APIEndpoint.CREATE_CATEGORY));
    });

    it('reports unsaved work only once something has been typed', async () => {
        const fixture = await open();
        expect(fixture.componentInstance.hasUnsavedChanges()).toBe(false);

        fixture.componentInstance.editor()!.form.controls.name.markAsDirty();
        expect(fixture.componentInstance.hasUnsavedChanges()).toBe(true);
    });
});
