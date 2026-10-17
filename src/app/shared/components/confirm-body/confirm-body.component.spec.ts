import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NgIcon } from '@ng-icons/core';
import { NZ_MODAL_DATA, NzModalRef } from 'ng-zorro-antd/modal';
import { ConfirmCopy } from '@app/core/models/form.model';
import { ConfirmBodyComponent } from './confirm-body.component';

const open = (copy: Partial<ConfirmCopy> = {}) => {
    const close = vi.fn();
    TestBed.configureTestingModule({
        imports: [ConfirmBodyComponent],
        providers: [
            { provide: NzModalRef, useValue: { close } },
            { provide: NZ_MODAL_DATA, useValue: { title: 'Sign out?', body: 'You will need to sign in again.', ok: 'Sign out', cancel: 'Cancel', ...copy } },
        ],
    });
    const fixture = TestBed.createComponent(ConfirmBodyComponent);
    fixture.detectChanges();
    return { fixture, page: fixture.componentInstance, close, element: fixture.nativeElement as HTMLElement };
};

describe('ConfirmBodyComponent', () => {
    it('closes with yes at once when there is nothing to wait for', async () => {
        const { page, close } = open();
        await page.confirm();
        expect(close).toHaveBeenCalledWith(true);
    });

    it('waits for the work, holding Cancel, and stays open when it fails so the same button tries again', async () => {
        let finish!: (done: boolean) => void;
        const { page, close, fixture, element } = open({ run: () => new Promise<boolean>((resolve) => (finish = resolve)) });
        const pending = page.confirm();
        fixture.detectChanges();
        expect(page.busy()).toBe(true);
        expect(element.querySelector<HTMLButtonElement>('[data-confirm="cancel"]')!.disabled).toBe(true);
        finish(false);
        await pending;
        expect(close).not.toHaveBeenCalled();
        expect(page.busy()).toBe(false);

        const again = page.confirm();
        finish(true);
        await again;
        expect(close).toHaveBeenCalledWith(true);
    });

    it('draws the confirming button with the icon it was given', () => {
        const { fixture } = open({ icon: 'lucideLogOut' });
        const icon = fixture.debugElement.query(By.css('[data-confirm="ok"] ng-icon')).injector.get(NgIcon);
        expect(icon.name()).toBe('lucideLogOut');
    });
});
