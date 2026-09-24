import { NzModalService } from 'ng-zorro-antd/modal';
import { Observable } from 'rxjs';
import { ConfirmCopy } from '@app/core/models/form.model';

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** ng-zorro renders a string title and body as HTML, and the copy carries what someone typed. */
const asText = (value: string): string => value.replace(/[&<>"']/g, (character) => ESCAPES[character]);

/**
 * Asks before a mutating action, and answers true only when the person pressed the confirming button.
 *
 * Answered from `afterClose` rather than `nzOnCancel`, so closing the dialog with Escape, the close
 * button or the mask is a "no" as well, and the page never waits on a question nobody will answer.
 */
export const confirmAction = (modal: NzModalService, copy: ConfirmCopy): Observable<boolean> =>
    new Observable<boolean>((subscriber) => {
        let confirmed = false;
        const ref = modal.confirm({
            nzTitle: asText(copy.title),
            nzContent: asText(copy.body),
            nzOkText: copy.ok,
            nzCancelText: copy.cancel,
            nzCentered: true,
            nzOnOk: () => {
                confirmed = true;
            },
        });
        const closed = ref.afterClose.subscribe(() => {
            subscriber.next(confirmed);
            subscriber.complete();
        });
        return () => closed.unsubscribe();
    });
