import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { WeekHeatmapComponent } from './week-heatmap.component';

const draw = async (cells: { day: number; hour: number; count: number }[]) => {
    await TestBed.configureTestingModule({ imports: [WeekHeatmapComponent], providers: [provideTranslateService({ fallbackLang: 'en' })] }).compileComponents();
    const fixture = TestBed.createComponent(WeekHeatmapComponent);
    fixture.componentRef.setInput('cells', cells);
    fixture.componentRef.setInput('cellKey', 'cell');
    fixture.componentRef.setInput('label', 'label');
    fixture.detectChanges();
    return fixture.componentInstance;
};

describe('WeekHeatmapComponent', () => {
    it('starts the week on Saturday and names each day in the reader language', async () => {
        const chart = await draw([]);
        expect(chart.rows().map((r) => r.day)).toEqual([6, 7, 1, 2, 3, 4, 5]);
        expect(chart.rows()[0].label).toBe('Sat');
    });

    it('shades the busiest hour darkest and an empty hour as nothing', async () => {
        const chart = await draw([
            { day: 1, hour: 12, count: 8 },
            { day: 1, hour: 13, count: 2 },
        ]);
        const monday = chart.rows().find((r) => r.day === 1)!;
        expect(monday.cells[12].shade).toBe('bg-primary');
        expect(monday.cells[13].shade).toBe('bg-primary/15');
        expect(monday.cells[0].shade).toBe('bg-line-soft');
    });
});
