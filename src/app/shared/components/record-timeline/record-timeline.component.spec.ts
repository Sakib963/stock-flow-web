import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { RecordTimelineComponent } from './record-timeline.component';

@Component({
    imports: [RecordTimelineComponent],
    template: `<record-timeline [entries]="entries()"><ng-template let-entry><p data-entry>{{ entry }}</p></ng-template></record-timeline>`,
})
class HostComponent {
    readonly entries = signal(Array.from({ length: 12 }, (_, i) => `step ${i + 1}`));
}

const open = () => {
    TestBed.configureTestingModule({ imports: [HostComponent], providers: [provideTranslateService({ fallbackLang: 'en' })] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const shown = () => [...element.querySelectorAll('[data-entry]')].map((node) => node.textContent);
    const more = () => element.querySelector<HTMLButtonElement>('[data-timeline="more"]');
    return { fixture, element, shown, more };
};

describe('RecordTimelineComponent', () => {
    it('shows five, adds five on each See more, and hides the button once all are shown', () => {
        const { fixture, shown, more } = open();
        expect(shown()).toEqual(['step 1', 'step 2', 'step 3', 'step 4', 'step 5']);
        more()!.click();
        fixture.detectChanges();
        expect(shown().length).toBe(10);
        more()!.click();
        fixture.detectChanges();
        expect(shown().length).toBe(12);
        expect(more()).toBeNull();
    });

    it('marks only the newest entry in the accent', () => {
        const { element } = open();
        const dots = [...element.querySelectorAll('.ant-timeline-item-head')];
        expect(dots[0].classList).toContain('ant-timeline-item-head-blue');
        expect(dots.slice(1).every((dot) => dot.classList.contains('ant-timeline-item-head-gray'))).toBe(true);
    });

    it('scrolls inside its own box, which is only as tall as its entries up to the limit', () => {
        const { element } = open();
        expect(element.querySelector('[data-timeline="scroll"]')!.className).toContain('max-h-96');
        expect(element.querySelector('[data-timeline="scroll"]')!.className).toContain('overflow-y-auto');
    });

    it('goes back to five when the record reloads, and offers no See more for a short history', () => {
        const { fixture, shown, more } = open();
        more()!.click();
        fixture.detectChanges();
        fixture.componentInstance.entries.set(['created', 'edited']);
        fixture.detectChanges();
        expect(shown()).toEqual(['created', 'edited']);
        expect(more()).toBeNull();
    });
});
