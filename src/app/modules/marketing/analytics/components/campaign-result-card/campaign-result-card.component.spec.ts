import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideNzI18n, en_US } from 'ng-zorro-antd/i18n';
import { provideTranslateService } from '@ngx-translate/core';
import { CampaignResult } from '@app/core/models/marketing-analytics.model';
import { CampaignResultCardComponent } from './campaign-result-card.component';

// The worked example of the marketing analytics document.
const EXAMPLE: CampaignResult = {
    oid: 'c-1',
    campaign_no: 'CM-2609-0001',
    name: 'Winter dresses',
    promotion_type: 'InfluencerPost',
    status: 'Completed',
    cost: 15000,
    no_cost_recorded: false,
    window_from: '2026-09-02',
    window_to: '2026-09-15',
    before_from: '2026-08-19',
    before_to: '2026-09-01',
    days: 14,
    so_far: false,
    promoted_before: 40,
    promoted_window: 70,
    rest_before: 500,
    rest_window: 600,
    business_before: 0,
    business_window: 0,
    first_time: 3,
    first_time_promoted: 2,
    not_judged: [],
    floor: 20,
    verdict: 'rose_not_paid',
    trend_percent: 20,
    expected: 48,
    extra: 22,
    profit_per_unit: 600,
    extra_profit: 13200,
    return_per_taka: 0.88,
    overlaps: [],
    brought: [],
    usual: [],
    districts: [],
};

const open = async (result: CampaignResult) => {
    await TestBed.configureTestingModule({ imports: [CampaignResultCardComponent], providers: [provideRouter([]), provideNzI18n(en_US), provideTranslateService({ fallbackLang: 'en' })] }).compileComponents();
    const fixture = TestBed.createComponent(CampaignResultCardComponent);
    fixture.componentRef.setInput('result', result);
    fixture.detectChanges();
    return fixture;
};

describe('CampaignResultCardComponent', () => {
    it("explains the verdict in seven steps with the campaign's own numbers", async () => {
        const card = (await open(EXAMPLE)).componentInstance;
        expect(card.steps().map((s) => s.key)).toEqual(['periods', 'rest.more', 'expected', 'actual.rise', 'earned', 'cost', 'verdict.rose_not_paid']);
        expect(card.steps()[1].params).toEqual(expect.objectContaining({ before: 500, window: 600, percent: 20 }));
        expect(card.steps()[3].params).toEqual(expect.objectContaining({ window: 70, extra: 22 }));
    });

    it('stops after the comparison when there is too little to judge, and says why', async () => {
        const fixture = await open({ ...EXAMPLE, verdict: 'too_little', reason: 'few_units', return_per_taka: null });
        expect(fixture.componentInstance.steps().map((s) => s.key)).toEqual(['periods', 'rest.more']);
        expect((fixture.nativeElement as HTMLElement).querySelector('[data-reason]')).not.toBeNull();
        expect((fixture.nativeElement as HTMLElement).querySelector('[data-per-taka]')).toBeNull();
    });

    it('shows no money a buying price could be worked back from to someone who may not see it', async () => {
        const fixture = await open({ ...EXAMPLE, money_hidden: true, profit_per_unit: null, extra_profit: null, return_per_taka: null });
        expect(fixture.componentInstance.steps().map((s) => s.key)).toEqual(['periods', 'rest.more', 'expected', 'actual.rise', 'cost', 'verdict.hidden.rose_not_paid']);
        expect((fixture.nativeElement as HTMLElement).textContent).toContain('marketing.analytics.result.notShown');
    });

    it('marks a campaign that shares a product with another in the same days', async () => {
        const fixture = await open({ ...EXAMPLE, overlaps: [{ oid: 'c-2', campaign_no: 'CM-2', name: 'Eid looks', days: 6, products: ['Floral dress'] }] });
        expect((fixture.nativeElement as HTMLElement).querySelector('[data-overlap="c-2"]')).not.toBeNull();
    });
});
