import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideNzI18n, en_US } from 'ng-zorro-antd/i18n';
import { provideTranslateService } from '@ngx-translate/core';
import { MarketingSuggestion } from '@app/core/models/marketing-analytics.model';
import { NextSectionComponent } from './next-section.component';

const open = async (suggestions: MarketingSuggestion[]) => {
    await TestBed.configureTestingModule({ imports: [NextSectionComponent], providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), provideNzI18n(en_US), provideTranslateService({ fallbackLang: 'en' })] }).compileComponents();
    const fixture = TestBed.createComponent(NextSectionComponent);
    fixture.componentRef.setInput('query', { date_from: '2026-09-01', date_to: '2026-09-30' });
    fixture.detectChanges();
    TestBed.inject(HttpTestingController)
        .expectOne((r) => r.url.endsWith('/get-marketing-next'))
        .flush({ data: { period: { date_from: '2026-09-01', date_to: '2026-09-30' }, suggestions } });
    fixture.detectChanges();
    return fixture;
};

describe('NextSectionComponent', () => {
    it('writes each suggestion in the order the server ranked them, without a link for someone who may not open the product', async () => {
        const fixture = await open([
            { kind: 'rising', floor: 20, products: [{ oid: 'p-1', name: 'Floral dress', units_before: 20, units_window: 50, expected: 24, extra: 26 }] },
            { kind: 'arrivals', total: 22, weekday: 3, weekday_orders: 20, hour: 20, hour_orders: 22 },
        ]);
        const host: HTMLElement = fixture.nativeElement;
        expect([...host.querySelectorAll('[data-suggestion]')].map((e) => e.getAttribute('data-suggestion'))).toEqual(['rising', 'arrivals']);
        expect(host.querySelector('[data-suggestion="rising"] a')).toBeNull();
    });

    it('names the busiest weekday and hour as a person says them, counting Sunday as day 0', async () => {
        const section = (await open([])).componentInstance;
        expect(section.weekday(3)).toBe('Wednesday');
        expect(section.hour(20)).toBe('8 pm');
    });

    it('says nothing stands out yet when there is no suggestion', async () => {
        const host: HTMLElement = (await open([])).nativeElement;
        expect(host.querySelector('[data-next-empty]')).not.toBeNull();
    });
});
