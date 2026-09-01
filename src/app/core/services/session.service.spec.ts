import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { SessionService } from './session.service';
import { SessionPayload } from '@app/core/models/session.model';
import { LanguageService } from './language.service';
import { APIEndpoint } from '@app/core/constants/api-endpoint';

const payload: SessionPayload = {
    version: 'abc123',
    user: { name: 'Samiha', email: 'owner@shop.com', mobile_number: null, photo: null, designation: 'Owner', role: 'Owner' },
    business: { name: 'Samiha Style Studio', logoUrl: null, orderSystem: 'both' },
    permissions: ['dashboard.overview.view', 'sales.order.view', 'sales.order.confirm'],
    menu: [
        { id: 'dashboard', label: { en: 'Dashboard', bn: 'ড্যাশবোর্ড' }, description: { en: 'Overview', bn: 'সারসংক্ষেপ' }, tags: ['home'], icon: 'lucideLayoutDashboard', order: 0, route: '/app/dashboard', permission: 'dashboard.overview.view', isDisabled: false, disabledMessage: { en: null, bn: null }, isNew: true, children: [] },
        {
            id: 'sales',
            label: { en: 'Sales', bn: 'বিক্রি' },
            description: { en: null, bn: null },
            tags: [],
            icon: 'lucideShoppingCart',
            order: 10,
            route: null,
            permission: null,
            isDisabled: false,
            disabledMessage: { en: null, bn: null },
            isNew: false,
            children: [
                { id: 'sales-returns', label: { en: 'Returns', bn: 'ফেরত' }, description: { en: 'Goods coming back.', bn: 'ফেরত আসা পণ্য।' }, tags: ['refund', 'ফেরত'], icon: 'lucideUndo2', order: 0, route: '/app/sales/returns', permission: 'sales.return.view', isDisabled: true, disabledMessage: { en: 'Being rebuilt.', bn: 'নতুন করে তৈরি হচ্ছে।' }, isNew: false, children: [] },
            ],
        },
    ],
    counters: { notifications: 0 },
};

describe('SessionService', () => {
    let service: SessionService;

    beforeEach(async () => {
        localStorage.clear();
        TestBed.configureTestingModule({
            providers: [provideHttpClient(), provideHttpClientTesting(), provideTranslateService({ fallbackLang: 'en' })],
        });
        service = TestBed.inject(SessionService);

        const load = service.load();
        TestBed.inject(HttpTestingController)
            .expectOne((r) => r.url.includes(APIEndpoint.GET_USER_INFO))
            .flush({ code: 200, data: payload });
        await load;
    });

    afterEach(() => localStorage.clear());

    it('exposes who is signed in and the business', () => {
        expect(service.loaded()).toBe(true);
        expect(service.user()?.role).toBe('Owner');
        expect(service.business()?.name).toBe('Samiha Style Studio');
    });

    it('answers can() from the permission set', () => {
        expect(service.can('sales.order.confirm')).toBe(true);
        expect(service.can('sales.order.refund')).toBe(false);
        expect(service.canAny('nope.a.b', 'sales.order.view')).toBe(true);
    });

    it('follows the language for labels', () => {
        const dashboard = service.menu()[0];
        expect(service.label(dashboard)).toBe('Dashboard');

        TestBed.inject(LanguageService).use('bn');
        expect(service.label(dashboard)).toBe('ড্যাশবোর্ড');
    });

    it('finds a feature by an English tag', () => {
        expect(service.search('refund').map((i) => i.id)).toEqual(['sales-returns']);
    });

    it('finds the same feature by its Bengali tag', () => {
        // The whole reason tags hold both languages in one array.
        expect(service.search('ফেরত').map((i) => i.id)).toEqual(['sales-returns']);
    });

    it('searches leaves only, never group headers', () => {
        // "Sales" is a group with no route; navigating to it would do nothing.
        expect(service.search('sales')).toEqual([]);
    });

    it('returns nothing for an empty term', () => {
        expect(service.search('   ')).toEqual([]);
    });

    it('reports why a feature is present but unusable', () => {
        const returns = service.menu()[1].children[0];
        expect(returns.isDisabled).toBe(true);
        expect(service.disabledMessage(returns)).toBe('Being rebuilt.');

        TestBed.inject(LanguageService).use('bn');
        expect(service.disabledMessage(returns)).toBe('নতুন করে তৈরি হচ্ছে।');
    });

    it('still returns a disabled feature from search, so it can explain itself', () => {
        // Absent means no permission. Disabled means allowed but not ready, and hiding it would
        // leave the user hunting for something they were told exists.
        expect(service.search('refund').map((i) => i.id)).toEqual(['sales-returns']);
    });

    it('carries the new flag', () => {
        expect(service.menu()[0].isNew).toBe(true);
    });

    it('clears on sign out', () => {
        service.clear();
        expect(service.loaded()).toBe(false);
        expect(service.can('sales.order.view')).toBe(false);
    });
});
