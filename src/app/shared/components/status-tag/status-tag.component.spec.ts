import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { LanguageService } from '@app/core/services/language/language.service';
import { StatusTagComponent } from './status-tag.component';

describe('StatusTagComponent', () => {
    beforeEach(async () => {
        localStorage.clear();
        await TestBed.configureTestingModule({
            imports: [StatusTagComponent],
            providers: [provideTranslateService({ fallbackLang: 'en' })],
        }).compileComponents();
    });

    function render(inputs: Record<string, unknown>) {
        const fixture = TestBed.createComponent(StatusTagComponent);
        for (const [key, value] of Object.entries(inputs)) fixture.componentRef.setInput(key, value);
        fixture.detectChanges();
        return fixture.nativeElement as HTMLElement;
    }

    it('shows any label, tone and icon it is given, with no knowledge of the status behind it', () => {
        const el = render({ label: 'Delivered', tone: 'success', icon: 'lucideCheck' });
        const tag = el.querySelector('nz-tag')!;

        expect(tag.textContent?.trim()).toBe('Delivered');
        expect(tag.getAttribute('data-tone')).toBe('success');
        expect(tag.className).toContain('bg-success-bg');
        expect(tag.querySelector('ng-icon')).not.toBeNull();
    });

    it('shows a label in the current language when both are given inline', () => {
        TestBed.inject(LanguageService).use('bn');
        const el = render({ label: { en: 'Active', bn: 'সক্রিয়' }, tone: 'success' });

        expect(el.textContent?.trim()).toBe('সক্রিয়');
    });

    it('draws no glyph for an icon that is not registered, rather than an empty box', () => {
        const el = render({ label: 'Pending', tone: 'warning', icon: 'lucideNotARealIcon' });

        expect(el.querySelector('ng-icon')).toBeNull();
    });

    it('comes in the compact and standard sizes and defaults to neutral', () => {
        const compact = render({ label: 'Inactive' }).querySelector('nz-tag')!;
        const standard = render({ label: 'Inactive', size: 'standard' }).querySelector('nz-tag')!;

        expect(compact.getAttribute('data-tone')).toBe('neutral');
        expect(compact.className).toContain('h-4.75');
        expect(standard.className).toContain('h-5.75');
    });
});
