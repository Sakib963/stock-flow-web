import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';
import { SessionService } from '@app/core/services/session/session.service';
import { ReportGroupComponent } from './report-group.component';

const open = async (group: 'sales' | 'stock', granted: string[]) => {
    await TestBed.configureTestingModule({
        imports: [ReportGroupComponent],
        providers: [provideRouter([]), provideTranslateService({ fallbackLang: 'en' }), { provide: SessionService, useValue: { can: (code: string) => granted.includes(code), menu: () => [] } }, { provide: ActivatedRoute, useValue: { data: of({ group }) } }],
    }).compileComponents();
    const fixture = TestBed.createComponent(ReportGroupComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    return [...(fixture.nativeElement as HTMLElement).querySelectorAll('[data-report-link]')].map((a) => a.getAttribute('data-report-link'));
};

describe('ReportGroupComponent', () => {
    it('lists every sales report', async () => {
        expect(await open('sales', ['report.sales.view'])).toEqual(['sales-register', 'daily-sales', 'sales-by-product', 'profit-by-category', 'returns', 'customer-dues', 'cod-with-couriers']);
    });

    it('leaves supplier dues out for someone who may not see buying prices', async () => {
        const links = await open('stock', ['report.stock.view']);
        expect(links).not.toContain('supplier-dues');
        expect(links).toContain('stock-on-hand');
    });
});
