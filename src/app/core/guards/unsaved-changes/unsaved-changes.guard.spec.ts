import { TestBed } from '@angular/core/testing';
import { FormControl, FormGroup } from '@angular/forms';
import { provideNzI18n, en_US } from 'ng-zorro-antd/i18n';
import { NzModalService } from 'ng-zorro-antd/modal';
import { provideTranslateService } from '@ngx-translate/core';
import { unsavedChangesGuard } from './unsaved-changes.guard';

const run = (component: unknown) => TestBed.runInInjectionContext(() => unsavedChangesGuard(component as never, null as never, null as never, null as never));

describe('unsavedChangesGuard', () => {
    let confirmed: (ok: boolean) => void;

    beforeEach(() => {
        TestBed.resetTestingModule();
        TestBed.configureTestingModule({
            providers: [
                provideNzI18n(en_US),
                provideTranslateService({ fallbackLang: 'en' }),
                {
                    provide: NzModalService,
                    useValue: {
                        confirm: (options: { nzOnOk: () => void; nzOnCancel: () => void }) => {
                            confirmed = (ok) => (ok ? options.nzOnOk() : options.nzOnCancel());
                        },
                    },
                },
            ],
        });
    });

    // The point of the util: a page with a reactive form needs no code of its own.
    it('lets an untouched form go without asking', () => {
        expect(run({ form: new FormGroup({ name: new FormControl('') }) })).toBe(true);
    });

    it('lets a page with no form at all go without asking', () => {
        expect(run({})).toBe(true);
    });

    it('asks before leaving a form with something typed in it, and stays when told to', async () => {
        const form = new FormGroup({ name: new FormControl('') });
        form.controls.name.setValue('Saree');
        form.markAsDirty();

        const answer = run({ form });
        confirmed(false);
        await expect(answer).resolves.toBe(false);
    });

    it('lets the work be discarded when that is what was chosen', async () => {
        const form = new FormGroup({ name: new FormControl('') });
        form.markAsDirty();

        const answer = run({ form });
        confirmed(true);
        await expect(answer).resolves.toBe(true);
    });

    // A saved form marks itself pristine before navigating, so saving never asks.
    it('does not ask once the form has been marked pristine', () => {
        const form = new FormGroup({ name: new FormControl('') });
        form.markAsDirty();
        form.markAsPristine();

        expect(run({ form })).toBe(true);
    });

    it("prefers a page's own answer over its form", () => {
        const form = new FormGroup({ name: new FormControl('') });
        form.markAsDirty();

        expect(run({ form, hasUnsavedChanges: () => false })).toBe(true);
    });
});
