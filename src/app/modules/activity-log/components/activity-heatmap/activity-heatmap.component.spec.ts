import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { ActivityHeatmapComponent } from './activity-heatmap.component';

const render = async (week: { day: number; hour: number; actions: number }[]) => {
    await TestBed.configureTestingModule({ imports: [ActivityHeatmapComponent], providers: [provideTranslateService({ fallbackLang: 'en' })] }).compileComponents();
    const fixture = TestBed.createComponent(ActivityHeatmapComponent);
    fixture.componentRef.setInput('week', week);
    fixture.detectChanges();
    return { fixture, page: fixture.componentInstance, element: fixture.nativeElement as HTMLElement };
};

describe('ActivityHeatmapComponent', () => {
    it('draws every weekday by every hour, Saturday first, the busiest cell darkest', async () => {
        const { page, element } = await render([
            { day: 7, hour: 11, actions: 8 },
            { day: 7, hour: 12, actions: 2 },
        ]);
        expect(page.rows().map((row) => row.day)).toEqual([6, 7, 1, 2, 3, 4, 5]);
        expect(element.querySelectorAll('[data-actions]').length).toBe(7 * 24);
        const sunday = page.rows()[1].cells;
        expect(sunday[11].shade).toBe('bg-primary');
        expect(sunday[12].shade).toBe('bg-primary/15');
        expect(sunday[10].shade).toBe('bg-line-soft');
    });

    it('says there is nothing to show when the period is empty', async () => {
        const { element } = await render([]);
        expect(element.textContent).toContain('activityLog.heatmap.empty');
        expect(element.querySelector('[data-activity="heatmap"]')).toBeNull();
    });
});
