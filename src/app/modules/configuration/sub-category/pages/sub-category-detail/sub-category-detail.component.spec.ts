import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { provideNzI18n, en_US } from 'ng-zorro-antd/i18n';
import { provideTranslateService } from '@ngx-translate/core';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { SessionService } from '@app/core/services/session/session.service';
import { SubCategoryDetailComponent } from './sub-category-detail.component';

const DETAILS = {
    code: 200,
    message: 'ok',
    data: {
        details: { oid: 'sc-1', name: 'Sarees', category_code: 'SARE', category_oid: 'c1', category_name: 'Clothing', description: null, status: 'Active', created_by: 'owner@samiha.test', created_on: '2026-09-01T10:00:00.000', last_action_by: 'owner@samiha.test', last_action_on: '2026-09-20T10:00:00.000' },
        stats: { totalProducts: 8, activeProducts: 7, amountSpent: 48250, totalAvailableQuantity: 140, lowStockItems: 2, outOfStockItems: 1, averageProductPrice: 3250 },
        activity: [{ oid: 'log-1', date: '2026-09-20T10:00:00.000', user: 'owner@samiha.test', action: 'Created sub-category', description: 'Created sub-category "Sarees" with code SARE' }],
    },
};

const open = async (permissions: string[]) => {
    await TestBed.configureTestingModule({
        imports: [SubCategoryDetailComponent],
        providers: [
            provideRouter([]),
            provideHttpClient(),
            provideHttpClientTesting(),
            provideNzI18n(en_US),
            provideTranslateService({ fallbackLang: 'en' }),
            { provide: ActivatedRoute, useValue: { snapshot: { paramMap: new Map([['oid', 'sc-1']]) } } },
            { provide: SessionService, useValue: { can: (code: string) => permissions.includes(code), menu: () => [] } },
        ],
    }).compileComponents();

    const fixture = TestBed.createComponent(SubCategoryDetailComponent);
    fixture.detectChanges();
    TestBed.inject(HttpTestingController)
        .expectOne((r) => r.url.includes(APIEndpoint.GET_SUB_CATEGORY_DETAILS))
        .flush(DETAILS);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
};

describe('SubCategoryDetailComponent', () => {
    afterEach(() => TestBed.inject(HttpTestingController).verify());

    it('shows the record, its category and its numbers', async () => {
        const text = (await open(['configuration.sub-category.view'])).textContent ?? '';
        expect(text).toContain('Sarees');
        expect(text).toContain('Clothing');
        expect(text).toContain('140');
        expect(text).toContain('Created sub-category "Sarees"');
    });

    it('links the category to its record only for someone who may view categories', async () => {
        expect((await open(['configuration.sub-category.view', 'configuration.category.view'])).querySelector('[data-detail="category"] a')).not.toBeNull();
        TestBed.resetTestingModule();
        expect((await open(['configuration.sub-category.view'])).querySelector('[data-detail="category"] a')).toBeNull();
    });

    it('leaves Edit and both reports out for someone who may only view', async () => {
        const element = await open(['configuration.sub-category.view']);
        const buttons = [...element.querySelectorAll('button')];
        expect(buttons.some((b) => b.textContent?.includes('configuration.subCategory.edit'))).toBe(false);
        expect(element.querySelectorAll('[data-report]').length).toBe(0);
    });

    it('offers both reports to someone who may export', async () => {
        const element = await open(['configuration.sub-category.view', 'configuration.sub-category.export']);
        expect(element.querySelectorAll('[data-report]').length).toBe(2);
    });
});
