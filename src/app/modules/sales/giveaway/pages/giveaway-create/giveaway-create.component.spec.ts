import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { provideNzI18n, en_US } from 'ng-zorro-antd/i18n';
import { provideTranslateService } from '@ngx-translate/core';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { PosBatch } from '@app/core/models/pos.model';
import { SessionService } from '@app/core/services/session/session.service';
import { OVERLAY_PROVIDERS } from '@app/shared/constants/overlay-providers';
import { GiveawayCreateComponent } from './giveaway-create.component';

const SCARF: PosBatch = { product_oid: 'p-1', product_name: 'Silk scarf', image_url: null, sku: 'SCARF-1', inventory_oid: 'b-1', batch_code: 'B-1', expiry_date: null, quantity_available: 5, sellable_quantity: 3, selling_price: 1450, maximum_discount: 0 };

const open = async (query: Record<string, string> = {}) => {
    await TestBed.configureTestingModule({
        imports: [GiveawayCreateComponent],
        providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), provideNzI18n(en_US), provideTranslateService({ fallbackLang: 'en' }), ...OVERLAY_PROVIDERS, { provide: SessionService, useValue: { can: () => true, menu: () => [], business: () => null, user: () => ({ name: 'Owner' }) } }, { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(query) } } }],
    }).compileComponents();
    const fixture = TestBed.createComponent(GiveawayCreateComponent);
    fixture.detectChanges();
    return { fixture, page: fixture.componentInstance, http: TestBed.inject(HttpTestingController), element: fixture.nativeElement as HTMLElement };
};

describe('GiveawayCreateComponent', () => {
    it('opened from a campaign, fills in the partner and sends the gift for their line on the campaign', async () => {
        const { page, element } = await open({ campaign_partner: 'cp-1', campaign: 'CM-2610-0001', partner: 'Style Diaries' });
        expect(page.name()).toBe('Style Diaries');
        expect(element.querySelector('[data-giveaway="campaign"]')).not.toBeNull();
        expect(page.campaign?.line).toBe('cp-1');
    });

    it('refuses to save without a name, a reason and a product, and sends nothing', async () => {
        const { fixture, page, http, element } = await open();
        page.save();
        fixture.detectChanges();
        expect(page.incomplete()).toBe(true);
        expect(element.querySelector('[data-giveaway="no-lines"]')?.classList).toContain('text-danger-ink');
        http.expectNone((r) => r.url.includes(APIEndpoint.CREATE_GIVEAWAY));
    });

    it('adds a picked batch once, raising its units, and never past what is free', async () => {
        const { page } = await open();
        page.add(SCARF);
        page.add(SCARF);
        page.add(SCARF);
        page.add(SCARF);
        expect(page.lines()).toEqual([{ inventory_oid: 'b-1', product_name: 'Silk scarf', batch_code: 'B-1', sellable: 3, quantity: 3 }]);
    });

    it('refuses a phone that is not a mobile number', async () => {
        const { page } = await open();
        page.name.set('Person A');
        page.note.set('Thank you');
        page.add(SCARF);
        page.phone.set('12345');
        expect(page.incomplete()).toBe(true);
        page.phone.set('01987-654321');
        expect(page.incomplete()).toBe(false);
    });
});
