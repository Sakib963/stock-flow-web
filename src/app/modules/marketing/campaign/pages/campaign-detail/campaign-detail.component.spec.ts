import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { provideNzI18n, en_US } from 'ng-zorro-antd/i18n';
import { provideTranslateService } from '@ngx-translate/core';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { SessionService } from '@app/core/services/session/session.service';
import { OVERLAY_PROVIDERS } from '@app/shared/constants/overlay-providers';
import { CampaignDetailComponent } from './campaign-detail.component';

const record = (status: string, difference = 2000, payments_shown = false) => ({
    details: { oid: 'c-1', campaign_no: 'CM-2610-0001', name: 'Winter dresses', promotion_type: 'InfluencerPost', status, posting_start: '2026-11-02', posting_end: '2026-11-08', measure_end: '2026-11-11', ad_spend: 3000, other_cost: null, other_cost_note: null, note: null },
    batches: [{ inventory_oid: 'b-1', batch_code: 'B-1', product_oid: 'p-1', product_name: 'Floral dress', sku: 'FD', units: 50, on_hand: 30, influencer_cost: 100, ad_run_cost: 20, gift_cost: 0, content_creation_cost: 0 }],
    partners: [{ oid: 'cp-1', partner_oid: 'pt-1', name: 'Style Diaries', partner_type: 'Page', agreed_fee: 5000, note: null, deliverables: [{ oid: 'd-1', kind: 'Reel', quantity: 1, due_on: '2026-11-05', status: 'Pending', link: null, posted_on: null, note: null, past_due: true }], ...(payments_shown ? { paid: 2000, owed: 3000, payments: [{ oid: 'pp-1', amount: 2000, paid_on: '2026-11-03', payment_method: 'bKash', reference: 'TX-1', note: null }] } : {}) }],
    costs: { planned: { influencer_cost: 5000, ad_run_cost: 1000, gift_cost: 0, content_creation_cost: 0, total: 6000 }, agreed: { fees: 5000, ad_spend: 3000, other_cost: null, products: null, total: 8000 }, difference, over: [{ kind: 'influencer_cost', agreed: 5000, planned: 4000, over: 1000, product_oid: 'p-1', batch_code: 'B-1' }] },
    payments_shown,
    activity: [],
});

const open = async (status: string, permissions: string[]) => {
    const payments_shown = permissions.includes('marketing.partner-payment.view');
    await TestBed.configureTestingModule({
        imports: [CampaignDetailComponent],
        providers: [
            provideRouter([]),
            provideHttpClient(),
            provideHttpClientTesting(),
            provideNzI18n(en_US),
            provideTranslateService({ fallbackLang: 'en' }),
            ...OVERLAY_PROVIDERS,
            { provide: ActivatedRoute, useValue: { snapshot: { paramMap: new Map([['oid', 'c-1']]) } } },
            { provide: SessionService, useValue: { can: (code: string) => permissions.includes(code), menu: () => [] } },
        ],
    }).compileComponents();
    const fixture = TestBed.createComponent(CampaignDetailComponent);
    fixture.detectChanges();
    TestBed.inject(HttpTestingController)
        .expectOne((r) => r.url.endsWith(`${APIEndpoint.GET_CAMPAIGN_DETAILS}/c-1`))
        .flush({ code: 200, message: 'ok', data: record(status, 2000, payments_shown) });
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
};

const quick = (element: HTMLElement) => [...element.querySelectorAll('[data-quick]')].map((b) => b.getAttribute('data-quick'));
const ALL = ['marketing.campaign.view', 'marketing.campaign.edit', 'marketing.campaign.cancel'];

describe('CampaignDetailComponent', () => {
    it('offers Start and Cancel on a planned campaign, and Complete and Cancel once it is live', async () => {
        expect(quick(await open('Planned', ALL))).toEqual(['start', 'cancel']);
        TestBed.resetTestingModule();
        expect(quick(await open('Live', ALL))).toEqual(['complete', 'cancel']);
    });

    it('offers nothing on a completed campaign, and no Cancel to someone without the permission', async () => {
        expect(quick(await open('Completed', ALL))).toEqual([]);
        TestBed.resetTestingModule();
        expect(quick(await open('Planned', ['marketing.campaign.view', 'marketing.campaign.edit']))).toEqual(['start']);
    });

    it('shows what is owed and Record payment only to someone who may see and record payments', async () => {
        const element = await open('Live', [...ALL, 'marketing.partner-payment.view', 'marketing.partner-payment.create']);
        expect(element.querySelector('[data-partner-owed]')?.textContent).toContain('marketing.campaign.payment.owed');
        expect(element.querySelectorAll('[data-partner-payments] li').length).toBe(1);
        expect(element.querySelector('[data-partner-pay]')).not.toBeNull();
        TestBed.resetTestingModule();
        const runner = await open('Live', ALL);
        expect(runner.querySelector('[data-partner-owed]')).toBeNull();
        expect(runner.querySelector('[data-partner-pay]')).toBeNull();
    });

    it('tips that a kind of cost is over its budget and offers to give products while the campaign runs', async () => {
        const element = await open('Live', [...ALL, 'sales.giveaway.create']);
        expect(element.querySelector('[data-over="influencer_cost"]')).not.toBeNull();
        expect(element.querySelector('[data-partner-give]')).not.toBeNull();
        TestBed.resetTestingModule();
        expect((await open('Completed', [...ALL, 'sales.giveaway.create'])).querySelector('[data-partner-give]')).toBeNull();
    });

    it('hints at a promised post past due, and offers to add, change or remove promises only to someone who runs campaigns', async () => {
        const element = await open('Completed', ALL);
        expect(element.querySelector('[data-past-due]')).not.toBeNull();
        expect(element.querySelector('[data-partner-promise]')).not.toBeNull();
        expect(element.querySelector('[data-deliverable-remove]')).not.toBeNull();
        TestBed.resetTestingModule();
        const viewer = await open('Live', ['marketing.campaign.view']);
        expect(viewer.querySelector('[data-past-due]')).not.toBeNull();
        expect(viewer.querySelector('[data-partner-promise]')).toBeNull();
        expect(viewer.querySelector('[data-deliverable-change]')).toBeNull();
    });

    it('shows planned against agreed with what it is over by', async () => {
        const element = await open('Planned', ALL);
        expect(element.querySelector('[data-cost="planned"]')?.textContent).toContain('6,000');
        expect(element.querySelector('[data-cost="agreed"]')?.textContent).toContain('marketing.campaign.notRecorded');
        expect(element.querySelector('[data-cost="difference"]')?.textContent).toContain('marketing.campaign.overBudget');
    });
});
