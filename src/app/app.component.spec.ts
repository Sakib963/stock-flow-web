import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideNzI18n, en_US } from 'ng-zorro-antd/i18n';
import { AppComponent } from './app.component';

// Proves the bootstrap actually runs, which a successful build does not. Each assertion covers one
// piece of the new stack, so a regression in any of them fails here rather than in the browser.
describe('AppComponent (bootstrap stack)', () => {
    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [AppComponent],
            providers: [provideRouter([]), provideNzI18n(en_US)],
        }).compileComponents();
    });

    it('creates the root component', () => {
        const fixture = TestBed.createComponent(AppComponent);
        expect(fixture.componentInstance).toBeTruthy();
    });

    it('renders an ng-zorro button', async () => {
        const fixture = TestBed.createComponent(AppComponent);
        await fixture.whenStable();
        const el = fixture.nativeElement as HTMLElement;
        expect(el.querySelector('button.ant-btn')).toBeTruthy();
    });

    it('resolves lucide icons through provideIcons', async () => {
        const fixture = TestBed.createComponent(AppComponent);
        await fixture.whenStable();
        const el = fixture.nativeElement as HTMLElement;
        // ng-icons only injects an svg once the named icon has actually been provided.
        expect(el.querySelector('ng-icon svg')).toBeTruthy();
    });

    it('repaints from a signal with no zone.js present', async () => {
        const fixture = TestBed.createComponent(AppComponent);
        await fixture.whenStable();
        const el = fixture.nativeElement as HTMLElement;
        const button = el.querySelector('button.ant-btn') as HTMLButtonElement;

        expect(button.textContent).toContain('0');
        button.click();
        await fixture.whenStable();
        expect(button.textContent).toContain('1');
    });
});
