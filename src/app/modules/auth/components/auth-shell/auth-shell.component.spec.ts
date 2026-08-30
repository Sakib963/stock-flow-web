import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { AuthShellComponent } from './auth-shell.component';
import { Constants } from '@app/core/constants/constants';

// The shell owns the panel and the language toggle for every auth screen, so a regression here
// shows up on four pages at once.
describe('AuthShellComponent', () => {
    beforeEach(async () => {
        localStorage.clear();
        await TestBed.configureTestingModule({
            imports: [AuthShellComponent],
            providers: [provideTranslateService({ fallbackLang: 'en' })],
        }).compileComponents();
    });

    afterEach(() => localStorage.clear());

    async function render() {
        const fixture = TestBed.createComponent(AuthShellComponent);
        await fixture.whenStable();
        return { fixture, el: fixture.nativeElement as HTMLElement, cmp: fixture.componentInstance };
    }

    it('renders the identity panel and the logo', async () => {
        const { el } = await render();
        expect(el.querySelector('.auth__panel')).toBeTruthy();
        expect(el.querySelector('.auth__logo')).toBeTruthy();
    });

    it('links the attribution to sakib.app in a new tab', async () => {
        const { el } = await render();
        const link = el.querySelector('.auth__attribution') as HTMLAnchorElement;
        expect(link.getAttribute('href')).toBe('https://sakib.app');
        expect(link.getAttribute('rel')).toContain('noopener');
    });

    it('switches language and persists the choice', async () => {
        const { fixture, cmp } = await render();
        cmp.setLanguage('bn');
        await fixture.whenStable();

        expect(cmp.language.current()).toBe('bn');
        expect(localStorage.getItem(Constants.LANG_STORE_KEY)).toBe('bn');
        expect(document.body.classList.contains('lang-bn')).toBe(true);
    });

    it('lets the page size the ledger clear core', async () => {
        const fixture = TestBed.createComponent(AuthShellComponent);
        fixture.componentRef.setInput('clearCoreHeight', 420);
        await fixture.whenStable();
        const col = (fixture.nativeElement as HTMLElement).querySelector('.auth__form-col') as HTMLElement;
        expect(col.style.getPropertyValue('--auth-clear-core')).toBe('420px');
    });
});
