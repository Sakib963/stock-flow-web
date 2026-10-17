import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { FunnelChartComponent, FunnelStep } from './funnel-chart.component';

const draw = async (steps: FunnelStep[]) => {
    await TestBed.configureTestingModule({ imports: [FunnelChartComponent], providers: [provideTranslateService({ fallbackLang: 'en' })] }).compileComponents();
    const fixture = TestBed.createComponent(FunnelChartComponent);
    fixture.componentRef.setInput('steps', steps);
    fixture.detectChanges();
    return fixture.componentInstance.rows();
};

describe('FunnelChartComponent', () => {
    it('makes each step as wide as its share of the first', async () => {
        const rows = await draw([
            { key: 'placed', label: 'placed', count: 40, value: 0 },
            { key: 'dispatched', label: 'dispatched', count: 30, value: 0 },
            { key: 'kept', label: 'kept', count: 0, value: 0 },
        ]);
        expect(rows.map((r) => [r.share, r.width])).toEqual([
            [100, 100],
            [75, 75],
            [0, 0],
        ]);
        expect(rows.map((r) => r.last)).toEqual([false, false, true]);
    });
});
