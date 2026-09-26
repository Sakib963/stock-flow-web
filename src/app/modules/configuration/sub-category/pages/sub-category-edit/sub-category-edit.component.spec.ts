import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { provideNzI18n, en_US } from 'ng-zorro-antd/i18n';
import { NzModalRef, NzModalService } from 'ng-zorro-antd/modal';
import { provideTranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { SessionService } from '@app/core/services/session/session.service';
import { OVERLAY_PROVIDERS } from '@app/shared/constants/overlay-providers';
import { SubCategoryEditComponent } from './sub-category-edit.component';

const ROUTES = [{ path: 'app/configuration/sub-categories', children: [{ path: '**', children: [] }] }];
const RECORD = { oid: 'sc-1', name: 'Sarees', category_code: 'SARE', category_oid: 'c1', category_name: 'Clothing', description: 'Festive', status: 'Active' };
const settle = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const isUpdate = (r: { url: string }) => r.url.endsWith(APIEndpoint.UPDATE_SUB_CATEGORY_DETAILS);

const open = async (): Promise<ComponentFixture<SubCategoryEditComponent>> => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
        imports: [SubCategoryEditComponent],
        providers: [
            provideRouter(ROUTES),
            provideHttpClient(),
            provideHttpClientTesting(),
            provideNzI18n(en_US),
            provideTranslateService({ fallbackLang: 'en' }),
            ...OVERLAY_PROVIDERS,
            { provide: ActivatedRoute, useValue: { snapshot: { paramMap: new Map([['oid', 'sc-1']]) } } },
            { provide: SessionService, useValue: { can: () => true, menu: () => [] } },
        ],
    }).compileComponents();

    const fixture = TestBed.createComponent(SubCategoryEditComponent);
    fixture.detectChanges();
    answerConfirm(true);
    return fixture;
};

const answerConfirm = (yes: boolean) =>
    vi.spyOn(TestBed.inject(NzModalService), 'confirm').mockImplementation(() => {
        return { afterClose: of(yes) } as unknown as NzModalRef;
    });

const loaded = async (fixture: ComponentFixture<SubCategoryEditComponent>) => {
    const http = TestBed.inject(HttpTestingController);
    http.expectOne((r) => r.url.includes(APIEndpoint.GET_SUB_CATEGORY_DETAILS)).flush({ code: 200, message: 'ok', data: { details: RECORD, stats: {}, activity: [] } });
    fixture.detectChanges();
    http.expectOne((r) => r.url.endsWith(APIEndpoint.GET_CATEGORY_LIST_FOR_DROPDOWN)).flush({ code: 200, message: 'ok', data: [{ value: 'c1', label: 'Clothing' }] });
    await settle(450);
    http.match((r) => r.url.endsWith(APIEndpoint.CHECK_SUB_CATEGORY_AVAILABILITY)).forEach((request) => request.flush({ code: 200, message: 'ok', data: { available: true } }));
    fixture.detectChanges();
};

describe('SubCategoryEditComponent', () => {
    afterEach(() => TestBed.inject(HttpTestingController).verify({ ignoreCancelled: true }));

    it('hands the record it loaded to the form, parent included, and that is not unsaved work', async () => {
        const fixture = await open();
        await loaded(fixture);

        expect(fixture.componentInstance.editor()!.form.getRawValue()).toEqual({ category_oid: 'c1', name: 'Sarees', category_code: 'SARE', description: 'Festive', status: 'Active' });
        expect(fixture.componentInstance.hasUnsavedChanges()).toBe(false);
    });

    it('sends the oid it is editing and opens the record afterwards', async () => {
        const fixture = await open();
        await loaded(fixture);

        fixture.componentInstance.save();
        await fixture.whenStable();

        const saved = TestBed.inject(HttpTestingController).expectOne(isUpdate);
        expect(saved.request.body.oid).toBe('sc-1');
        saved.flush({ code: 200, message: 'ok' });
        await fixture.whenStable();

        expect(TestBed.inject(Router).url).toContain('/app/configuration/sub-categories/sc-1');
    });

    it('asks before saving, and saves nothing when the answer is not yet', async () => {
        const fixture = await open();
        await loaded(fixture);
        const asked = answerConfirm(false);

        fixture.componentInstance.save();
        await fixture.whenStable();

        expect(asked.mock.calls[0][0]?.nzTitle).toBe('configuration.subCategory.confirmEdit.title');
        TestBed.inject(HttpTestingController).expectNone(isUpdate);
    });

    it('shows no form when the record could not be loaded, and offers another go', async () => {
        const fixture = await open();
        TestBed.inject(HttpTestingController)
            .expectOne((r) => r.url.includes(APIEndpoint.GET_SUB_CATEGORY_DETAILS))
            .flush({ code: 500, message: 'boom' }, { status: 500, statusText: 'Server Error' });
        fixture.detectChanges();

        const element = fixture.nativeElement as HTMLElement;
        expect(element.querySelector('sub-category-form')).toBe(null);
        expect(element.textContent).toContain('configuration.subCategory.loadFailed.server');
    });
});
