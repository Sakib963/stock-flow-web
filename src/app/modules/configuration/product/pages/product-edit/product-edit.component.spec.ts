import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { provideNzI18n, en_US } from 'ng-zorro-antd/i18n';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalRef, NzModalService } from 'ng-zorro-antd/modal';
import { provideTranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { OVERLAY_PROVIDERS } from '@app/shared/constants/overlay-providers';
import { ProductEditComponent } from './product-edit.component';

const ROUTES = [{ path: 'app/configuration/products', children: [{ path: '**', children: [] }] }];

const KURTI = { oid: 'p-1', name: 'Cotton Kurti', sku: 'COTTKUR', photo: null, unit_type: 'pcs', description: null, restock_threshold: 5, status: 'Active', category_oid: 'c-1', category_name: 'Clothing', sub_category_oid: 'sc-1', sub_category_name: 'Kurti', brand_oid: null };

const open = async (): Promise<ComponentFixture<ProductEditComponent>> => {
    await TestBed.configureTestingModule({
        imports: [ProductEditComponent],
        providers: [
            provideRouter(ROUTES),
            provideHttpClient(),
            provideHttpClientTesting(),
            provideNzI18n(en_US),
            provideTranslateService({ fallbackLang: 'en' }),
            ...OVERLAY_PROVIDERS,
            { provide: ActivatedRoute, useValue: { snapshot: { paramMap: new Map([['oid', 'p-1']]) } } },
        ],
    }).compileComponents();

    const fixture = TestBed.createComponent(ProductEditComponent);
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne((r) => r.url.includes(APIEndpoint.GET_PRODUCT_DETAILS)).flush({ data: { details: KURTI, stock: { on_hand: 0, held: 0, sellable: 0, batches: [] }, lifetime: { sold: 0, returned: 0, damaged: 0, last_sold_on: null }, activity: [] } });
    fixture.detectChanges();
    http.expectOne((r) => r.url.endsWith(APIEndpoint.GET_SUB_CATEGORY_LIST_FOR_DROPDOWN)).flush({ data: [{ value: 'sc-1', label: 'Kurti', groupLabel: 'Clothing' }] });
    http.expectOne((r) => r.url.endsWith(APIEndpoint.GET_BRAND_LIST_FOR_DROPDOWN)).flush({ data: [] });
    vi.spyOn(TestBed.inject(NzModalService), 'confirm').mockImplementation(() => ({ afterClose: of(true) }) as unknown as NzModalRef);
    return fixture;
};

describe('ProductEditComponent', () => {
    afterEach(() => TestBed.inject(HttpTestingController).verify({ ignoreCancelled: true }));

    it('fills the form from the product without counting that as a change', async () => {
        const fixture = await open();
        const form = fixture.componentInstance.editor()!.form;

        expect(form.controls.sku.value).toBe('COTTKUR');
        expect(form.dirty).toBe(false);
    });

    it('sends nothing when Save is pressed on an untouched form, and says so', async () => {
        const fixture = await open();
        const info = vi.spyOn(TestBed.inject(NzMessageService), 'info');

        fixture.componentInstance.save();
        await fixture.whenStable();

        TestBed.inject(HttpTestingController).expectNone((r) => r.url.endsWith(APIEndpoint.UPDATE_PRODUCT_DETAILS));
        expect(info).toHaveBeenCalledWith('form.nothingChanged');
    });

    it('saves a changed restock level with the product it belongs to', async () => {
        const fixture = await open();
        const form = fixture.componentInstance.editor()!.form;
        form.controls.restock_threshold.setValue(9);
        form.markAsDirty();

        fixture.componentInstance.save();
        await fixture.whenStable();

        const sent = TestBed.inject(HttpTestingController).expectOne((r) => r.url.endsWith(APIEndpoint.UPDATE_PRODUCT_DETAILS));
        expect(sent.request.body).toEqual(expect.objectContaining({ oid: 'p-1', restock_threshold: 9, sku: 'COTTKUR' }));
        sent.flush({ code: 200, message: 'ok' });
    });
});
