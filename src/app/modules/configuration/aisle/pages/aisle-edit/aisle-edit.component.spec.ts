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
import { AisleEditComponent } from './aisle-edit.component';

const ROUTES = [{ path: 'app/configuration/aisles', children: [{ path: '**', children: [] }] }];
const RECORD = { oid: 'sc-1', name: 'Sarees', code: 'SARE', warehouse_oid: 'c1', warehouse_name: 'Clothing', storage_type: 'rack', capacity_units: 200, special_notes: 'Festive', status: 'Active' };
const settle = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const isUpdate = (r: { url: string }) => r.url.endsWith(APIEndpoint.UPDATE_AISLE_DETAILS);

const open = async (): Promise<ComponentFixture<AisleEditComponent>> => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
        imports: [AisleEditComponent],
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

    const fixture = TestBed.createComponent(AisleEditComponent);
    fixture.detectChanges();
    answerConfirm(true);
    return fixture;
};

const answerConfirm = (yes: boolean) =>
    vi.spyOn(TestBed.inject(NzModalService), 'confirm').mockImplementation(() => {
        return { afterClose: of(yes) } as unknown as NzModalRef;
    });

const loaded = async (fixture: ComponentFixture<AisleEditComponent>) => {
    const http = TestBed.inject(HttpTestingController);
    http.expectOne((r) => r.url.includes(APIEndpoint.GET_AISLE_DETAILS)).flush({ code: 200, message: 'ok', data: { details: RECORD, stats: {}, activity: [] } });
    fixture.detectChanges();
    http.expectOne((r) => r.url.endsWith(APIEndpoint.GET_WAREHOUSE_LIST_FOR_DROPDOWN)).flush({ code: 200, message: 'ok', data: [{ value: 'c1', label: 'Clothing' }] });
    await settle(450);
    http.match((r) => r.url.endsWith(APIEndpoint.CHECK_AISLE_AVAILABILITY)).forEach((request) => request.flush({ code: 200, message: 'ok', data: { available: true } }));
    fixture.detectChanges();
};

describe('AisleEditComponent', () => {
    afterEach(() => TestBed.inject(HttpTestingController).verify({ ignoreCancelled: true }));

    it('hands the record it loaded to the form, parent included, and that is not unsaved work', async () => {
        const fixture = await open();
        await loaded(fixture);

        expect(fixture.componentInstance.editor()!.form.getRawValue()).toEqual({ warehouse_oid: 'c1', name: 'Sarees', code: 'SARE', storage_type: 'rack', capacity_units: 200, special_notes: 'Festive', status: 'Active' });
        expect(fixture.componentInstance.hasUnsavedChanges()).toBe(false);
    });

    it('sends the oid it is editing and opens the record afterwards', async () => {
        const fixture = await open();
        await loaded(fixture);

        fixture.componentInstance.editor()!.form.markAsDirty();
        fixture.componentInstance.save();
        await fixture.whenStable();

        const saved = TestBed.inject(HttpTestingController).expectOne(isUpdate);
        expect(saved.request.body.oid).toBe('sc-1');
        saved.flush({ code: 200, message: 'ok' });
        await fixture.whenStable();

        expect(TestBed.inject(Router).url).toContain('/app/configuration/aisles/sc-1');
    });

    it('asks before saving, and saves nothing when the answer is not yet', async () => {
        const fixture = await open();
        await loaded(fixture);
        const asked = answerConfirm(false);

        fixture.componentInstance.editor()!.form.markAsDirty();
        fixture.componentInstance.save();
        await fixture.whenStable();

        expect(asked.mock.calls[0][0]?.nzTitle).toBe('configuration.aisle.confirmEdit.title');
        TestBed.inject(HttpTestingController).expectNone(isUpdate);
    });

    it('shows no form when the record could not be loaded, and offers another go', async () => {
        const fixture = await open();
        TestBed.inject(HttpTestingController)
            .expectOne((r) => r.url.includes(APIEndpoint.GET_AISLE_DETAILS))
            .flush({ code: 500, message: 'boom' }, { status: 500, statusText: 'Server Error' });
        fixture.detectChanges();

        const element = fixture.nativeElement as HTMLElement;
        expect(element.querySelector('aisle-form')).toBe(null);
        expect(element.textContent).toContain('configuration.aisle.loadFailed.server');
    });
});
