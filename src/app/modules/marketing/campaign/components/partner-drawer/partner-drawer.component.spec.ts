import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideNzI18n, en_US } from 'ng-zorro-antd/i18n';
import { provideTranslateService } from '@ngx-translate/core';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { CampaignPartner } from '@app/core/models/campaign.model';
import { PartnerDrawerComponent } from './partner-drawer.component';

const isPartners = (r: { url: string }) => r.url.endsWith(APIEndpoint.GET_PARTNERS_FOR_CAMPAIGN);
const STYLE = { oid: 'pt-1', value: 'pt-1', name: 'Style Diaries', partner_type: 'Page', platforms: [], handle: '@stylediaries' };

const render = async (line: CampaignPartner | null = null) => {
    await TestBed.configureTestingModule({
        imports: [PartnerDrawerComponent],
        providers: [provideHttpClient(), provideHttpClientTesting(), provideNzI18n(en_US), provideTranslateService({ fallbackLang: 'en' })],
    }).compileComponents();
    const fixture = TestBed.createComponent(PartnerDrawerComponent);
    fixture.componentRef.setInput('line', line);
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    return { fixture, drawer: fixture.componentInstance, http: TestBed.inject(HttpTestingController) };
};

describe('PartnerDrawerComponent', () => {
    afterEach(() => TestBed.inject(HttpTestingController).verify());

    it('asks for the first fifty active partners when opened to add one, and saves the one picked with its name', async () => {
        const { drawer, http } = await render();
        const asked = http.expectOne(isPartners);
        expect(asked.request.params.get('offset')).toBe('0');
        expect(asked.request.params.get('limit')).toBe('50');
        asked.flush({ data: [STYLE] });

        const saved: CampaignPartner[] = [];
        drawer.saved.subscribe((line) => saved.push(line));
        drawer.pick('pt-1');
        drawer.fee.set(5000);
        drawer.save();

        expect(saved[0]).toEqual({ partner_oid: 'pt-1', name: 'Style Diaries', partner_type: 'Page', agreed_fee: 5000, note: null });
    });

    it('saves the picked partner even after a search that found nothing, and leaves out partners already on the campaign', async () => {
        vi.useFakeTimers();
        await TestBed.configureTestingModule({
            imports: [PartnerDrawerComponent],
            providers: [provideHttpClient(), provideHttpClientTesting(), provideNzI18n(en_US), provideTranslateService({ fallbackLang: 'en' })],
        }).compileComponents();
        const fixture = TestBed.createComponent(PartnerDrawerComponent);
        fixture.componentRef.setInput('taken', new Set(['pt-7']));
        fixture.componentRef.setInput('open', true);
        fixture.detectChanges();
        const drawer = fixture.componentInstance;
        const http = TestBed.inject(HttpTestingController);
        const first = http.expectOne(isPartners);
        expect(first.request.params.get('exclude')).toBe('pt-7');
        first.flush({ data: [STYLE] });

        drawer.pick('pt-1');
        drawer.picker.search('zzz');
        vi.advanceTimersByTime(300);
        http.expectOne(isPartners).flush({ data: [] });

        const saved: CampaignPartner[] = [];
        drawer.saved.subscribe((line) => saved.push(line));
        drawer.fee.set(5000);
        drawer.save();
        expect(saved[0].name).toBe('Style Diaries');
        vi.useRealTimers();
    });

    it('asks for nothing when changing a line, whose partner is fixed and named by the line itself', async () => {
        const { http } = await render({ partner_oid: 'pt-9', name: 'Ad House', partner_type: 'Business', agreed_fee: 2000, note: null } as CampaignPartner);
        http.expectNone(isPartners);
    });
});
