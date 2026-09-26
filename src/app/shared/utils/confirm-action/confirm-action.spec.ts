import { Subject } from 'rxjs';
import { NzModalService } from 'ng-zorro-antd/modal';
import { confirmAction } from './confirm-action';

const copy = { title: 'Save changes?', body: 'They apply everywhere.', ok: 'Save changes', cancel: 'Not yet' };

const fakeModal = () => {
    const afterClose = new Subject<unknown>();
    let shown: { nzTitle?: string; nzData?: unknown } = {};
    const modal = {
        confirm: (given: typeof shown) => {
            shown = given;
            return { afterClose };
        },
    } as unknown as NzModalService;
    return { modal, shown: () => shown, close: (result?: unknown) => afterClose.next(result) };
};

describe('confirmAction', () => {
    it('answers yes when the confirming button is pressed', () => {
        const { modal, close } = fakeModal();
        const answers: boolean[] = [];
        confirmAction(modal, copy).subscribe((answer) => answers.push(answer));

        close(true);

        expect(answers).toEqual([true]);
    });

    // The dialog renders a string title as HTML, and a category called "Shoes <Men>" lost half its name.
    it('shows what was typed as text, never as markup', () => {
        const { modal, shown } = fakeModal();

        confirmAction(modal, { ...copy, title: 'Shoes <Men> & "Kids"' }).subscribe();

        expect(shown().nzTitle).toBe('Shoes &lt;Men&gt; &amp; &quot;Kids&quot;');
        expect(shown().nzData).toEqual({ ...copy, title: 'Shoes <Men> & "Kids"' });
    });

    it('answers no when the dialog is closed any other way, so the save never starts on its own', () => {
        const { modal, close } = fakeModal();
        const answers: boolean[] = [];
        confirmAction(modal, copy).subscribe((answer) => answers.push(answer));

        close(undefined);

        expect(answers).toEqual([false]);
    });
});
