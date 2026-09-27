import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNzI18n, en_US } from 'ng-zorro-antd/i18n';
import { provideTranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { Product } from '@app/core/models/product.model';
import { CodeGeneratorService } from '@app/shared/services/code-generator/code-generator.service';
import { ProductFormComponent } from './product-form.component';

const KURTI: Product = {
    oid: 'p-1',
    name: 'Cotton Kurti',
    sku: 'COTTKUR',
    photo: null,
    unit_type: 'pcs',
    description: null,
    restock_threshold: 5,
    status: 'Active',
    category_oid: 'c-1',
    category_name: 'Women',
    sub_category_oid: 'sc-old',
    sub_category_name: 'Kurti',
    brand_oid: null,
};

const open = async (): Promise<ComponentFixture<ProductFormComponent>> => {
    await TestBed.configureTestingModule({
        imports: [ProductFormComponent],
        providers: [provideHttpClient(), provideHttpClientTesting(), provideNzI18n(en_US), provideTranslateService({ fallbackLang: 'en' }), { provide: CodeGeneratorService, useValue: { ask: () => of('SCARF') } }],
    }).compileComponents();

    const fixture = TestBed.createComponent(ProductFormComponent);
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne((r) => r.url.endsWith(APIEndpoint.GET_SUB_CATEGORY_LIST_FOR_DROPDOWN)).flush({ data: [{ value: 'sc-1', label: 'Saree', groupLabel: 'Women' }] });
    http.expectOne((r) => r.url.endsWith(APIEndpoint.GET_BRAND_LIST_FOR_DROPDOWN)).flush({ data: [{ value: 'b-1', label: 'Aarong' }] });
    return fixture;
};

describe('ProductFormComponent', () => {
    afterEach(() => TestBed.inject(HttpTestingController).verify({ ignoreCancelled: true }));

    it('sends a blank SKU as none, so the server makes one, and a typed one in capitals', async () => {
        const form = (await open()).componentInstance;
        form.form.patchValue({ name: ' Scarf ', sub_category_oid: 'sc-1', restock_threshold: 3 });

        expect(form.payload()).toEqual(expect.objectContaining({ name: 'Scarf', sku: null, restock_threshold: 3, brand_oid: null, unit_type: null, photo: null }));

        form.form.controls.sku.setValue('bag-01');
        expect(form.payload().sku).toBe('BAG-01');
    });

    it('keeps an edited product under its sub-category even after that has been turned off', async () => {
        const fixture = await open();
        fixture.componentRef.setInput('editing', KURTI);
        fixture.detectChanges();

        const labels = fixture.componentInstance.subCategoryGroups().flatMap((group) => group.options.map((o) => o.label));
        expect(labels).toContain('Kurti');
        expect(fixture.componentInstance.form.dirty).toBe(false);
    });

    it('will not be sent while a photo is still uploading', async () => {
        const form = (await open()).componentInstance;
        form.form.patchValue({ name: 'Scarf', sub_category_oid: 'sc-1' });
        form.photoBusyChanged(true);

        let ready: boolean | undefined;
        form.ready().subscribe((value) => (ready = value));
        expect(ready).toBe(false);

        form.photoBusyChanged(false);
        form.photoChanged('https://res.cloudinary.com/stockflow/image/upload/v1/scarf.jpg');
        form.ready().subscribe((value) => (ready = value));
        expect(ready).toBe(true);
        expect(form.payload().photo).toBe('https://res.cloudinary.com/stockflow/image/upload/v1/scarf.jpg');
    });

    it('refuses a SKU a scanner could not read back', async () => {
        const form = (await open()).componentInstance;
        form.form.controls.sku.setValue('SAR 1');
        expect(form.form.controls.sku.hasError('pattern')).toBe(true);
    });
});
