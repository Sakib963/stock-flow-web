import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideNzI18n, en_US } from 'ng-zorro-antd/i18n';
import { NzModalRef, NzModalService } from 'ng-zorro-antd/modal';
import { provideTranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { SessionService } from '@app/core/services/session/session.service';
import { OVERLAY_PROVIDERS } from '@app/shared/constants/overlay-providers';
import { SubCategoryCreateComponent } from './sub-category-create.component';

const ROUTES = [{ path: 'app/configuration/sub-categories', children: [{ path: '**', children: [] }] }];

const isCreate = (r: { url: string }) => r.url.endsWith(APIEndpoint.CREATE_SUB_CATEGORY);

const open = async (): Promise<ComponentFixture<SubCategoryCreateComponent>> => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
        imports: [SubCategoryCreateComponent],
        providers: [provideRouter(ROUTES), provideHttpClient(), provideHttpClientTesting(), provideNzI18n(en_US), provideTranslateService({ fallbackLang: 'en' }), ...OVERLAY_PROVIDERS, { provide: SessionService, useValue: { can: () => true, menu: () => [] } }],
    }).compileComponents();

    const fixture = TestBed.createComponent(SubCategoryCreateComponent);
    fixture.detectChanges();
    TestBed.inject(HttpTestingController)
        .expectOne((r) => r.url.endsWith(APIEndpoint.GET_CATEGORY_LIST_FOR_DROPDOWN))
        .flush({ code: 200, message: 'ok', data: [{ value: 'c1', label: 'Clothing' }] });
    answerConfirm(true);
    return fixture;
};

const answerConfirm = (yes: boolean) =>
    vi.spyOn(TestBed.inject(NzModalService), 'confirm').mockImplementation(() => {
        return { afterClose: of(yes) } as unknown as NzModalRef;
    });

const settle = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const fill = async (fixture: ComponentFixture<SubCategoryCreateComponent>) => {
    fixture.componentInstance.editor()!.form.setValue({ category_oid: 'c1', name: 'Sarees', category_code: 'SARE', description: '', status: 'Active' });
    await settle(450);
    TestBed.inject(HttpTestingController)
        .match((r) => r.url.endsWith(APIEndpoint.CHECK_SUB_CATEGORY_AVAILABILITY))
        .forEach((request) => request.flush({ code: 200, message: 'ok', data: { available: true } }));
    fixture.detectChanges();
};

describe('SubCategoryCreateComponent', () => {
    afterEach(() => TestBed.inject(HttpTestingController).verify({ ignoreCancelled: true }));

    it('sends exactly one create for one press of Save, carrying the parent category', async () => {
        const fixture = await open();
        await fill(fixture);

        fixture.componentInstance.save();
        fixture.componentInstance.save();
        await fixture.whenStable();

        const sent = TestBed.inject(HttpTestingController).match(isCreate);
        expect(sent.length).toBe(1);
        expect(sent[0].request.body.category_oid).toBe('c1');
        sent[0].flush({ code: 200, message: 'ok', data: { oid: 'new-1' } });
        await fixture.whenStable();

        expect(TestBed.inject(Router).url).toContain('/app/configuration/sub-categories/new-1');
    });

    it('asks before adding, and adds nothing when the answer is not yet', async () => {
        const fixture = await open();
        await fill(fixture);
        const asked = answerConfirm(false);

        fixture.componentInstance.save();
        await fixture.whenStable();

        expect(asked.mock.calls[0][0]?.nzTitle).toBe('configuration.subCategory.confirmCreate.title');
        TestBed.inject(HttpTestingController).expectNone(isCreate);
    });

    it('marks the name taken when the database refuses it, and keeps everything typed', async () => {
        const fixture = await open();
        await fill(fixture);
        fixture.componentInstance.save();
        await fixture.whenStable();

        TestBed.inject(HttpTestingController).expectOne(isCreate).flush({ code: 409, message: 'taken', data: { field: 'name' } }, { status: 409, statusText: 'Conflict' });

        const form = fixture.componentInstance.editor()!.form;
        expect(form.controls.name.hasError('taken')).toBe(true);
        expect(form.controls.category_code.value).toBe('SARE');
    });

    it('marks the category when it was turned off while the form was open', async () => {
        const fixture = await open();
        await fill(fixture);
        fixture.componentInstance.save();
        await fixture.whenStable();

        TestBed.inject(HttpTestingController).expectOne(isCreate).flush({ code: 400, message: 'inactive', data: { field: 'category_oid' } }, { status: 400, statusText: 'Bad Request' });

        expect(fixture.componentInstance.editor()!.form.controls.category_oid.hasError('inactive')).toBe(true);
    });
});
