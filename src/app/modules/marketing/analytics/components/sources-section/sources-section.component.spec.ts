import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideNzI18n, en_US } from 'ng-zorro-antd/i18n';
import { provideTranslateService } from '@ngx-translate/core';
import { MarketingSources } from '@app/core/models/marketing-analytics.model';
import { SourcesSectionComponent } from './sources-section.component';

const open = async (data: MarketingSources) => {
    await TestBed.configureTestingModule({ imports: [SourcesSectionComponent], providers: [provideHttpClient(), provideHttpClientTesting(), provideNzI18n(en_US), provideTranslateService({ fallbackLang: 'en' })] }).compileComponents();
    const fixture = TestBed.createComponent(SourcesSectionComponent);
    fixture.componentRef.setInput('query', { date_from: '2026-10-01', date_to: '2026-10-17' });
    fixture.detectChanges();
    TestBed.inject(HttpTestingController)
        .expectOne((r) => r.url.endsWith('/get-marketing-sources'))
        .flush({ data });
    fixture.detectChanges();
    return fixture;
};

const source = (oid: string, placed: number, cancelled: number, refused: number) => ({ oid, name: oid, platform: 'Facebook', placed, sold: placed - cancelled - refused, cancelled, refused, sales: 1000, profit: null, first_time: 1 });

describe('SourcesSectionComponent', () => {
    it('shows a cancel rate over enough orders, and the plain count under that', async () => {
        const rows = (await open({ applies: true, sources: [source('big', 40, 10, 6), source('small', 8, 2, 1)] })).componentInstance.rows();
        expect(rows[0].cancelRate.percent).toBe(25);
        expect(rows[0].refusalRate.percent).toBe(20);
        expect(rows[1].cancelRate).toEqual({ percent: null, count: 2, of: 8 });
    });

    it('tells someone who sells only at the counter there are no sources to compare', async () => {
        const host: HTMLElement = (await open({ applies: false, sources: [] })).nativeElement;
        expect(host.querySelector('[data-sources="counter-only"]')).not.toBeNull();
        expect(host.querySelector('nz-table')).toBeNull();
    });
});
