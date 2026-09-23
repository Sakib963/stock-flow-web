import { TestBed } from '@angular/core/testing';
import { provideNzI18n, en_US } from 'ng-zorro-antd/i18n';
import { provideTranslateService } from '@ngx-translate/core';
import { FormPageComponent } from './form-page.component';

describe('FormPageComponent', () => {
    const render = async (remaining: number) => {
        // Each render is its own module, because a test here renders more than one state.
        TestBed.resetTestingModule();
        await TestBed.configureTestingModule({ imports: [FormPageComponent], providers: [provideNzI18n(en_US), provideTranslateService({ fallbackLang: 'en' })] }).compileComponents();
        const fixture = TestBed.createComponent(FormPageComponent);
        fixture.componentRef.setInput('formId', 'a-form');
        fixture.componentRef.setInput('remaining', remaining);
        fixture.detectChanges();
        return fixture;
    };

    it('counts what is still to fill in, and says nothing once there is nothing left', async () => {
        expect((await render(2)).nativeElement.textContent).toContain('form.remaining');
        expect((await render(0)).nativeElement.textContent).not.toContain('form.remaining');
    });

    // A Reset destroys work with no undo, so the shared surface never offers one.
    it('offers Cancel and Save, and no Reset', async () => {
        const buttons = [...((await render(0)).nativeElement as HTMLElement).querySelectorAll('button')].map((b) => b.textContent?.trim());
        expect(buttons).toEqual(['form.cancel', 'form.save']);
    });

    // One press is one write: the button submits the form and does nothing else. It reaches a form
    // outside this component through HTML's own `form` attribute.
    it('saves by submitting the named form, with no click handler of its own', async () => {
        const save = ((await render(0)).nativeElement as HTMLElement).querySelector('button[type="submit"]')!;
        expect(save.textContent?.trim()).toBe('form.save');
        expect(save.getAttribute('form')).toBe('a-form');
    });

    it('takes the Save button out of action while the write is in flight', async () => {
        const fixture = await render(0);
        fixture.componentRef.setInput('saving', true);
        fixture.detectChanges();

        const save = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('button[type="submit"]')!;
        expect(save.disabled).toBe(true);
    });
});
