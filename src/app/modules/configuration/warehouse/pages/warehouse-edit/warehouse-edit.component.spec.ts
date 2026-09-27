import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { provideNzI18n, en_US } from 'ng-zorro-antd/i18n';
import { NzModalRef, NzModalService } from 'ng-zorro-antd/modal';
import { provideTranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { OVERLAY_PROVIDERS } from '@app/shared/constants/overlay-providers';
import { WarehouseEditComponent } from './warehouse-edit.component';

const ROUTES = [{ path: 'app/configuration/warehouses', children: [{ path: '**', children: [] }] }];
const RECORD = { oid: 'cat-1', name: 'Saree', code: 'SARE', location: 'Mohammadpur', capacity_units: 500, status: 'Inactive' };
const settle = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const open = async (): Promise<ComponentFixture<WarehouseEditComponent>> => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
        imports: [WarehouseEditComponent],
        providers: [provideRouter(ROUTES), provideHttpClient(), provideHttpClientTesting(), provideNzI18n(en_US), provideTranslateService({ fallbackLang: 'en' }), ...OVERLAY_PROVIDERS, { provide: ActivatedRoute, useValue: { snapshot: { paramMap: new Map([['oid', 'cat-1']]) } } }],
    }).compileComponents();

    const fixture = TestBed.createComponent(WarehouseEditComponent);
    fixture.detectChanges();
    answerConfirm(true);
    return fixture;
};

/**
 * Answers the save confirmation as the person would: pressing its confirming button, or closing it.
 * Returns the spy so a test can see what was asked.
 */
const answerConfirm = (yes: boolean) =>
    vi.spyOn(TestBed.inject(NzModalService), 'confirm').mockImplementation(() => {
        return { afterClose: of(yes) } as unknown as NzModalRef;
    });

const loaded = async (fixture: ComponentFixture<WarehouseEditComponent>) => {
    const http = TestBed.inject(HttpTestingController);
    http.expectOne((r) => r.url.includes(APIEndpoint.GET_WAREHOUSE_DETAILS)).flush({ code: 200, message: 'ok', data: { details: RECORD, stats: {}, activity: [] } });
    fixture.detectChanges();
    await settle(450);
    http.match((r) => r.url.endsWith(APIEndpoint.CHECK_WAREHOUSE_AVAILABILITY)).forEach((request) => request.flush({ code: 200, message: 'ok', data: { available: true } }));
    fixture.detectChanges();
};

describe('WarehouseEditComponent', () => {
    afterEach(() => TestBed.inject(HttpTestingController).verify({ ignoreCancelled: true }));

    it('hands the record it loaded to the form, and that is not unsaved work', async () => {
        const fixture = await open();
        await loaded(fixture);

        expect(fixture.componentInstance.editor()!.form.getRawValue()).toEqual({ name: 'Saree', code: 'SARE', capacity_units: 500, location: 'Mohammadpur', status: 'Inactive' });
        expect(fixture.componentInstance.hasUnsavedChanges()).toBe(false);
    });

    it('sends the oid of the warehouse it is editing', async () => {
        const fixture = await open();
        await loaded(fixture);

        fixture.componentInstance.editor()!.form.markAsDirty();
        fixture.componentInstance.save();
        await fixture.whenStable();

        const saved = TestBed.inject(HttpTestingController).expectOne((r) => r.url.endsWith(APIEndpoint.UPDATE_WAREHOUSE_DETAILS));
        expect(saved.request.body.oid).toBe('cat-1');
        saved.flush({ code: 200, message: 'ok' });
        await fixture.whenStable();

        expect(TestBed.inject(Router).url).toContain('/app/configuration/warehouses/cat-1');
    });

    it('asks before saving, naming the warehouse, and saves nothing when the answer is not yet', async () => {
        const fixture = await open();
        await loaded(fixture);
        const asked = answerConfirm(false);

        fixture.componentInstance.editor()!.form.markAsDirty();
        fixture.componentInstance.save();
        await fixture.whenStable();

        expect(asked).toHaveBeenCalledTimes(1);
        expect(asked.mock.calls[0][0]?.nzTitle).toBe('configuration.warehouse.confirmEdit.title');
        TestBed.inject(HttpTestingController).expectNone((r) => r.url.endsWith(APIEndpoint.UPDATE_WAREHOUSE_DETAILS));
        expect(fixture.componentInstance.saving()).toBe(false);
    });

    it('shows no form at all when the record could not be loaded, and offers another go', async () => {
        const fixture = await open();
        TestBed.inject(HttpTestingController)
            .expectOne((r) => r.url.includes(APIEndpoint.GET_WAREHOUSE_DETAILS))
            .flush({ code: 500, message: 'boom' }, { status: 500, statusText: 'Server Error' });
        fixture.detectChanges();

        const element = fixture.nativeElement as HTMLElement;
        expect(element.querySelector('warehouse-form')).toBe(null);
        expect(element.textContent).toContain('configuration.warehouse.loadFailed.server');
        expect(element.textContent).toContain('form.retry');
    });
});
