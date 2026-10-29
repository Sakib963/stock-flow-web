import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideNzI18n, en_US } from 'ng-zorro-antd/i18n';
import { provideTranslateService } from '@ngx-translate/core';
import { AppUpdateService } from '@app/core/services/app-update/app-update.service';
import { UpdateDialogComponent } from './update-dialog.component';

describe('UpdateDialogComponent', () => {
    let update: AppUpdateService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [UpdateDialogComponent],
            providers: [provideRouter([]), provideNzI18n(en_US), provideTranslateService({ fallbackLang: 'en' })],
        });
        update = TestBed.inject(AppUpdateService);
    });

    afterEach(() => document.querySelectorAll('.cdk-overlay-container').forEach((c) => (c.innerHTML = '')));

    async function render() {
        const fixture = TestBed.createComponent(UpdateDialogComponent);
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
        return fixture;
    }

    const button = (name: string) => document.querySelector<HTMLButtonElement>(`[data-update="${name}"]`);

    it('offers Later beside Reload when a new version is available', async () => {
        update.available.set(true);
        await render();

        expect(button('reload')).not.toBeNull();
        expect(button('later')).not.toBeNull();
    });

    it('offers only Reload once this version cannot open a page', async () => {
        update.required.set(true);
        await render();

        expect(button('reload')).not.toBeNull();
        expect(button('later')).toBeNull();
    });

    it('reloads the app from Reload', async () => {
        update.available.set(true);
        const reload = vi.spyOn(update, 'reload').mockImplementation(() => undefined);
        await render();

        button('reload')!.click();

        expect(reload).toHaveBeenCalled();
    });
});
