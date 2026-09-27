import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideNzI18n, en_US } from 'ng-zorro-antd/i18n';
import { NzModalRef, NzModalService } from 'ng-zorro-antd/modal';
import { provideTranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { OVERLAY_PROVIDERS } from '@app/shared/constants/overlay-providers';
import { ProductCreateComponent } from './product-create.component';

const ROUTES = [{ path: 'app/configuration/products', children: [{ path: '**', children: [] }] }];

const answerConfirm = (yes: boolean) => vi.spyOn(TestBed.inject(NzModalService), 'confirm').mockImplementation(() => ({ afterClose: of(yes) }) as unknown as NzModalRef);

const open = async (): Promise<ComponentFixture<ProductCreateComponent>> => {
    await TestBed.configureTestingModule({
        imports: [ProductCreateComponent],
        providers: [provideRouter(ROUTES), provideHttpClient(), provideHttpClientTesting(), provideNzI18n(en_US), provideTranslateService({ fallbackLang: 'en' }), ...OVERLAY_PROVIDERS],
    }).compileComponents();

    const fixture = TestBed.createComponent(ProductCreateComponent);
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne((r) => r.url.endsWith(APIEndpoint.GET_SUB_CATEGORY_LIST_FOR_DROPDOWN)).flush({ data: [{ value: 'sc-1', label: 'Kurti', groupLabel: 'Clothing' }] });
    http.expectOne((r) => r.url.endsWith(APIEndpoint.GET_BRAND_LIST_FOR_DROPDOWN)).flush({ data: [] });
    answerConfirm(true);
    return fixture;
};

/** A blank SKU sets off no availability check, so the form is valid at once. */
const fill = (fixture: ComponentFixture<ProductCreateComponent>) => fixture.componentInstance.editor()!.form.patchValue({ name: 'Cotton Kurti', sub_category_oid: 'sc-1', restock_threshold: 5 });

const saveAndAnswer = async (fixture: ComponentFixture<ProductCreateComponent>, body: object, status = 200) => {
    fixture.componentInstance.save();
    await fixture.whenStable();
    TestBed.inject(HttpTestingController)
        .expectOne((r) => r.url.endsWith(APIEndpoint.CREATE_PRODUCT))
        .flush(body, { status, statusText: status === 200 ? 'OK' : 'Refused' });
    await fixture.whenStable();
    fixture.detectChanges();
};

describe('ProductCreateComponent', () => {
    afterEach(() => TestBed.inject(HttpTestingController).verify({ ignoreCancelled: true }));

    it('sends a blank SKU as none, so the server makes one, and opens the product it created', async () => {
        const fixture = await open();
        fill(fixture);
        fixture.componentInstance.save();
        await fixture.whenStable();

        const sent = TestBed.inject(HttpTestingController).expectOne((r) => r.url.endsWith(APIEndpoint.CREATE_PRODUCT));
        expect(sent.request.body.sku).toBeNull();
        sent.flush({ code: 200, message: 'ok', data: { oid: 'new-1' } });
        await fixture.whenStable();

        expect(TestBed.inject(Router).url).toContain('/app/configuration/products/new-1');
    });

    it('marks the SKU as taken when the server refuses it, and keeps everything typed', async () => {
        const fixture = await open();
        fill(fixture);
        fixture.componentInstance.editor()!.form.controls.sku.setValue('SAR-1');
        // The check said free a moment ago; the database is what refuses.
        await new Promise((resolve) => setTimeout(resolve, 450));
        TestBed.inject(HttpTestingController)
            .match((r) => r.url.endsWith(APIEndpoint.CHECK_PRODUCT_AVAILABILITY))
            .forEach((request) => request.flush({ data: { available: true } }));

        await saveAndAnswer(fixture, { code: 409, message: 'taken', data: { field: 'sku' } }, 409);

        const form = fixture.componentInstance.editor()!.form;
        expect(form.controls.sku.hasError('taken')).toBe(true);
        expect(form.controls.name.value).toBe('Cotton Kurti');
    });

    it('marks the sub-category when it was turned off while the form was open', async () => {
        const fixture = await open();
        fill(fixture);

        await saveAndAnswer(fixture, { code: 400, message: 'inactive', data: { field: 'sub_category_oid' } }, 400);

        expect(fixture.componentInstance.editor()!.form.controls.sub_category_oid.hasError('inactive')).toBe(true);
    });

    it('asks before adding, and adds nothing when the answer is not yet', async () => {
        const fixture = await open();
        fill(fixture);
        const asked = answerConfirm(false);

        fixture.componentInstance.save();
        await fixture.whenStable();

        expect(asked.mock.calls[0][0]?.nzTitle).toBe('configuration.product.confirmCreate.title');
        TestBed.inject(HttpTestingController).expectNone((r) => r.url.endsWith(APIEndpoint.CREATE_PRODUCT));
    });
});
