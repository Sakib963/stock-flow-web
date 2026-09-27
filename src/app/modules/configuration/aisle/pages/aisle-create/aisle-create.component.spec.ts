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
import { AisleCreateComponent } from './aisle-create.component';

const ROUTES = [{ path: 'app/configuration/aisles', children: [{ path: '**', children: [] }] }];

const isCreate = (r: { url: string }) => r.url.endsWith(APIEndpoint.CREATE_AISLE);

const open = async (): Promise<ComponentFixture<AisleCreateComponent>> => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
        imports: [AisleCreateComponent],
        providers: [provideRouter(ROUTES), provideHttpClient(), provideHttpClientTesting(), provideNzI18n(en_US), provideTranslateService({ fallbackLang: 'en' }), ...OVERLAY_PROVIDERS, { provide: SessionService, useValue: { can: () => true, menu: () => [] } }],
    }).compileComponents();

    const fixture = TestBed.createComponent(AisleCreateComponent);
    fixture.detectChanges();
    TestBed.inject(HttpTestingController)
        .expectOne((r) => r.url.endsWith(APIEndpoint.GET_WAREHOUSE_LIST_FOR_DROPDOWN))
        .flush({ code: 200, message: 'ok', data: [{ value: 'c1', label: 'Clothing' }] });
    answerConfirm(true);
    return fixture;
};

const answerConfirm = (yes: boolean) =>
    vi.spyOn(TestBed.inject(NzModalService), 'confirm').mockImplementation(() => {
        return { afterClose: of(yes) } as unknown as NzModalRef;
    });

const settle = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const fill = async (fixture: ComponentFixture<AisleCreateComponent>) => {
    fixture.componentInstance.editor()!.form.setValue({ warehouse_oid: 'c1', name: 'Sarees', code: 'SARE', storage_type: null, capacity_units: null, special_notes: '', status: 'Active' });
    await settle(450);
    TestBed.inject(HttpTestingController)
        .match((r) => r.url.endsWith(APIEndpoint.CHECK_AISLE_AVAILABILITY))
        .forEach((request) => request.flush({ code: 200, message: 'ok', data: { available: true } }));
    fixture.detectChanges();
};

describe('AisleCreateComponent', () => {
    afterEach(() => TestBed.inject(HttpTestingController).verify({ ignoreCancelled: true }));

    it('sends exactly one create for one press of Save, carrying the parent warehouse', async () => {
        const fixture = await open();
        await fill(fixture);

        fixture.componentInstance.save();
        fixture.componentInstance.save();
        await fixture.whenStable();

        const sent = TestBed.inject(HttpTestingController).match(isCreate);
        expect(sent.length).toBe(1);
        expect(sent[0].request.body.warehouse_oid).toBe('c1');
        sent[0].flush({ code: 200, message: 'ok', data: { oid: 'new-1' } });
        await fixture.whenStable();

        expect(TestBed.inject(Router).url).toContain('/app/configuration/aisles/new-1');
    });

    it('asks before adding, and adds nothing when the answer is not yet', async () => {
        const fixture = await open();
        await fill(fixture);
        const asked = answerConfirm(false);

        fixture.componentInstance.save();
        await fixture.whenStable();

        expect(asked.mock.calls[0][0]?.nzTitle).toBe('configuration.aisle.confirmCreate.title');
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
        expect(form.controls.code.value).toBe('SARE');
    });

    it('marks the warehouse when it was turned off while the form was open', async () => {
        const fixture = await open();
        await fill(fixture);
        fixture.componentInstance.save();
        await fixture.whenStable();

        TestBed.inject(HttpTestingController).expectOne(isCreate).flush({ code: 400, message: 'inactive', data: { field: 'warehouse_oid' } }, { status: 400, statusText: 'Bad Request' });

        expect(fixture.componentInstance.editor()!.form.controls.warehouse_oid.hasError('inactive')).toBe(true);
    });
});
