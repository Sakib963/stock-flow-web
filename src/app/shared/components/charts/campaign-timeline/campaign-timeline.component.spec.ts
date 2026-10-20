import { TestBed } from '@angular/core/testing';
import { CampaignTimelineComponent } from './campaign-timeline.component';

const days = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => ({ day: `2026-09-${String(from + i).padStart(2, '0')}`, value: (from + i) * 10 }));

const open = async (bands: { key: string; from: string; to: string; label: string }[], pins: { key: string; day: string; label: string }[] = []) => {
    await TestBed.configureTestingModule({ imports: [CampaignTimelineComponent] }).compileComponents();
    const fixture = TestBed.createComponent(CampaignTimelineComponent);
    fixture.componentRef.setInput('values', days(1, 30));
    fixture.componentRef.setInput('bands', bands);
    fixture.componentRef.setInput('pins', pins);
    fixture.detectChanges();
    return fixture;
};

describe('CampaignTimelineComponent', () => {
    it('cuts a window at the edge of the period and leaves out one wholly outside it', async () => {
        const chart = (
            await open([
                { key: 'a', from: '2026-08-20', to: '2026-09-05', label: 'A' },
                { key: 'b', from: '2026-10-01', to: '2026-10-09', label: 'B' },
            ])
        ).componentInstance;
        const shaded = chart.shaded();
        expect(shaded.map((b) => b.key)).toEqual(['a']);
        expect(shaded[0].x).toBe(0);
    });

    it('pins a posted promise on its day and ignores one outside the period', async () => {
        const fixture = await open(
            [],
            [
                { key: 'p1', day: '2026-09-04', label: 'Reel' },
                { key: 'p2', day: '2026-10-04', label: 'Live' },
            ]
        );
        expect((fixture.nativeElement as HTMLElement).querySelectorAll('[data-pin]').length).toBe(1);
    });
});
