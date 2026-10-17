import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { WaterfallChartComponent, WaterfallStep } from './waterfall-chart.component';

const draw = async (steps: WaterfallStep[]) => {
    await TestBed.configureTestingModule({ imports: [WaterfallChartComponent], providers: [provideTranslateService({ fallbackLang: 'en' })] }).compileComponents();
    const fixture = TestBed.createComponent(WaterfallChartComponent);
    fixture.componentRef.setInput('steps', steps);
    fixture.detectChanges();
    return fixture.componentInstance.bars();
};

describe('WaterfallChartComponent', () => {
    it('floats each drop where the running amount stood and draws the result from zero', async () => {
        const bars = await draw([
            { key: 'list', label: 'list', value: 1000, kind: 'start' },
            { key: 'discounts', label: 'discounts', value: 100, kind: 'drop' },
            { key: 'cost', label: 'cost', value: 600, kind: 'drop' },
            { key: 'profit', label: 'profit', value: 300, kind: 'end' },
        ]);
        expect(bars.map((b) => [b.left, b.width])).toEqual([
            [0, 100],
            [90, 10],
            [30, 60],
            [0, 30],
        ]);
        expect(bars.map((b) => b.share)).toEqual([100, 10, 60, 30]);
    });

    it('draws a loss from zero and cuts a drop that goes below zero', async () => {
        const bars = await draw([
            { key: 'list', label: 'list', value: 1000, kind: 'start' },
            { key: 'cost', label: 'cost', value: 1200, kind: 'drop' },
            { key: 'profit', label: 'profit', value: -200, kind: 'end' },
        ]);
        expect(bars[1].left).toBe(0);
        expect(bars[1].width).toBeCloseTo(83.33, 1);
        expect(bars[2].left).toBe(0);
        expect(bars[2].width).toBeCloseTo(16.67, 1);
    });

    it('keeps a tiny step visible and draws nothing for zero', async () => {
        const bars = await draw([
            { key: 'list', label: 'list', value: 100000, kind: 'start' },
            { key: 'discounts', label: 'discounts', value: 10, kind: 'drop' },
            { key: 'returns', label: 'returns', value: 0, kind: 'drop' },
        ]);
        expect(bars[1].width).toBe(0.5);
        expect(bars[2].width).toBe(0);
    });
});
