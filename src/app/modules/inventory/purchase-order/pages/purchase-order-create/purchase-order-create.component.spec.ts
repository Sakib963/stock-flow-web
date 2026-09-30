import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideNzDateFnsAdapter } from 'ng-zorro-antd/core/time';
import { provideNzI18n, en_US } from 'ng-zorro-antd/i18n';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { provideTranslateService } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { PurchaseOrderCreateComponent } from './purchase-order-create.component';

const open = async () => {
    const answer = new Subject<boolean>();
    const errors: string[] = [];
    await TestBed.configureTestingModule({
        imports: [PurchaseOrderCreateComponent],
        providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), provideNzI18n(en_US), provideNzDateFnsAdapter(), provideTranslateService({ fallbackLang: 'en' }), { provide: NzModalService, useValue: { confirm: () => ({ afterClose: answer }) } }, { provide: NzMessageService, useValue: { error: (text: string) => errors.push(text), success: () => undefined, info: () => undefined } }],
    }).compileComponents();

    const fixture = TestBed.createComponent(PurchaseOrderCreateComponent);
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne((r) => r.url.endsWith(APIEndpoint.GET_SUPPLIER_LIST_FOR_DROPDOWN)).flush({ data: [{ value: 's-1', label: 'Garment house', phone_number: '01711000000', last_ordered_on: null }] });
    http.expectOne((r) => r.url.endsWith(APIEndpoint.GET_WAREHOUSE_LIST_FOR_DROPDOWN)).flush({ data: [] });
    http.expectOne((r) => r.url.endsWith(APIEndpoint.GET_AISLE_LIST_FOR_DROPDOWN)).flush({ data: [] });
    fixture.detectChanges();
    return { page: fixture.componentInstance, answer, errors, http };
};

describe('PurchaseOrderCreateComponent', () => {
    afterEach(() => TestBed.inject(HttpTestingController).verify({ ignoreCancelled: true }));

    it('says a product is missing when everything else is filled in, rather than pointing at fields that are not marked', async () => {
        const { page, errors } = await open();
        page.editor()!.form.patchValue({ supplier_oid: 's-1', purchase_type: 'instant', payment_status: 'paid' });

        page.save();

        expect(errors).toEqual(['inventory.purchaseOrder.needsProduct']);
    });

    it('asks before saving a draft, and spins the draft button rather than Submit', async () => {
        const { page, answer, http } = await open();
        page.editor()!.form.patchValue({ supplier_oid: 's-1' });

        page.saveDraft();
        expect([page.drafting(), page.submitting()]).toEqual([true, false]);
        http.expectNone((r) => r.url.includes(APIEndpoint.CREATE_PURCHASE_ORDER));

        answer.next(false);
        answer.complete();
        expect(page.drafting()).toBe(false);
        http.expectNone((r) => r.url.includes(APIEndpoint.CREATE_PURCHASE_ORDER));
    });
});
