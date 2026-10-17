import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { PyramidChartComponent } from './pyramid-chart.component';

describe('PyramidChartComponent', () => {
    it('sizes both sides against the largest count on either side', async () => {
        await TestBed.configureTestingModule({ imports: [PyramidChartComponent], providers: [provideTranslateService({ fallbackLang: 'en' })] }).compileComponents();
        const fixture = TestBed.createComponent(PyramidChartComponent);
        fixture.componentRef.setInput('rows', [
            { key: 'a', label: 'a', left: 8, right: 2 },
            { key: 'b', label: 'b', left: 0, right: 4 },
        ]);
        fixture.componentRef.setInput('leftLabel', 'left');
        fixture.componentRef.setInput('rightLabel', 'right');
        fixture.detectChanges();
        expect(fixture.componentInstance.drawn().map((r) => [r.leftWidth, r.rightWidth])).toEqual([
            [100, 25],
            [0, 50],
        ]);
    });
});
