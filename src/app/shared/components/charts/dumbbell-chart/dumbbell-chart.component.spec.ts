import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { DumbbellChartComponent, DumbbellRow } from './dumbbell-chart.component';

const draw = async (rows: DumbbellRow[]) => {
    await TestBed.configureTestingModule({ imports: [DumbbellChartComponent], providers: [provideTranslateService({ fallbackLang: 'en' })] }).compileComponents();
    const fixture = TestBed.createComponent(DumbbellChartComponent);
    fixture.componentRef.setInput('rows', rows);
    fixture.componentRef.setInput('firstLabel', 'first');
    fixture.componentRef.setInput('secondLabel', 'second');
    fixture.detectChanges();
    return fixture.componentInstance;
};

describe('DumbbellChartComponent', () => {
    it('scales to the highest rate rounded up to ten and joins the two dots', async () => {
        const chart = await draw([{ key: 'a', label: 'Dhaka', first: 32, second: 8, firstNote: '', secondNote: '' }]);
        expect(chart.top()).toBe(40);
        const [row] = chart.drawn();
        expect(row.firstAt).toBe(80);
        expect(row.secondAt).toBe(20);
        expect(row.lineFrom).toBe(20);
        expect(row.lineWidth).toBe(60);
    });

    it('draws one dot and no line when the other rate is missing', async () => {
        const chart = await draw([{ key: 'a', label: 'Dhaka', first: 5, second: null, firstNote: '', secondNote: '' }]);
        const [row] = chart.drawn();
        expect(chart.top()).toBe(10);
        expect(row.secondAt).toBeNull();
        expect(row.lineWidth).toBe(0);
    });
});
