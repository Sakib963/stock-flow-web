import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActionFooterComponent } from './action-footer.component';

@Component({
    imports: [ActionFooterComponent],
    template: `<action-footer>
        <span footerNote>2 still to fill in</span>
        <button type="button">Cancel</button>
        <button type="button">Save</button>
    </action-footer>`,
})
class HostComponent {}

describe('ActionFooterComponent', () => {
    const open = async () => {
        await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
        const fixture = TestBed.createComponent(HostComponent);
        fixture.detectChanges();
        return fixture.nativeElement as HTMLElement;
    };

    it('keeps the note and the buttons apart, so the note stays where the eye reaches for Save', async () => {
        const element = await open();

        expect(element.querySelector('p')?.textContent).toContain('2 still to fill in');
        expect(element.querySelectorAll('button').length).toBe(2);
    });

    it('leaves the note empty rather than reserving a line, when nothing is projected into it', async () => {
        @Component({ imports: [ActionFooterComponent], template: `<action-footer><button type="button">Back</button></action-footer>` })
        class BareHost {}

        TestBed.resetTestingModule();
        await TestBed.configureTestingModule({ imports: [BareHost] }).compileComponents();
        const fixture = TestBed.createComponent(BareHost);
        fixture.detectChanges();
        const element = fixture.nativeElement as HTMLElement;

        expect(element.querySelector('p')?.textContent?.trim()).toBe('');
        expect(element.querySelectorAll('button').length).toBe(1);
    });
});
