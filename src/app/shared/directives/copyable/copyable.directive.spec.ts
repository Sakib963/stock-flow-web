import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NzMessageService } from 'ng-zorro-antd/message';
import { provideNzI18n, en_US } from 'ng-zorro-antd/i18n';
import { provideTranslateService } from '@ngx-translate/core';
import { CopyableDirective } from './copyable.directive';

@Component({
    imports: [CopyableDirective],
    template: `<p copyable>SARE</p>
        <span [copyable]="'CL-TRAD-001'">Sarees</span>
        @if (shown) {
            <em copyable>BG</em>
        }`,
})
class HostComponent {
    shown = true;
}

const render = async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent], providers: [provideNzI18n(en_US), provideTranslateService({ fallbackLang: 'en' })] }).compileComponents();
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    const success = vi.spyOn(TestBed.inject(NzMessageService), 'success');
    return { fixture, el: fixture.nativeElement as HTMLElement, writeText, success };
};

describe('CopyableDirective', () => {
    it('puts a copy button after the text that stays invisible until the text is hovered', async () => {
        const { el } = await render();
        const button = el.querySelector('p [data-copy="button"]')!;

        expect(button).toBeTruthy();
        expect(button.className).toContain('opacity-0');
        expect(button.className).toContain('group-hover/copy:opacity-100');
        expect(el.querySelector('p')!.classList).toContain('group/copy');
    });

    it("copies the element's own text, then shows a tick and says it was copied", async () => {
        const { fixture, el, writeText, success } = await render();

        (el.querySelector('p [data-copy="button"]') as HTMLButtonElement).click();
        await fixture.whenStable();
        fixture.detectChanges();

        expect(writeText).toHaveBeenCalledWith('SARE');
        expect(success).toHaveBeenCalledWith('copy.copied');
        expect(el.querySelector('p [data-copy="button"]')!.className).toContain('opacity-100');
    });

    it('copies the value it was given rather than the text shown', async () => {
        const { fixture, el, writeText } = await render();

        (el.querySelector('span [data-copy="button"]') as HTMLButtonElement).click();
        await fixture.whenStable();

        expect(writeText).toHaveBeenCalledWith('CL-TRAD-001');
    });

    // A table cell draws its code inside @if. Attaching that block once moved the button out beside
    // the text, where hovering the text could not reveal it.
    it('keeps the button inside the element and after its text, even when an @if draws it', async () => {
        const { el } = await render();
        expect(el.querySelector('em [data-copy="button"]')).toBeTruthy();
        expect(el.querySelector('em')!.lastElementChild!.tagName).toBe('COPY-BUTTON');
        expect(el.querySelector('em')!.firstChild!.textContent).toBe('BG');
    });
});
