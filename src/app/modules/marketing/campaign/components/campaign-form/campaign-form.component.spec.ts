import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideNzDateFnsAdapter } from 'ng-zorro-antd/core/time';
import { provideNzI18n, en_US } from 'ng-zorro-antd/i18n';
import { provideTranslateService } from '@ngx-translate/core';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { CampaignBatch } from '@app/core/models/campaign.model';
import { CampaignFormComponent } from './campaign-form.component';

const BATCH: CampaignBatch = { inventory_oid: 'b-1', batch_code: 'B-1', product_oid: 'p-1', product_name: 'Floral dress', sku: 'FD', units: 50, on_hand: 30, influencer_cost: 100, ad_run_cost: 20, gift_cost: 0, content_creation_cost: 0 };

const open = async () => {
    await TestBed.configureTestingModule({
        imports: [CampaignFormComponent],
        providers: [provideHttpClient(), provideHttpClientTesting(), provideNzI18n(en_US), provideNzDateFnsAdapter(), provideTranslateService({ fallbackLang: 'en' })],
    }).compileComponents();
    const fixture = TestBed.createComponent(CampaignFormComponent);
    fixture.detectChanges();
    TestBed.inject(HttpTestingController)
        .expectOne((r) => r.url.endsWith(APIEndpoint.GET_PARTNERS_FOR_CAMPAIGN))
        .flush({ data: [{ oid: 'pt-1', name: 'Style Diaries', partner_type: 'Page', platforms: [], handle: null }] });
    return fixture;
};

describe('CampaignFormComponent', () => {
    it('counts the name, type, posting window and a batch as still to fill in', async () => {
        const form = (await open()).componentInstance;
        expect(form.remaining()).toBe(4);
        form.form.patchValue({ name: 'Winter dresses', promotion_type: 'InfluencerPost', posting: [new Date(2026, 10, 2), new Date(2026, 10, 8)] });
        form.addBatch(BATCH);
        expect(form.remaining()).toBe(0);
    });

    it('sends the batches and partners it holds, the posting days as days, and an empty measuring end for the default', async () => {
        const form = (await open()).componentInstance;
        form.form.patchValue({ name: ' Winter dresses ', promotion_type: 'InfluencerPost', posting: [new Date(2026, 10, 2), new Date(2026, 10, 8)], ad_spend: 3000 });
        form.addBatch(BATCH);
        form.openPartner(null);
        form.savePartner({ partner_oid: 'pt-1', name: 'Style Diaries', partner_type: 'Page', agreed_fee: 5000, note: null });

        expect(form.valid()).toBe(true);
        expect(form.payload('c-1')).toEqual(expect.objectContaining({ oid: 'c-1', name: 'Winter dresses', posting_start: '2026-11-02', posting_end: '2026-11-08', measure_end: null, ad_spend: 3000, other_cost: null, batches: ['b-1'], partners: [{ partner_oid: 'pt-1', agreed_fee: 5000, note: null }] }));
        expect(form.fees()).toBe(5000);
    });

    it('shows each batch budget per unit and for the whole batch', async () => {
        const form = (await open()).componentInstance;
        form.addBatch(BATCH);
        expect(form.batchRows().map((r) => [r.perUnit, r.total])).toEqual([[120, 6000]]);
    });

    it('will not save a campaign with no batch', async () => {
        const form = (await open()).componentInstance;
        form.form.patchValue({ name: 'Eid', promotion_type: 'DiscountOffer', posting: [new Date(2026, 10, 2), new Date(2026, 10, 8)] });
        expect(form.valid()).toBe(false);
    });
});
