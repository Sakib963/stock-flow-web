import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { provideNzI18n, en_US } from 'ng-zorro-antd/i18n';
import { provideTranslateService } from '@ngx-translate/core';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { SessionService } from '@app/core/services/session/session.service';
import { CategoryDetailComponent } from './category-detail.component';

const DETAILS = {
    code: 200,
    message: 'ok',
    data: {
        details: { oid: 'cat-1', name: 'Saree', category_code: 'SARE', description: 'Everyday and festive', status: 'Active', created_on: '2026-09-01T10:00:00.000', last_action_on: '2026-09-20T10:00:00.000' },
        stats: { totalProducts: 12, activeProducts: 11, amountSpent: 48250, totalAvailableQuantity: 340, lowStockItems: 2, outOfStockItems: 0, averageProductPrice: 1200 },
        activity: [{ date: '2026-09-20T10:00:00.000', user: 'owner@samiha.test', action: 'Updated category', description: 'Status changed from "Inactive" to "Active"' }],
    },
};

const open = async (permissions: string[] = ['configuration.category.view', 'configuration.category.edit']) => {
    await TestBed.configureTestingModule({
        imports: [CategoryDetailComponent],
        providers: [
            provideRouter([]),
            provideHttpClient(),
            provideHttpClientTesting(),
            provideNzI18n(en_US),
            provideTranslateService({ fallbackLang: 'en' }),
            { provide: ActivatedRoute, useValue: { snapshot: { paramMap: new Map([['oid', 'cat-1']]) } } },
            // The page header reads the menu for its breadcrumb, so the fake has to answer it.
            { provide: SessionService, useValue: { can: (code: string) => permissions.includes(code), menu: () => [] } },
        ],
    }).compileComponents();

    const fixture = TestBed.createComponent(CategoryDetailComponent);
    fixture.detectChanges();
    return fixture;
};

describe('CategoryDetailComponent', () => {
    afterEach(() => TestBed.inject(HttpTestingController).verify());

    it('shows the record, the numbers someone would otherwise count by hand, and its activity', async () => {
        const fixture = await open();
        TestBed.inject(HttpTestingController)
            .expectOne((r) => r.url.includes(APIEndpoint.GET_CATEGORY_DETAILS))
            .flush(DETAILS);
        fixture.detectChanges();

        const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
        expect(text).toContain('Saree');
        expect(text).toContain('SARE');
        expect(text).toContain('12');
        expect(text).toContain('340');
        expect(text).toContain('Status changed from "Inactive" to "Active"');
    });

    it('leaves Edit out for someone who may only view, rather than showing it greyed out', async () => {
        const fixture = await open(['configuration.category.view']);
        TestBed.inject(HttpTestingController)
            .expectOne((r) => r.url.includes(APIEndpoint.GET_CATEGORY_DETAILS))
            .flush(DETAILS);
        fixture.detectChanges();

        const buttons = [...(fixture.nativeElement as HTMLElement).querySelectorAll('button')];
        expect(buttons.some((b) => b.textContent?.includes('configuration.category.edit'))).toBe(false);
    });

    it('says the record could not be loaded and offers another go, rather than showing an empty page', async () => {
        const fixture = await open();
        TestBed.inject(HttpTestingController)
            .expectOne((r) => r.url.includes(APIEndpoint.GET_CATEGORY_DETAILS))
            .flush({ code: 500, message: 'boom' }, { status: 500, statusText: 'Server Error' });
        fixture.detectChanges();

        const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
        expect(text).toContain('configuration.category.loadFailed');
        expect(text).toContain('form.retry');
    });
});
