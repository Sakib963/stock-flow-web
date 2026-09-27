import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNzI18n, en_US } from 'ng-zorro-antd/i18n';
import { provideTranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { Warehouse } from '@app/core/models/warehouse.model';
import { CodeGeneratorService } from '@app/shared/services/code-generator/code-generator.service';
import { WarehouseFormComponent } from './warehouse-form.component';

const SAREE: Warehouse = { oid: 'cat-1', name: 'Saree', code: 'SARE', location: 'Mohammadpur', capacity_units: 500, status: 'Inactive' };

const settle = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const open = async (applied?: string): Promise<ComponentFixture<WarehouseFormComponent>> => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
        imports: [WarehouseFormComponent],
        providers: [provideHttpClient(), provideHttpClientTesting(), provideNzI18n(en_US), provideTranslateService({ fallbackLang: 'en' }), { provide: CodeGeneratorService, useValue: { ask: () => of(applied) } }],
    }).compileComponents();

    const fixture = TestBed.createComponent(WarehouseFormComponent);
    fixture.detectChanges();
    return fixture;
};

describe('WarehouseFormComponent', () => {
    afterEach(() => TestBed.inject(HttpTestingController).verify({ ignoreCancelled: true }));

    it('renders its fields through ng-zorro form items rather than a hand-rolled label', async () => {
        const element = (await open()).nativeElement as HTMLElement;

        expect(element.querySelectorAll('nz-form-item').length).toBe(5);
        expect(element.querySelector('nz-form-label[nzrequired]') ?? element.querySelector('.ant-form-item-required')).toBeTruthy();
    });

    it('fills itself from the record it is given, and does not count that as typing', async () => {
        const fixture = await open();
        fixture.componentRef.setInput('editing', SAREE);
        fixture.detectChanges();

        expect(fixture.componentInstance.form.getRawValue()).toEqual({ name: 'Saree', code: 'SARE', capacity_units: 500, location: 'Mohammadpur', status: 'Inactive' });
        expect(fixture.componentInstance.form.dirty).toBe(false);
    });

    it('asks the server whether a name is free, once typing settles', async () => {
        const fixture = await open();
        const http = TestBed.inject(HttpTestingController);

        fixture.componentInstance.form.controls.name.setValue('Saree');
        http.expectNone((r) => r.url.endsWith(APIEndpoint.CHECK_WAREHOUSE_AVAILABILITY));

        await settle(450);
        const asked = http.expectOne((r) => r.url.endsWith(APIEndpoint.CHECK_WAREHOUSE_AVAILABILITY));
        expect(asked.request.params.get('value')).toBe('Saree');
        asked.flush({ code: 200, message: 'ok', data: { available: false } });

        expect(fixture.componentInstance.form.controls.name.hasError('taken')).toBe(true);
    });

    it('does not ask about the name and code the warehouse being edited already has', async () => {
        const fixture = await open();
        fixture.componentRef.setInput('editing', SAREE);
        fixture.detectChanges();
        fixture.componentInstance.form.controls.code.setValue('sare');
        await settle(450);

        TestBed.inject(HttpTestingController).expectNone((r) => r.url.endsWith(APIEndpoint.CHECK_WAREHOUSE_AVAILABILITY));
        expect(fixture.componentInstance.form.status).toBe('VALID');
    });

    it('asks once the name is changed, excluding the warehouse being edited so it cannot collide with itself', async () => {
        const fixture = await open();
        fixture.componentRef.setInput('editing', SAREE);
        fixture.detectChanges();
        fixture.componentInstance.form.controls.name.setValue('Sarees');
        await settle(450);

        const asked = TestBed.inject(HttpTestingController).expectOne((r) => r.url.endsWith(APIEndpoint.CHECK_WAREHOUSE_AVAILABILITY));
        expect(asked.request.params.get('value')).toBe('Sarees');
        expect(asked.request.params.get('oid')).toBe('cat-1');
        asked.flush({ code: 200, message: 'ok', data: { available: true } });
    });

    it('keeps the code helper under its field and moves the others into their label tooltip', async () => {
        const element = (await open()).nativeElement as HTMLElement;

        expect(element.querySelectorAll('.ant-form-item-extra').length).toBe(1);
        expect(element.querySelector('.ant-form-item-extra')?.textContent).toContain('configuration.warehouse.codeHelper');
        expect(element.querySelectorAll('.ant-form-item-tooltip').length).toBe(4);
    });

    it('sends the code in capitals, capacity as a number, and an empty location as nothing at all', async () => {
        const fixture = await open();
        fixture.componentInstance.form.setValue({ name: '  Saree  ', code: 'sare', capacity_units: '800' as unknown as number, location: '   ', status: 'Active' });

        expect(fixture.componentInstance.payload()).toEqual({ name: 'Saree', code: 'SARE', capacity_units: 800, location: null, status: 'Active' });
    });

    // Nothing reaches the field unless the person applied it in the modal.
    it('takes a generated code only when one comes back', async () => {
        const applied = await open('TRADCLO');
        applied.componentInstance.generateCode();
        expect(applied.componentInstance.form.controls.code.value).toBe('TRADCLO');

        const dismissed = await open(undefined);
        dismissed.componentInstance.form.controls.code.setValue('MINE');
        dismissed.componentInstance.generateCode();
        expect(dismissed.componentInstance.form.controls.code.value).toBe('MINE');
    });

    it('marks the field the server says collided as taken, so the refusal reads in both languages', async () => {
        const fixture = await open();
        fixture.componentInstance.reject('name');

        expect(fixture.componentInstance.form.controls.name.hasError('taken')).toBe(true);
    });

    // The code field is the one this got wrong: the id was built from the field name, so
    // `code` described itself as `warehouse-warehouse-code-help`, which is nothing at all.
    it('points every field at a helper that is really on the page', async () => {
        const fixture = await open();
        const element = fixture.nativeElement as HTMLElement;

        for (const control of element.querySelectorAll('[aria-describedby]')) {
            const id = control.getAttribute('aria-describedby')!;
            expect(element.querySelector(`#${id}`), `${id} is described by nothing`).toBeTruthy();
        }
    });

    // nz-select passes only nzId to its inner input, so a describedby on the host reached no one.
    it('describes the status on the input that takes focus, not on the select around it', async () => {
        const element = (await open()).nativeElement as HTMLElement;
        const input = element.querySelector('#warehouse-status')!;

        expect(input.getAttribute('aria-describedby')).toBe('warehouse-status-help');
        expect(element.querySelector('#warehouse-status-help')?.textContent).toContain('configuration.warehouse.statusHelper');
        expect(element.querySelector('nz-select')?.hasAttribute('aria-describedby')).toBe(false);
    });

    // A label may only be `for` a labelable element. On the <nz-select> host it named nothing, so
    // the control had no accessible name and clicking the label did not focus it.
    it('gives the status label a control to point at', async () => {
        const element = (await open()).nativeElement as HTMLElement;
        const target = element.querySelector('#warehouse-status');

        expect(target).toBeTruthy();
        expect(target!.tagName).toBe('INPUT');
    });
});
