import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideNzI18n, en_US } from 'ng-zorro-antd/i18n';
import { provideTranslateService } from '@ngx-translate/core';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { SupplierListComponent } from './supplier-list.component';

const PAGE = { code: 200, message: 'ok', data: { rows: [{ oid: 'c-1', name: 'Dhaka Saree House', phone_number: '01911223344', status: 'Active' }] }, total: 31 };

describe('SupplierListComponent', () => {
    afterEach(() => vi.useRealTimers());

    it('opens without error and shows the supplier count beside the title once the list loads', async () => {
        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] });
        await TestBed.configureTestingModule({
            imports: [SupplierListComponent],
            providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), provideNzI18n(en_US), provideTranslateService({ fallbackLang: 'en' })],
        }).compileComponents();

        const fixture = TestBed.createComponent(SupplierListComponent);
        fixture.detectChanges();
        await vi.advanceTimersByTimeAsync(0);

        TestBed.inject(HttpTestingController)
            .expectOne((r) => r.url.endsWith(APIEndpoint.GET_SUPPLIER_LIST))
            .flush(PAGE);
        await vi.advanceTimersByTimeAsync(400);
        fixture.detectChanges();

        const el = fixture.nativeElement as HTMLElement;
        expect(el.querySelector('[data-page-header="count"]')?.textContent?.trim()).toBe('31');
        expect(el.querySelectorAll('[data-table="row"]').length).toBe(1);
    });
});
