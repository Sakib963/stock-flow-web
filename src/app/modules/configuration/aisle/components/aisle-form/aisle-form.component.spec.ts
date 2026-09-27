import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNzI18n, en_US } from 'ng-zorro-antd/i18n';
import { provideTranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { Aisle } from '@app/core/models/aisle.model';
import { SessionService } from '@app/core/services/session/session.service';
import { OVERLAY_PROVIDERS } from '@app/shared/constants/overlay-providers';
import { CodeGeneratorService } from '@app/shared/services/code-generator/code-generator.service';
import { AisleFormComponent } from './aisle-form.component';

const WAREHOUSES = { code: 200, message: 'ok', data: [{ value: 'c1', label: 'Clothing' }, { value: 'c2', label: 'Footwear' }] };

const SAREES: Aisle = { oid: 'sc-1', name: 'Sarees', code: 'SARE', warehouse_oid: 'c9', warehouse_name: 'Retired', storage_type: null, capacity_units: null, special_notes: null, status: 'Active' };

const settle = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const isDropdown = (r: { url: string }) => r.url.endsWith(APIEndpoint.GET_WAREHOUSE_LIST_FOR_DROPDOWN);
const isAvailability = (r: { url: string }) => r.url.endsWith(APIEndpoint.CHECK_AISLE_AVAILABILITY);

const open = async (permissions: string[] = ['configuration.warehouse.create']): Promise<ComponentFixture<AisleFormComponent>> => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
        imports: [AisleFormComponent],
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

    const fixture = TestBed.createComponent(AisleFormComponent);
    fixture.detectChanges();
    TestBed.inject(HttpTestingController).expectOne(isDropdown).flush(WAREHOUSES);
    fixture.detectChanges();
    return fixture;
};

describe('AisleFormComponent', () => {
    afterEach(() => TestBed.inject(HttpTestingController).verify({ ignoreCancelled: true }));

    it('offers the Active warehouses as parents', async () => {
        const fixture = await open();
        expect(fixture.componentInstance.warehouses().map((c) => c.label)).toEqual(['Clothing', 'Footwear']);
        expect(fixture.componentInstance.warehousesLoading()).toBe(false);
    });

    it('offers to add a warehouse only to someone who may add one', async () => {
        expect((await open()).componentInstance.canAddWarehouse()).toBe(true);
        expect((await open([])).componentInstance.canAddWarehouse()).toBe(false);
    });

    it('does not ask about a name until a warehouse is picked, then asks within that warehouse', async () => {
        const fixture = await open();
        const http = TestBed.inject(HttpTestingController);

        fixture.componentInstance.form.controls.name.setValue('Sarees');
        await settle(450);
        http.expectNone(isAvailability);

        fixture.componentInstance.form.controls.warehouse_oid.setValue('c1');
        await settle(450);
        const asked = http.expectOne(isAvailability);
        expect(asked.request.params.get('warehouse_oid')).toBe('c1');
        asked.flush({ code: 200, message: 'ok', data: { available: false } });

        expect(fixture.componentInstance.form.controls.name.hasError('taken')).toBe(true);
    });

    it('asks about the name again when the warehouse changes, since a name is only unique within one', async () => {
        const fixture = await open();
        const http = TestBed.inject(HttpTestingController);
        fixture.componentInstance.form.controls.warehouse_oid.setValue('c1');
        fixture.componentInstance.form.controls.name.setValue('Men');
        await settle(450);
        http.expectOne(isAvailability).flush({ code: 200, message: 'ok', data: { available: false } });

        fixture.componentInstance.form.controls.warehouse_oid.setValue('c2');
        await settle(450);
        const again = http.expectOne(isAvailability);
        expect(again.request.params.get('warehouse_oid')).toBe('c2');
        again.flush({ code: 200, message: 'ok', data: { available: true } });

        expect(fixture.componentInstance.form.controls.name.valid).toBe(true);
    });

    it('opens the drawer with whatever was typed in the warehouse search', async () => {
        const fixture = await open();
        fixture.componentInstance.warehouseSearch.set('Jewellery');
        fixture.componentInstance.openQuickAdd();

        expect(fixture.componentInstance.quickAddName()).toBe('Jewellery');
    });

    it('picks a warehouse the moment it is added, and keeps what was typed', async () => {
        const fixture = await open();
        const form = fixture.componentInstance.form;
        form.controls.name.setValue('Earrings');
        fixture.componentInstance.openQuickAdd();

        fixture.componentInstance.warehouseAdded({ oid: 'c3', name: 'Accessories' });

        expect(form.controls.warehouse_oid.value).toBe('c3');
        expect(form.controls.name.value).toBe('Earrings');
        expect(fixture.componentInstance.warehouses().map((c) => c.label)).toEqual(['Accessories', 'Clothing', 'Footwear']);
        expect(fixture.componentInstance.quickAddName()).toBeNull();

        await settle(450);
        TestBed.inject(HttpTestingController)
            .match(isAvailability)
            .forEach((r) => r.flush({ code: 200, message: 'ok', data: { available: true } }));
    });

    it('still names the warehouse of an aisle being edited after that warehouse was turned off', async () => {
        const fixture = await open();
        fixture.componentRef.setInput('editing', SAREES);
        fixture.detectChanges();

        expect(fixture.componentInstance.warehouses()[0]).toEqual({ value: 'c9', label: 'Retired' });
        expect(fixture.componentInstance.form.controls.warehouse_oid.value).toBe('c9');
        expect(fixture.componentInstance.form.dirty).toBe(false);
    });

    it('sends the code in capitals, capacity as a number, empty notes as null, and the warehouse it was given', async () => {
        const fixture = await open();
        fixture.componentInstance.form.setValue({ warehouse_oid: 'c1', name: ' Sarees ', code: 'sare', storage_type: 'shelf', capacity_units: '40' as unknown as number, special_notes: ' ', status: 'Active' });

        expect(fixture.componentInstance.payload()).toEqual({ name: 'Sarees', code: 'SARE', warehouse_oid: 'c1', storage_type: 'shelf', capacity_units: 40, special_notes: null, status: 'Active' });
        await settle(450);
        TestBed.inject(HttpTestingController)
            .match(isAvailability)
            .forEach((r) => r.flush({ code: 200, message: 'ok', data: { available: true } }));
    });
});
