import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { provideNzI18n, en_US } from 'ng-zorro-antd/i18n';
import { provideTranslateService } from '@ngx-translate/core';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { SessionService } from '@app/core/services/session/session.service';
import { PartnerDetailComponent } from './partner-detail.component';

const PARTNER = { oid: 'p-1', name: 'Style Diaries', partner_type: 'Page', platforms: ['Facebook', 'Instagram'], handle: '@stylediaries', phone_number: null, payment_method: 'bKash', payment_account: '01711000000', note: null, status: 'Active', created_on: '2026-10-17T10:00:00' };

const open = async (canEdit: boolean) => {
    await TestBed.configureTestingModule({
        imports: [PartnerDetailComponent],
        providers: [
            provideRouter([]),
            provideHttpClient(),
            provideHttpClientTesting(),
            provideNzI18n(en_US),
            provideTranslateService({ fallbackLang: 'en' }),
            { provide: ActivatedRoute, useValue: { snapshot: { paramMap: new Map([['oid', 'p-1']]) } } },
            { provide: SessionService, useValue: { can: (code: string) => canEdit || code !== 'marketing.partner.edit', menu: () => [] } },
        ],
    }).compileComponents();
    const fixture = TestBed.createComponent(PartnerDetailComponent);
    fixture.detectChanges();
    TestBed.inject(HttpTestingController)
        .expectOne((r) => r.url.endsWith(`${APIEndpoint.GET_PARTNER_DETAILS}/p-1`))
        .flush({ code: 200, message: 'ok', data: { details: PARTNER, campaigns: [{ oid: 'c-1', campaign_no: 'CM-2610-0001', name: 'Winter dresses', status: 'Live', posting_start: '2026-11-02', agreed_fee: 5000, past_due: 1, paid: 2000, owed: 3000 }], activity: [] } });
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
};

describe('PartnerDetailComponent', () => {
    it('shows each platform and how the partner is paid', async () => {
        const element = await open(true);
        expect(element.querySelectorAll('[data-detail="platforms"] status-tag').length).toBe(2);
        expect(element.textContent).toContain('01711000000');
    });

    it('lists the campaigns the partner is on, with what is still owed', async () => {
        const element = await open(true);
        expect(element.querySelectorAll('[data-campaign]').length).toBe(1);
        expect(element.querySelector('[data-partner-owed]')?.textContent).toContain('marketing.partner.owedTotal');
        expect(element.querySelector('[data-campaign-past-due]')).not.toBeNull();
    });

    it('leaves Edit out for someone who may not edit partners', async () => {
        const element = await open(false);
        expect(element.textContent).not.toContain('marketing.partner.edit');
    });
});
