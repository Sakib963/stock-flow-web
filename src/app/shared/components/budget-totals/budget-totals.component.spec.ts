import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { BudgetTotalsComponent } from './budget-totals.component';

const open = async (budgets: object | null, units: number) => {
    await TestBed.configureTestingModule({ imports: [BudgetTotalsComponent], providers: [provideTranslateService({ fallbackLang: 'en' })] }).compileComponents();
    const fixture = TestBed.createComponent(BudgetTotalsComponent);
    fixture.componentRef.setInput('budgets', budgets);
    fixture.componentRef.setInput('units', units);
    fixture.detectChanges();
    return { fixture, totals: fixture.componentInstance, element: fixture.nativeElement as HTMLElement };
};

describe('BudgetTotalsComponent', () => {
    it('multiplies each budget by the batch units and adds them up', async () => {
        const { totals } = await open({ ad_run_cost: 20, packaging_cost: 15, gift_cost: null, content_creation_cost: 5, influencer_cost: 0 }, 36);
        expect(totals.rows().map((row) => [row.key, row.total])).toEqual([
            ['ad_run_cost', 720],
            ['packaging_cost', 540],
            ['gift_cost', null],
            ['content_creation_cost', 180],
            ['influencer_cost', 0],
        ]);
        expect(totals.perUnit()).toBe(40);
        expect(totals.total()).toBe(1440);
    });

    it('shows a dash for a budget never set, and nothing to spend when no units arrived', async () => {
        const { totals, element } = await open({ ad_run_cost: 20 }, 0);
        expect(element.querySelector('[data-budget-row="gift_cost"]')?.textContent).toContain('–');
        expect(totals.total()).toBe(0);
    });
});
