import { Subject } from 'rxjs';
import { NzModalService } from 'ng-zorro-antd/modal';
import { confirmAction } from './confirm-action';

const copy = { title: 'Save changes?', body: 'They apply everywhere.', ok: 'Save changes', cancel: 'Not yet' };

const fakeModal = () => {
    const afterClose = new Subject<void>();
    let options: { nzOnOk?: () => void } = {};
    const modal = {
        confirm: (given: typeof options) => {
            options = given;
            return { afterClose };
        },
    } as unknown as NzModalService;
    return { modal, ok: () => options.nzOnOk?.(), close: () => afterClose.next() };
};

describe('confirmAction', () => {
    it('answers yes when the confirming button is pressed', () => {
        const { modal, ok, close } = fakeModal();
        const answers: boolean[] = [];
        confirmAction(modal, copy).subscribe((answer) => answers.push(answer));

        ok();
        close();

        expect(answers).toEqual([true]);
    });

    // The dialog renders a string as HTML, and a category called "Shoes <Men>" lost half its name.
    it('shows what was typed as text, never as markup', () => {
        const afterClose = new Subject<void>();
        let shown: { nzTitle?: string; nzContent?: string } = {};
        const modal = {
            confirm: (given: typeof shown) => {
                shown = given;
                return { afterClose };
            },
        } as unknown as NzModalService;

        confirmAction(modal, { ...copy, body: 'Shoes <Men> & "Kids"' }).subscribe();

        expect(shown.nzContent).toBe('Shoes &lt;Men&gt; &amp; &quot;Kids&quot;');
    });

    it('answers no when the dialog is closed any other way, so the save never starts on its own', () => {
        const { modal, close } = fakeModal();
        const answers: boolean[] = [];
        confirmAction(modal, copy).subscribe((answer) => answers.push(answer));

        close();

        expect(answers).toEqual([false]);
    });
});
